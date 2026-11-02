const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

async function verifyRequest(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    const error = new Error("Authentication is required");
    error.statusCode = 401;
    throw error;
  }
  return admin.auth(getAdminApp()).verifyIdToken(header.slice(7));
}

function methodNotAllowed(res) {
  res.setHeader("Allow", "POST");
  return res.status(405).json({ error: "Method not allowed" });
}

module.exports = { admin, getAdminApp, verifyRequest, methodNotAllowed };
