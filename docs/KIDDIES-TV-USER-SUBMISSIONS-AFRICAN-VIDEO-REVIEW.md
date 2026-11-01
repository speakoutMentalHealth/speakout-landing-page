# User-shared African YouTube videos — Kiddies TV review batch

Received 1 November 2026. The project owner supplied one YouTube playlist and six independent video links. Links are **suggestions to review**, not an instruction to declare that complete YouTube content was watched or to override the child-safety policy.

## Items received

- Playlist PLEp6HdXIBkhrkn3esl9tsw-hhLJKkRHwB — discover up to 30 actual IDs; never embed the raw playlist, which could change or include unreviewed items.
- SUB-01 tcGWl2TN4Ec
- SUB-02 g6CVApMxmqg
- SUB-03 X7ic17zx0gA
- SUB-04 kB7qOJT5x1A
- SUB-05 G0F2PiVP_FI
- SUB-06 53K2jjPjdds

YouTube URLs are in the JSON submission file. Titles/publishers and playlist members are to be verified with the **metadata-only** GitHub CI preflight. The current app shows only approved videos in its controlled, on-site YouTube embed; it does not open external watch links or embed an unreviewed playlist.

## Editorial decisions still required

1. Confirm the exact title, channel and actual video (not merely matching the ID in metadata).
2. Watch every video all the way through including sponsors, opening, ending, ad possibilities and end screens.
3. Decide age suitability per video: 3–5, 6–9, 10–12, or 13–17. **Do not assume every user-shared video is for teens.** Children's songs and African geography material may be for younger pupils.
4. Choose an existing subject only if accurate; otherwise propose a reviewed **African Culture & Geography** subject as a separate, tested app change.
5. Verify correctness, language, captions, iOS/Android inline and fullscreen playback. YouTube ads/recommendations cannot be masked.
6. Record each reviewer's identity/date/decision and approved text. Check for duplicates against the public catalogue.
7. Only approved individual video IDs (never the mutable playlist itself) can be added to the public approved-only list, with standard GitHub tests and release checks.

## Current status

All submissions remain unpublished until verification is complete. User-submitted links do not grant perpetual permission for unknown future playlist items. Metadata preflight provides discovery assistance only and cannot establish child suitability.

## Direction confirmed: African geography, Nigeria, world capitals and coding

The six links are **directional samples**. The goal is a multi-age selection, not to publish them all as-is. The LearningMole playlist contains 22 listed entries, with a duplicate ID and one incomplete metadata result, so its individual videos must be curated instead of embedding the mutable playlist.

The first wider selection consists of **19 individual candidate videos** in the age-graded geography/coding JSON review file. Some lessons fit multiple ages. All age tags are **proposed suitability**, based on publisher descriptions, not completed full-video reviews.

### Children (3–12)
- African geography songs: Bino and Fino, Kunda & Friends, Buki Kids, Gracie's Corner
- Nigeria states and capitals: Proudly Naija After School Club, Obillion Kiddies TV
- African and world maps: Kiddopedia, Play Laugh Learn
- Coding: Black Girls Code's Scratch beginner series and selected LearningMole short lessons

### Secondary school (13–17)
- Africa countries/capitals: Bessem and Neba, KLT and Kiddopedia
- World capitals: Kiddopedia's world geography series (fact check is essential)
- Practical coding: Black Girls Code's Python game project and relevant coding/algorithm lessons

### Verified source concerns

- SUB-02 g6CVApMxmqg responded with YouTube oEmbed HTTP 401 on the GitHub runner. Do not treat it as ready until its metadata and embeddability are verified.
- The original tcGWl2TN4Ec is Teaching Mama's **Sight Words Sentences Compilation**, better suited to early reading, not African geography or coding.
- The original X7ic17zx0gA is The Fixies' cartoon **The Secret Code!**: entertaining exposure, not a practical programming tutorial.
- Capital-city facts **change**. Equatorial Guinea officially declared Ciudad de la Paz its capital on January 2, 2026 (government decree: https://www.guineaecuatorialpress.com/noticias/decreto_ley_por_el_que_se_declara_la_ciudad_de_la_paz_djibloho_capital_de_la_republica_de_guinea_ecuatorial). Burundi's political capital is Gitega and Bujumbura is its economic capital (https://primature.gov.bi/presentation-generale/). Any older video saying Malabo or Bujumbura is the sole current capital needs a timestamped accuracy caveat or exclusion.

### Release plan

1. Introduce a **Geography & Culture** subject alongside Coding & Digital Literacy in the library and dedicated watch-page category allowlists.
2. Keep the public catalogue at 30 until individual videos have been reviewed in full and approved.
3. Prioritise a Nigeria state/capital lesson, Africa countries song, world map/capital lesson, younger Scratch walkthrough and teen Python project as the first reviewed batch.
4. Record named reviewer full-watch and device decisions, then append individual approved video IDs with correct age bands to the public catalogue in a separate tested publication PR.

The YouTube metadata preflight is only a source identity check and cannot guarantee accuracy, safety, ad exposure, caption quality, or embeds.
