# SpeakOut marketing instrumentation foundation

Status: production-safe foundation prepared 27 September 2026.

## What is implemented

- A first-party in-memory marketing event layer in `js/marketing-foundation.js`.
- Standardized events for page views, school-registration interest, donations, volunteer interest, contact intent, WhatsApp/email contact, Academy interest, TV opens, portal opens and form-submit intent.
- Only allow-listed UTM fields and referrer host are included. Form field values, email addresses, phone numbers, account fields, medical information and learning records are not collected by this layer.
- The event layer does not itself send data to Google, Meta, TikTok or any other external analytics service.
- Existing AdSense pages request non-personalized advertising and disable personalization in the publisher tag.
- `ads.txt` remains configured for publisher `pub-9014764551074349`.

## External account configuration still required

1. Google Analytics / Tag Manager: add an approved GA4 measurement ID or GTM container only after the privacy/consent configuration is ready.
2. Google Search Console: verify domain ownership and submit `https://speakoutmentalhealth.org/sitemap.xml`.
3. AdSense Privacy & messaging: configure the Google CMP / regulatory messages required for the regions where ads are served.
4. Ad age treatment: decide which pages or sections must receive child or teen treatment and configure those requests/account settings accordingly.
5. AdSense review: keep advertising concentrated on eligible media/learning inventory; do not place ads inside private support flows, health assessments, account records or school dashboards.

## Event names

- `speakout_page_view`
- `speakout_school_registration_start`
- `speakout_donation_start`
- `speakout_volunteer_interest`
- `speakout_contact_start`
- `speakout_whatsapp_contact`
- `speakout_email_contact`
- `speakout_academy_interest`
- `speakout_tv_open`
- `speakout_portal_open`
- `speakout_form_submit_intent`

The global `window.speakoutMarketing.track(name, details)` API is available for future explicit conversion events.