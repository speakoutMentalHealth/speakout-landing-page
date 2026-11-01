# Kiddies TV — ages 13–17 video review batch (1 November 2026)

## Scope and current release status

This branch prepares **nine distinct 13–17 candidates with syntactically valid YouTube IDs**. They are **not approved** and must not enter `data/kiddies-tv-approved.json` until each video has been reviewed. All nine are staged in `docs/kiddies-tv-teen-13-17-review-batch.json` because `docs/**` is excluded by Firebase Hosting. The file is review-only and is not linked from Kiddies TV. Existing public lessons remain unchanged.

Suggested release target: first **five approved teens' lessons**, balanced across Nigeria-first English, mathematics and science where possible. We currently have only candidates, **zero verified public-ready videos** for ages 13–17.

## Candidate review sequence

| ID | Region / listed publisher | Subject | Source confidence | YouTube ID | Next check |
| --- | --- | --- | --- | --- | --- |
| AFR-31 | Nigeria / Gopius | WAEC/JAMB English: lexis | Article directly links the ID | `_1mKBtLVb3A` | Actual video, publisher, captions, ending |
| AFR-32 | Nigeria / Gopius | WAEC/JAMB cell biology | Article timestamp directly links ID | `rydMYc1UzDw` | Actual video, accuracy, embed |
| AFR-33 | Nigeria / Gopius | WAEC/JAMB food chains | Article timestamp directly links ID | `I5ihznJxPGA` | Actual video, accuracy, end cards |
| AFR-23 | Nigeria-focused / FlashLearners | Mathematics | Subject page reports ID, title pending | `M5I7fWUbwpc` | Identify actual video and channel |
| AFR-24 | Nigeria-focused / FlashLearners | English | Subject page reports ID, title pending | `j9e2DFVLHR8` | Identify actual video and channel |
| AFR-25 | Nigeria-focused / FlashLearners | Biology | Subject page reports ID, title pending | `bxa0Fp_o8UI` | Identify actual video and channel |
| AFR-21 | South Africa / Mindset | Grade 10 algebra | Candidate metadata only | `A2Y2Qa7S6ZE` | Confirm actual title and publisher |
| AFR-22 | South Africa / Mindset | Grade 11 life sciences | Candidate metadata only | `uXNh8E5V6Z8` | Confirm actual title and publisher |
| AFR-26 | Nigeria-focused / uLesson attribution unconfirmed | Statistics | Low confidence, third-party discovery | `hdUDv9RjMSM` | Verify creator and lesson identity |

Source pages: https://gopius.com/lexis-and-structure-synonyms-antonyms-homonyms-clauses/ ; https://gopius.com/cell-biology-theory-levels-of-organization-structure/ ; https://gopius.com/energy-flow-food-chain-food-web-trophic-levels-pyramid/ . Other source pages are retained in the JSON batch. These pages corroborate *topics and referenced URLs*, not the entire audiovisual content.

## Mandatory review and evidence for every individual video

1. Confirm YouTube ID still resolves to the expected exact title, creator, duration, public status and an iframe-embeddable video. Metadata alone is not approval.
2. Watch 100% at normal speed, including intros, sponsors, any sensitive scenes, closing frames and end cards. Record exact timestamps for concerns.
3. Verify it is appropriate for students aged 13–17, educationally correct, not deceptive, exploitative or commercially unsuitable. Use Nigerian syllabus relevance when possible. Confirm language and captions.
4. Test the video embedded on SpeakOut, with iPhone Safari and Android Chrome; check sound, controls, fullscreen and landscape. Note third-party advertisements or links. Do **not** try to mask or skip YouTube advertisements.
5. Record a **named reviewer**, UTC review date, all checkboxes and an explicit decision `approved`, `needs_another_review` or `rejected`. Blank, missing, or other statuses default to *not approved*.
6. Only then add the exact video record with `approved:true`, confirmed title/source, correct category, `ages:["13-17"]` (or an explicitly verified broader age set), description and YouTube ID to the public catalogue. Check for duplicate YouTube IDs. Run Node and mocked browser tests, then live Safari/Android playback smoke tests.

The Nigerian educational articles provide a useful starting point. However, direct YouTube video retrieval was throttled in research on 1 November 2026; video playback, captions and embeddability have **not** been directly verified here.

## Safety / privacy

No public unreviewed videos, no off-site curated outbound watch links inside the Kiddies TV catalogue, and no unapproved autoplay playlists or recommendation feeds. For student mental health content use qualified review and clear non-diagnostic framing. Do not let an AI model or metadata scraper self-approve teen videos.

## Next batch

After approvals, add missing teenager-friendly digital literacy, study skills, career exploration, and life skills content by verified African and Nigerian educational creators. Continue the existing 33-lead African discovery pool without treating all leads as playable or appropriate for teens.
