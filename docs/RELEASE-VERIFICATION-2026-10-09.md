# Release verification: 9 October 2026

Release commit: `2dfa41640c3e2ffe4fc0cfaa0909742de453554f` ([PR #169](https://github.com/speakoutMentalHealth/speakout-landing-page/pull/169)).

| Check | Evidence | Scope / result |
| --- | --- | --- |
| Combined acceptance | [37931836366](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/37931836366) | All six staging suites and cleanup passed on the merged commit. Frontend served locally in CI. |
| Production Worker | [37931836467](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/37931836467) | Production deployment step succeeded. |
| Production Firestore rules | [37931836294](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/37931836294) | Rules deployment succeeded. |
| Production hosting | [37931836312](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/37931836312) | Firebase hosting deployment succeeded. |
| Public site smoke | `node scripts/public-smoke.mjs` | Home, Contact, Donate, SpeakHub, TV, Auth, robots and sitemap passed against production. |
| Public Worker smoke | Live HTTP requests | Catalog courses, TV and audio returned 200 with valid JSON; unsigned role overview and support-start requests returned 401. |
| Lighthouse | [37627375219](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/37627375219), 7 October | Home performance 66 and Contact 67, below the target of 70. Workflow success means report generation; scores are evidence-only. |

No authenticated production learner/school/support roundtrip or backup restore was performed. No Cloud Functions deployment was performed.

## Follow-up: gateway accessibility

The production browser accessibility tree exposed unnamed login fields and ordinary buttons inside a tablist. The follow-up provides visible associated labels for gateway fields, proper tab/panel semantics, keyboard navigation and announced status messages. Navigation is independent of Firebase loading. The browser regression workflow checks labels, selected tabs, focus, deep links and horizontal overflow at 320, 390, 768 and 1280 pixels with Firebase requests blocked. Its axe checks are focused on form names and ARIA validity, not full WCAG certification or authenticated acceptance.

## Recovery drill: inputs and execution record still required

Known source: Firestore project `speaakout-portal`, database `(default)`.

Before an operator can execute a drill, record the backup/export identifier or GCS location, region, isolated recovery project/database, authorized operator and approved retention/cost policy. Do not reuse the shared UAT project `speakout-portal-staging` as the recovery destination: imports can interfere with acceptance fixtures and contain confidential production records. Restrict the recovery destination before importing any backup.

The operator must record: backup time; restore start/end; operation identifiers; representative collection and document-count comparisons; a designated synthetic record's field integrity; indexes and permissions; and restricted access in the recovered environment. Missing evidence keeps this gate open. A restored Firestore database does not alone prove Firebase Auth, Cloudinary media, Worker configuration or other external resources can be recovered; inventory and test their recovery separately. No production import should be used for a drill.

## Authenticated production and physical-device acceptance

Use designated test identities and a disposable test tenant, with no private beneficiary data. Verify canonical pending/rejected/suspended denial and approved access; support activation, wrong-school denial and revocation; sign-out and password recovery completion. Existing staged seeded-account tests do not prove real school signup, provider email delivery or production account-state quality.

Check iPhone Safari, Android Chrome, keyboard navigation, text zoom, low connectivity and assistive technology on the actual hosted frontend. Automated viewport tests cover layout and selected semantics only. Payment receipt/settlement, factual claims and operational-policy review remain separate gates in the prelaunch runbook.
