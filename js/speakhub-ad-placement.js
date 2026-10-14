/* Controlled SpeakHub advertising placement.
 * DISABLED until Google site approval, consent/CMP, audience treatment,
 * and appropriate public-content review are completed.
 * Never use this module in auth, assessment, private learner or child pages.
 */
(() => {
  "use strict";
  const ADS_ENABLED = false;
  const PUBLISHER = "ca-pub-9014764551074349";
  const AD_SLOT_ID = ""; // Google-issued ad unit ID; do not guess.
  const root = document.getElementById("speakhub-sponsor-slot");
  const target = document.getElementById("speakhub-sponsor-container");
  if (!root || !target || !ADS_ENABLED || !AD_SLOT_ID) return;
  // A future activation MUST verify audience, consent, policy and site approval.
  // These safeguards are deliberately not inferred from a browser cookie.
  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.display = "block";
  ad.dataset.adClient = PUBLISHER;
  ad.dataset.adSlot = AD_SLOT_ID;
  ad.dataset.adFormat = "auto";
  ad.dataset.fullWidthResponsive = "true";
  target.append(ad);
  root.hidden = false;
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
})();
