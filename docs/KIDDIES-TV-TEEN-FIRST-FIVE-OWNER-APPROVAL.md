# Kiddies TV — First five 13–17 lessons (owner-authorised release)

**Recorded 1 November 2026.** SpeakOut's project owner explicitly replied **“Approved… continue”** after receiving the first five Nigerian learning videos, their source names and the outstanding full-watch and device verification requirements.

## Scope of this approval

This statement is treated as **authorisation to publish these five named videos**, not as evidence that SpeakOut's staff or the assistant completed a full audiovisual review. We have deliberately left the original `review.watchComplete` and other unconfirmed check fields unchanged. No reviewer name, review timestamp, captions check, full playback or iPhone/Android test has been invented. The explicit consent and remaining risks are recorded against these five items in `docs/kiddies-tv-teen-13-17-review-batch.json`.

The owner-authorised release uses YouTube's public metadata (confirmed by [GitHub Action 41297638271](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/41297638271)) for exact titles and credited channels.

| Review ID | Video / publisher | Release target |
| --- | --- | --- |
| AFR-31 | Lexis and Structure 1 — Gopius E-Learning | English & Grammar, 13–17 |
| AFR-32 | Cell Biology Part 1 — Gopius E-Learning | Science & Nature, 13–17 |
| AFR-33 | Energy Flow Explained — Gopius E-Learning | Science & Nature, 13–17 |
| AFR-23 | Operations On Numbers — FlashLearners | Mathematics, 13–17 |
| AFR-24 | English Language - Meaning, Units & Skills — FlashLearners | English & Grammar, 13–17 |

## Release controls

- Preserve the original 25 approved entries and append exactly five owner-approved entries: 30 total.
- Preserve all nine review candidates and the discovery archive. Four unapproved records remain unpublished.
- The home page displays a new **Secondary School · Ages 13–17** discovery shelf with no duplicated entries in the unfiltered view. The 13–17 age filter narrows the catalogue.
- Existing site constraints remain: the approved-only allowlist, `youtube-nocookie.com` embeds, on-site playback, small close control, report functionality, and acknowledgement of ads/external YouTube links.
- Automated code, simulated-browser, site accessibility and Lighthouse checks are required. Tests that mock YouTube do **not** validate actual playback, captions or commercial overlays.
- Cache-safe new JS/CSS URL names prevent old Safari files from being mixed with new HTML.

## Outstanding post-release video QA

A named SpeakOut reviewer should still watch the full five videos (including intro, sponsors, ending), document timestamps and verify captions, factual accuracy, age suitability and iPhone/Android embedding and fullscreen. If any video fails, **remove it immediately from `data/kiddies-tv-approved.json` and redeploy**. Use Issue #425 for results.

The automation that promotes *fully verified* videos continues to require its strict per-video checklist. This release does not falsify completed checks or silently loosen that automation for future uploads.
