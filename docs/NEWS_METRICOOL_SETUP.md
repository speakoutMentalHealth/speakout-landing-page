# SpeakOut News & Events + Metricool connection

## Purpose

- Public newsroom: https://speakoutmentalhealth.org/pages/news.html
- Admin publishing editor: https://speakoutmentalhealth.org/admin-news.html
- Collection: `newsEvents` (existing Firestore collection).
- Website analytics provider: Metricool. **Metricool tracks website visits; it does not publish announcements to the SpeakOut website.** A separate authenticated content workflow handles news posts.

## Publishing a public announcement

1. Sign in as a SpeakOut administrator and open **Admin Dashboard → News & Events**.
2. Enter a meaningful headline, category, ISO date, and description. Optional public location, image URL, and more-details URL are allowed.
3. Select **Draft** while details, participation consent and source accuracy are being checked.
4. When approved, change status to **Published** and save. Records are available in the public News & Events feed without a website-code deployment (once the backend and Firestore rules are published).
5. To withdraw a notice, select **Hide** in the editor. Never put confidential health details, protected student data or identifying photographs of minors without verified permissions in public records.

The legacy static school/event/media sections remain in place. Dynamic news renders at the top, sorted newest first, and only `active` or `published` statuses are permitted. The Firestore rule blocks public reading of draft and hidden documents.

**Deployment order:** server API news whitelist → restrictive Firestore rules → admin/editor/static site. Confirm admin status permission, public draft inaccessibility, and published visibility on staging before production. Changing repository files alone does not deploy worker/rules automatically.

## Metricool setup and verification

The tag from the provided Metricool screenshot is configured in `js/news-metricool.js`; compare it against the **Copy** button on Metricool before final publication because text in a photograph can be ambiguous. Provider resource: `https://tracker.metricool.com/resources/be.js`. This integration measures only **public News & Events** visits, not main website traffic, and is not a social-post publishing connector.

Because SpeakOut also serves minors and mental-health users, the tracker only loads after a visitor selects **Allow analytics** in the News & Events banner. The choice can be reopened with **Analytics choices**; disabling it reloads the page. No health/profile information is passed as explicit custom parameters.

To verify after public publication:

1. Open an incognito browser at `https://speakoutmentalhealth.org/pages/news.html`.
2. Select **Allow analytics** on the page.
3. In Metricool, click **Verify** in the Website/Blog connection wizard.
4. Inspect Metricool real-time visits. Report data may require the next day to populate.

**Do not expect Metricool's Verify to succeed on a draft branch; the tracker must be live.** Existing visits cannot be backfilled. Analytics outside News & Events are intentionally excluded pending a broader privacy and audience-scope review.

## Testing

- `node --test tests/phase121-news-metricool.test.mjs` offline
- `npm test` for the full repository source suite
- Test as an unauthenticated visitor, an approved administrator, and a non-admin account. Verify draft/hidden data cannot be read from Firestore, links are safe, and the public page is still usable when analytics are refused.
