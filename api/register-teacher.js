const { admin, getAdminApp, verifyRequest, methodNotAllowed } = require("./_firebase-admin");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const token = await verifyRequest(req);
    const { teacherId, name } = req.body || {};
    if (typeof teacherId !== "string" || !teacherId.trim() || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
      return res.status(400).json({ error: "Invalid teacher registration data" });
    }
    const db = admin.firestore(getAdminApp());
    const codeRef = db.collection("TeacherCodes").doc(teacherId.trim());
    const userRef = db.collection("Users").doc(token.uid);
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const code = await tx.get(codeRef);
      if (!code.exists || code.data().used === true) throw Object.assign(new Error("Invalid or used teacher verification ID"), { statusCode: 403 });
      tx.set(userRef, { role: "teacher", displayName: name.trim(), teacherId: teacherId.trim(), registrationComplete: true, createdAt: now, updatedAt: now }, { merge: true });
      tx.update(codeRef, { used: true, usedBy: token.uid, usedAt: now });
    });
    await admin.auth(getAdminApp()).setCustomUserClaims(token.uid, { role: "teacher" });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("register-teacher", error);
    return res.status(error.statusCode || 500).json({ error: error.message || "Teacher registration failed" });
  }
};
