// Interpret only allowlisted structured Google API error fields.
// Never log raw provider messages, response bodies, credentials or user data.
const safe = (value, max = 110) => {
  const text = String(value ?? "");
  return /^[A-Za-z0-9_./:-]{1,110}$/.test(text) ? text.slice(0, max) : "unavailable";
};
export function firestoreQuotaDetail(body) {
  const envelope = Array.isArray(body) ? body.find(item => item?.error) : body;
  const error = envelope && typeof envelope === "object" ? envelope.error : null;
  const details = Array.isArray(error?.details) ? error.details : [];
  const info = details.find(entry => entry?.["@type"] === "type.googleapis.com/google.rpc.ErrorInfo");
  const failures = details.filter(entry => entry?.["@type"] === "type.googleapis.com/google.rpc.QuotaFailure");
  const firstViolation = failures.flatMap(entry => Array.isArray(entry.violations) ? entry.violations : [])[0] || {};
  return {
    googleStatus: safe(error?.status, 40),
    reason: safe(info?.reason, 70),
    quotaMetric: safe(info?.metadata?.quota_metric),
    quotaLimit: safe(info?.metadata?.quota_limit),
    quotaSubject: safe(firstViolation?.subject)
  };
}
export function firestoreQuotaSummary(body) {
  const fields = firestoreQuotaDetail(body);
  return Object.entries(fields).map(([key, value]) => key + "=" + value).join("; ");
}
