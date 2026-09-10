/* Public deployment configuration. This contains no secret. */
const stagingHosts = new Set([
  "speakout-portal-staging.web.app",
  "speakout-portal-staging.firebaseapp.com"
]);

const productionHosts = new Set([
  "speakoutmentalhealth.org",
  "www.speakoutmentalhealth.org",
  "speaakout-portal.web.app",
  "speaakout-portal.firebaseapp.com"
]);

export const PLATFORM_API_BASE = stagingHosts.has(location.hostname)
  ? "https://speakout-platform-api-staging.speakout-platform-api.workers.dev"
  : productionHosts.has(location.hostname)
    ? "https://speakout-platform-api.speakout-platform-api.workers.dev"
    : "";
