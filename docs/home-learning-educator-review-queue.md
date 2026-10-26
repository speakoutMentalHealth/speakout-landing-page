# SpeakOut Home Learning — independent educator review queue

**Source:** `data/home-learning-catalog.json` (development-preview).
**Current position:** **0/16 entries approved**, 8 unique HTML resource files. This is an assignment plan, **not** proof of review or a publication authorization.

## Review assignments (not yet assigned)

| # | Resource ID | Level and subject | Source file | Current status | Assigned educator | Independent editor |
|---|---|---|---|---|---|---|
| 01 | `nursery-counting` | Nursery · Numeracy | [Draft](../early-years-counting-pack.html) | Unreviewed | — | — |
| 02 | `primary-1-3-maths` | Primary 1–3 · Mathematics | [Draft](../primary-home-learning-packs.html) | Unreviewed | — | — |
| 03 | `primary-1-3-english` | Primary 1–3 · English | [Draft](../primary-home-learning-packs.html) | Unreviewed | — | — |
| 04 | `primary-4-6-maths` | Primary 4–6 · Mathematics | [Draft](../upper-primary-home-learning-packs.html) | Unreviewed | — | — |
| 05 | `primary-4-6-english` | Primary 4–6 · English | [Draft](../upper-primary-home-learning-packs.html) | Unreviewed | — | — |
| 06 | `jss-1-3-mathematics` | JSS 1–3 · Mathematics | [Draft](../junior-secondary-home-learning-packs.html) | Unreviewed | — | — |
| 07 | `jss-1-3-english` | JSS 1–3 · English | [Draft](../junior-secondary-home-learning-packs.html) | Unreviewed | — | — |
| 08 | `ss-1-3-mathematics` | SS 1–3 · Mathematics | [Draft](../senior-secondary-home-learning-packs.html) | Unreviewed | — | — |
| 09 | `ss-1-3-english` | SS 1–3 · English | [Draft](../senior-secondary-home-learning-packs.html) | Unreviewed | — | — |
| 10 | `jss-1-3-basic-science` | JSS 1–3 · Basic Science | [Draft](../secondary-science-home-learning-packs.html) | Unreviewed | — | — |
| 11 | `ss-1-3-biology` | SS 1–3 · Biology | [Draft](../secondary-science-home-learning-packs.html) | Unreviewed | — | — |
| 12 | `primary-1-3-basic-science` | Primary 1–3 · Basic Science | [Draft](../primary-science-home-learning-packs.html) | Unreviewed | — | — |
| 13 | `primary-4-6-basic-science` | Primary 4–6 · Basic Science | [Draft](../primary-science-home-learning-packs.html) | Unreviewed | — | — |
| 14 | `primary-1-3-social-studies` | Primary 1–3 · Social Studies | [Draft](../social-civic-home-learning-packs.html) | Unreviewed | — | — |
| 15 | `primary-4-6-social-studies` | Primary 4–6 · Social Studies | [Draft](../social-civic-home-learning-packs.html) | Unreviewed | — | — |
| 16 | `jss-1-3-civic-education` | JSS 1–3 · Civic Education | [Draft](../social-civic-home-learning-packs.html) | Unreviewed | — | — |

## Evidence required for each entry

1. Verify the exact resource ID, immutable Git commit SHA, source HTML file and content SHA-256.
2. Read every lesson section and activity; independently check the answer keys and examples.
3. Confirm grade/age suitability, accessibility, safeguarding and clear language.
4. Provide specific Nigerian curriculum references: authority, title, applicable level, year/version and section or learning outcome. Don't invent a reference.
5. Review licensing/originality of text, images and links.
6. Record findings, corrections required, reviewer name/role, approval status and review date in the protected reviewer workflow.
7. An **independent editor**, distinct from the educator, checks the evidence and the corrected version. Do not approve solely on the basis of a checked box.
8. Content must retain `review_status: unreviewed` in the catalogue until the independent approval and publication gate is implemented and authorized.

## Suggested batching to finish quickly

- **Batch A:** Nursery numeracy; Primary 1–3 maths and English; Primary 1–3 basic science and social studies.
- **Batch B:** Primary 4–6 maths and English, science and social studies.
- **Batch C:** JSS maths, English, basic science and civic education.
- **Batch D:** SS maths, English and biology.

Because multiple subjects share HTML pages, a single file review may cover layout/accessibility once, but **each subject entry still needs subject-specialist content review**.

## Stop conditions

- No reviewer assigned or independent editor available
- Curriculum source not verified, inaccurate material or unsafe child content
- Resource changed since reviewed (commit/digest mismatch)
- Missing independent approval or missing audit evidence

**Definition of done:** each entry has a documented qualified review, addressed findings, an independent editor's decision, verifiable content hash, and an explicitly approved release record. A green GitHub Actions result cannot substitute for these steps.
