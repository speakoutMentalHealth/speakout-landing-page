# SpeakOut Kiddies TV — whole-child learning framework, birth to age 17

Status: structured curriculum and archive completed; replacement videos require full review before cutover.

## Age paths

| Age | Viewing | Learning focus |
| --- | --- | --- |
| 0–2 | Caregiver guidance only, **no videos** | Talking, songs, reading, play, bonding |
| 3–5 | Preschool with adult | Letters, numbers, shapes, feelings, songs, stories |
| 6–9 | Primary foundations | English, maths, science, Nigerian culture, basic digital literacy |
| 10–12 | Upper primary | Reading comprehension, geography, maths, Scratch, experiments |
| 13–17 | Secondary | JSS/SSS maths, English, literature, science, coding, citizenship, careers |

WHO advises against sedentary screen time for infants and one-year-olds and recommends limiting screen time for ages 2–4. Babies are directed to caregiver-led learning, not a video list. Reference: https://www.who.int/publications/i/item/9789241550536

## Sixteen learning subjects

English & Phonics; English & Grammar; Literature & Storytelling; Mathematics; Science & Nature; Geography & Culture; Nigerian History & Citizenship; Nigerian Languages; Coding & Digital Literacy; Creative Arts & Music; Health & Wellbeing; Life Skills; Business & Financial Literacy; Agriculture & Environment; Sports & Movement; Practical Skills & Careers.

Video topics should be grade-specific: Nigerian states/FCT and capitals, African countries, world capitals, maps, African history and folktales, Hausa/Igbo/Yoruba, reading and writing, literature and poetry, arithmetic through advanced maths, biology, chemistry, physics, experiments, computing, Scratch, Python, visual art, music, hygiene, emotional development, financial literacy, farming and vocational skills. History and capitals need current fact checks. Nigerian core subject choices should align with the revised NERDC curriculum:
- https://www.nerdc.gov.ng/content_manager/new_curriculum_home.html
- https://nerdc.gov.ng/content_manager/pdf_files/Basic%20and%20Senior%20Secondary%20Education%20Curriculum%20Offerings.pdf
- https://nerdc.gov.ng/content_manager/Press%20Release%20On%20New%20FG%20Curriculum.pdf

## Current and target catalogues

- All **30 existing public videos** are copied verbatim into the rollback archive at docs/kiddies-tv-legacy-catalogue-20261101.json. Public data/kiddies-tv-approved.json is unchanged in this initial planning release.
- All **19 proposed geography/coding leads** are recorded in docs/kiddies-tv-geography-coding-age-curation-20261101.json and require actual full-video review, captions, accurate ages, publishers, adverts/end-card assessment and real iPhone/Android embeds.
- docs/kiddies-tv-replacement-staging-20261101.json contains an initially empty newVideos array. Only fully reviewed records will enter it.
- data/kiddies-tv-curriculum.json declares all subjects, age pathways and the safe replacement threshold.

### Staged replacement gate

1. Record a named adult reviewer, date, explicit approval and full-watch, factual, age, caption, sponsor/end-screen, iPhone/Android and embeddability checks on **every** new video.
2. Build balanced content covering core English, maths, literature, science, geography, coding and wellbeing.
3. Run the safe dry-run command: node scripts/kiddies-tv-curated-cutover.mjs. This does not change live content.
4. The cutover is blocked unless there are **40 different signed-off replacement videos**, at least **8 videos for each watchable age band (3–5, 6–9, 10–12, 13–17)** and representation for the required core subjects. These are continuity minimums, not full library completion.
5. Once all gates pass, run the script locally with --apply --confirm=replace-legacy-kiddies-tv, then review the diff, pass CI, verify media on real devices, merge a separate PR and verify both hosting targets.
6. Preserve the archive for rollback and remove any newly found unsafe or inaccurate clip.

A reasonable longer-term discovery goal is around 100 individually reviewed learning videos across the four viewing age groups, revised according to supply, age balance and quality. Do not invent approvals or publish mutable playlists.

## Safety and UX

The 0–2 pathway is caregiver-only. Other ages see appropriate approved videos, search, subject categories and a clear review-in-progress state when subject shelves are not yet populated. Continue SpeakOut in-site YouTube embeds and no-login access for Kiddies TV, while recognizing YouTube may still show advertisements, recommendations and external links. Keep content inclusive and avoid unsolicited religion-specific material or unqualified mental-health guidance.
