export const SUPPORT_SESSION_MS = 60 * 60 * 1000;

export function requireActiveSupportSession(session, uid, schoolId, now = Date.now()) {
  const expiry = Date.parse(session?.expiresAt || "");
  if (session?.active !== true || session.actorUid !== uid || session.schoolId !== schoolId ||
      !Number.isFinite(expiry) || expiry <= now) {
    throw Object.assign(new Error("Start a new support session for this school. The previous session may have ended or expired."), { status: 403 });
  }
  return session;
}
