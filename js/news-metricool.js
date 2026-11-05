/*
 * Metricool website visit analytics: public News & Events page only.
 * This does not publish content or send profile, support, school or wellbeing data.
 * No script is loaded until the visitor explicitly accepts analytics.
 */
const consentKey = 'speakout_public_news_metricool_v1';
const metricoolHash = '2958d7a3ca64457c9c960d22b5a9ba89';
const trackerUrl = 'https://tracker.metricool.com/resources/be.js';
let requested = false;
const banner = document.getElementById('news-analytics-choice');
const controls = document.getElementById('news-analytics-settings');

function currentChoice() {
  try { return localStorage.getItem(consentKey); } catch { return null; }
}
function saveChoice(choice) {
  try { localStorage.setItem(consentKey, choice); } catch { /* no storage permission */ }
}
function showChoice() {
  if (banner) banner.hidden = false;
}
function hideChoice() {
  if (banner) banner.hidden = true;
}
function loadTracker() {
  if (requested || window.location.pathname !== '/pages/news.html') return;
  requested = true;
  // No health-data payloads, query strings or custom event metadata.
  const script = document.createElement('script');
  script.src = trackerUrl;
  script.async = true;
  script.referrerPolicy = 'strict-origin-when-cross-origin';
  script.onload = () => {
    if (currentChoice() === 'allow' && window.beTracker?.t) {
      window.beTracker.t({ hash: metricoolHash });
    }
  };
  script.onerror = () => { requested = false; };
  document.head.appendChild(script);
}

const allow = document.getElementById('news-analytics-allow');
const decline = document.getElementById('news-analytics-decline');
allow?.addEventListener('click', () => {
  saveChoice('allow');
  hideChoice();
  loadTracker();
});
decline?.addEventListener('click', () => {
  const wasAllowed = currentChoice() === 'allow';
  saveChoice('decline');
  hideChoice();
  // A tracker already loaded in this document cannot be unloaded reliably.
  if (wasAllowed) window.location.reload();
});
controls?.addEventListener('click', showChoice);

if (currentChoice() === 'allow') {
  hideChoice();
  loadTracker();
} else if (currentChoice() === 'decline') {
  hideChoice();
} else {
  showChoice();
}
