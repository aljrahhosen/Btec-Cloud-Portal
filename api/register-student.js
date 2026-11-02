const { admin, getAdminApp, verifyRequest, methodNotAllowed } = require("./_firebase-admin");

const validName = (value) => typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 120;
const validNationalId = (value) => typeof value === "string" && /^\d{10}$/.test(value);

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const token = await verifyRequest(req);
    const { fullName, nationalId } = req.body || {};
    if (!validName(fullName) || !validNationalId(nationalId)) {
      return res.status(400).json({ error: "Invalid registration data" });
    }

    const db = admin.firestore(getAdminApp());
    const userRef = db.collection("Users").doc(token.uid);
    const privateRef = db.collection("StudentPrivate").doc(token.uid);
    const directoryRef = db.collection("StudentDirectory").doc(token.uid);
    const nationalIdRef = db.collection("NationalIds").doc(nationalId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.runTransaction(async (tx) => {
      const [user, existingNational] = await Promise.all([tx.get(userRef), tx.get(nationalIdRef)]);
      if (user.exists && user.data().role === "teacher") throw Object.assign(new Error("Teacher accounts cannot use student registration"), { statusCode: 403 });
      if (existingNational.exists && existingNational.data().uid !== token.uid) throw Object.assign(new Error("National ID is already registered"), { statusCode: 409 });

      tx.set(userRef, {
        role: "student",
        registrationComplete: true,
        createdAt: user.exists ? user.data().createdAt || now : now,
        updatedAt: now
      }, { merge: true });
      tx.set(privateRef, { fullName: fullName.trim(), nationalId, email: token.email || "", updatedAt: now, createdAt: now }, { merge: true });
      tx.set(directoryRef, { displayName: fullName.trim(), createdAt: now, updatedAt: now }, { merge: true });
      tx.set(nationalIdRef, { uid: token.uid, createdAt: now });
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("register-student", error);
    return res.status(error.statusCode || 500).json({ error: error.message || "Registration failed" });
  }
};
