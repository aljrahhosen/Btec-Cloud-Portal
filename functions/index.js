const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

initializeApp();
const db = getFirestore();
const auth = getAuth();
const REGION = "me-central1";

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return request.auth.uid;
}
function hashNationalId(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function cleanName(value) {
  return String(value || "").trim().replace(/\\s+/g, " ");
}

exports.completeStudentRegistration = onCall({ region: REGION, enforceAppCheck: false }, async (request) => {
  const uid = requireAuth(request);
  const fullName = cleanName(request.data?.fullName);
  const nationalId = String(request.data?.nationalId || "").trim();
  const email = request.auth.token.email || "";
  if (!email) throw new HttpsError("failed-precondition", "An email address is required.");
  const words = fullName.split(" ").filter(Boolean);
  if (words.length < 4 || words.length > 6) throw new HttpsError("invalid-argument", "Full name must contain 4 to 6 words.");
  if (!/^\\d{10}$/.test(nationalId)) throw new HttpsError("invalid-argument", "National ID must contain exactly 10 digits.");

  const key = hashNationalId(nationalId);
  const indexRef = db.collection("NationalIdIndex").doc(key);
  const userRef = db.collection("Users").doc(uid);
  const directoryRef = db.collection("StudentDirectory").doc(uid);
  await db.runTransaction(async tx => {
    const [indexSnap, userSnap] = await Promise.all([tx.get(indexRef), tx.get(userRef)]);
    if (indexSnap.exists && indexSnap.data().uid !== uid) {
      throw new HttpsError("already-exists", "This national ID is already registered.");
    }
    const existing = userSnap.exists ? userSnap.data() : {};
    if (existing.role && existing.role !== "Student") {
      throw new HttpsError("permission-denied", "This account is not a student account.");
    }
    tx.set(indexRef, { uid, createdAt: indexSnap.exists ? indexSnap.data().createdAt : FieldValue.serverTimestamp() });
    tx.set(userRef, {
      name: fullName, fullName, nationalId, email,
      role: "Student", registrationComplete: true,
      createdAt: existing.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    tx.set(directoryRef, {
      name: fullName, email, active: true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  return { ok: true, registrationComplete: true };
});

exports.redeemTeacherCode = onCall({ region: REGION, enforceAppCheck: false }, async (request) => {
  const uid = requireAuth(request);
  const teacherId = String(request.data?.teacherId || "").trim();
  const name = cleanName(request.data?.name);
  const email = request.auth.token.email || "";
  if (!teacherId || teacherId.length > 128) throw new HttpsError("invalid-argument", "A valid teacher ID is required.");
  if (!email) throw new HttpsError("failed-precondition", "An email address is required.");
  const codeRef = db.collection("TeacherCodes").doc(teacherId);
  const userRef = db.collection("Users").doc(uid);

  await db.runTransaction(async tx => {
    const [codeSnap, userSnap] = await Promise.all([tx.get(codeRef), tx.get(userRef)]);
    if (!codeSnap.exists) throw new HttpsError("not-found", "Invalid teacher ID.");
    if (codeSnap.data().used === true) throw new HttpsError("already-exists", "This teacher ID has already been used.");
    if (userSnap.exists && userSnap.data().role && userSnap.data().role !== "teacher") {
      throw new HttpsError("permission-denied", "This account is already registered as a student.");
    }
    tx.update(codeRef, { used: true, redeemedBy: uid, redeemedAt: FieldValue.serverTimestamp() });
    tx.set(userRef, { name, email, role: "teacher", teacherId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  await auth.setCustomUserClaims(uid, { role: "teacher", teacherId });
  return { ok: true, role: "teacher", teacherId };
});
