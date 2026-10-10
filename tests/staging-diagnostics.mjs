// Failure evidence is deliberately structural: never persist URLs, payloads,
// console messages, credentials, fixture identifiers or free-form server text.
const serviceCodes = new Set([
  "OK", "CANCELLED", "UNKNOWN", "INVALID_ARGUMENT", "DEADLINE_EXCEEDED",
  "NOT_FOUND", "ALREADY_EXISTS", "PERMISSION_DENIED", "UNAUTHENTICATED",
  "RESOURCE_EXHAUSTED", "FAILED_PRECONDITION", "ABORTED", "OUT_OF_RANGE",
  "UNIMPLEMENTED", "INTERNAL", "UNAVAILABLE", "DATA_LOSS"
]);
const browserCodes = new Set([
  "permission-denied", "unauthenticated", "unavailable", "deadline-exceeded",
  "resource-exhausted", "failed-precondition", "not-found", "network-request-failed",
  "user-token-expired", "invalid-user-token", "too-many-requests"
]);
const states = new Set(["approved", "pending", "rejected", "suspended"]);

export function responseDiagnostic(response, body) {
  const code = body?.error?.status;
  return {
    httpStatus: Number.isInteger(response?.status) ? response.status : null,
    serverCode: serviceCodes.has(code) ? code : response?.ok ? "OK" : "UNRECOGNIZED"
  };
}

export function profileDiagnostic(result) {
  return {
    ...responseDiagnostic(result?.response, result?.body),
    canonicalStatus: states.has(result?.data?.status) ? result.data.status : "unknown"
  };
}

export function requestCategory(rawUrl, localOrigin) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === "firestore.googleapis.com") return "firestore";
    if (url.hostname === "identitytoolkit.googleapis.com" || url.hostname === "securetoken.googleapis.com") return "authentication";
    if (url.hostname === "www.gstatic.com") return "firebase-sdk";
    if (url.origin === localOrigin) return "portal";
  } catch {}
  return "other";
}

export function consoleDiagnostic(message) {
  const codes = [...String(message).matchAll(/(?:firestore\/|auth\/|code=)([a-z-]+)\b/g)];
  return [...new Set(codes.map(match => match[1]).filter(code => browserCodes.has(code)))];
}

export function noticeDiagnostic(text) {
  if (/awaiting approval|pending approval|once your account is approved/i.test(text)) return "approval-pending";
  if (/sign in|login|create an account/i.test(text)) return "sign-in-required";
  if (/loading/i.test(text)) return "loading";
  return "other";
}

export function observeCatalogue(page, localOrigin) {
  const events = [];
  const add = event => { if (events.length < 40) events.push(event); };
  const failed = request => add({ type: "request-failed", service: requestCategory(request.url(), localOrigin) });
  const response = value => {
    if (value.status() >= 400) add({ type: "http-error", service: requestCategory(value.url(), localOrigin), httpStatus: value.status() });
  };
  const consoleMessage = message => {
    if (!["error", "warning"].includes(message.type())) return;
    add({ type: "console", severity: message.type(), codes: consoleDiagnostic(message.text()) });
  };
  page.on("requestfailed", failed);
  page.on("response", response);
  page.on("console", consoleMessage);
  return {
    reset() { events.length = 0; },
    async capture() {
      const ui = await page.evaluate(() => ({
        searchDisabled: document.querySelector("#searchInput")?.disabled ?? null,
        notices: ["loading", "resultCount", "activePathwayStatus"].map(id => document.getElementById(id)?.textContent || "")
      })).catch(() => null);
      return { events: [...events], ui: ui ? { searchDisabled: ui.searchDisabled, notices: ui.notices.map(noticeDiagnostic) } : null };
    },
    dispose() {
      page.off("requestfailed", failed);
      page.off("response", response);
      page.off("console", consoleMessage);
    }
  };
}
