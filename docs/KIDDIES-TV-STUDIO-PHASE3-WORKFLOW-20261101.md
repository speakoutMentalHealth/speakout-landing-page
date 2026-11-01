# Kiddies TV Studio — Administration Workflow, Phase 3

Updated November 1, 2026. Building on the working administrator backend, this release adds four operational tools **inside the same authenticated Studio**.

## 1. Bulk CSV import into drafts

Open **Kiddies TV Studio → Bulk Intake**. Download the CSV template or upload a CSV file (maximum 250 KB) / paste CSV data. Required headers:

url,title,description,source,category,ages

Use a real YouTube URL or its 11-character ID. Use exact curriculum subject names; valid age bands are 3-5, 6-9, 10-12 and 13-17, separated with | in the same cell. Quote commas in titles/descriptions.

- At most 40 videos per transaction; this limit bounds writes, review work and rollback impact.
- Preview checks IDs, field lengths, subjects, age groups, missing data, duplicate rows and duplicates already in the library.
- Invalid files are rejected entirely, not partially imported.
- **Every imported video is a draft**, never public. No imported record is auto-reviewed or approved.
- A Firestore transaction creates all draft documents and an audit event for each row. If a row appears concurrently, the whole import rejects without a partial import.
- Review imported drafts individually before publishing.

## 2. Review queue

The Review Queue prioritises drafts, then previously published lessons without a digital review record. Click **Review** to open the editor for the selected video. Actually watch the entire video, including sponsors and endings; verify language, captions, factual correctness, suitable ages, embedded mobile playback and ad risks. Add the reviewer name and date, confirm that review, then Publish. Do not check the review confirmation based only on YouTube titles or metadata.

## 3. Age and subject coverage

The live report counts **published** videos, not drafts. It shows subject-by-age counts for 16 curriculum areas and four watchable age bands. Zero counts are labelled as gaps; nonzero counts are not a promise of complete curriculum coverage. The under-two pathway stays caregiver-led, without direct video recommendations.

## 4. Append-only audit history

Each Studio create/edit/publish/unpublish/archive/restore action and each bulk draft import writes an audit event containing actor UID, server timestamp, title, YouTube ID, previous and next publication states and an import batch ID. The audit collection is only readable by approved administrators; child visitors and learners cannot read it. Even administrators cannot update or delete events under Firestore rules. The Studio shows the latest 40 and can load older records.

This is an application-logged editorial history; it is not a substitute for privileged Firebase project audit logs (administrators with direct cloud privileges outside the app may have other database powers). Admin UI does not expose destructive audit actions.

## Activation and safe rollout

1. Merge [PR #434](https://github.com/speakoutMentalHealth/speakout-landing-page/pull/434) containing audit collection security rules, and verify the production rules deployment succeeds.
2. Merge the Studio workflow PR only after all repository, Firestore emulator, browser, accessibility and Lighthouse checks pass.
3. Test with a real administrator: upload two sample rows **as Draft**, verify no public changes, open Review, publish one genuinely reviewed video, unpublish, check public page and audit record.
4. Existing 30 videos and the already-verified CRUD flow must remain functional. No mass deletion or auto-publication is part of this upgrade.

## Manual test template

Copy the provided CSV template. Replace the dummy YouTube ID with a **real unique educational video**, and verify its facts and ages before publishing. Do not publish the template's placeholder data. If the import fails, read the row-specific validation errors; adjust only invalid rows and preview again. Only after the transaction says success should you expect the Draft count and review queue to rise.
