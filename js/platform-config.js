/* Public deployment configuration. This contains no secret. Production remains
   fail-closed until its own Worker and exact-origin CORS policy pass QA. */
const stagingHosts = new Set([
  "speakout-portal-staging.web.app",
  "speakout-portal-staging.firebaseapp.com"
]);

export const PLATFORM_API_BASE = stagingHosts.has(location.hostname)
  ? "https://speakout-platform-api-staging.speakout-platform-api.workers.dev"
  : "";
