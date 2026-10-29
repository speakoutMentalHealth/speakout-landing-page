// Bounded, privacy-safe diagnostic classification for staging browser registration.
const firebaseCodes = new Set([
  "permission-denied","resource-exhausted","unavailable","deadline-exceeded",
  "unauthenticated","network-request-failed","too-many-requests",
  "email-already-in-use","operation-not-allowed","invalid-email",
  "internal-error","failed-precondition"
]);
const services = new Set(["firestore","authentication","portal"]);
export function registrationService(url, localOrigin) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "firestore.googleapis.com") return "firestore";
    if (["identitytoolkit.googleapis.com","securetoken.googleapis.com"].includes(parsed.hostname)) return "authentication";
    if (parsed.origin === localOrigin) return "portal";
  } catch {}
  return "other";
}
export function registrationCodes(message) {
  const matches = [...String(message).matchAll(/\b(?:auth|firestore)\/([a-z-]{2,60})\b/gi)];
  return [...new Set(matches.map(match => match[1].toLowerCase()).filter(code => firebaseCodes.has(code)))];
}
export function registrationEvent(service, status, kind="http") {
  if (!services.has(service)) return null;
  if (kind === "network") return { kind, service };
  if (!Number.isInteger(status) || status < 400 || status > 599) return null;
  return { kind:"http", service, status };
}
