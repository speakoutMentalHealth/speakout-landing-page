# Kiddies TV: YouTube-only playback and adverts (November 2026)

## Policy and technical decision
Children select lessons from SpeakOut's own **approved-only** catalogue. Lesson tiles play YouTube videos inside SpeakOut via the `youtube-nocookie.com/embed/` privacy-enhanced player, rather than sending viewers to a source website. The dedicated watch page also remains a SpeakOut URL.

**Do not build a black advert cover, fake 30-second countdown, automatic advert skip button or overlay.** YouTube's embedded IFrame API does not provide a dependable advert-start, duration, completion or skippable state. YouTube expressly prohibits blocking, obscuring, modifying or replacing advertisements and any unsupported overlay over its player. Even `rel=0` cannot fully suppress related videos or the player’s platform links and branding.

YouTube policy references:
- https://developers.google.com/youtube/terms/developer-policies-guide
- https://developers.google.com/youtube/terms/required-minimum-functionality
- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/player_parameters

## Supported controls
- Select approved learning videos without leaving SpeakOut's catalogue.
- Explicitly disable autoplay in the iframe URL; do not automatically load random content.
- Provide clearly labelled manual **Stop video** controls. Stopping removes the embedded iframe (which ends playback), including any current YouTube advert. This is a user-initiated stop, not a programmatic advertisement filter.
- Return to SpeakOut's learning catalogue. State honestly that YouTube may show links, recommendations or adverts and young viewers should watch with a caregiver.
- Do not insert external YouTube watch-page links in owned lesson tiles. YouTube itself can still offer its own links inside its embedded player; our website cannot prohibit those while retaining supported embeds.

## Additional editorial gate
Only entries with a validated 11-character YouTube video ID and `approved === true` may be played. Third-party lesson pages with no confirmed YouTube ID are **research leads only**, not ready to be uploaded as videos. The African candidate queue in draft PR #417 currently contains 33 discovered leads, but only 13 have candidate IDs; no new candidate was approved. Each video still requires full audiovisual review, age-band, captions, embeddability and mobile playback checks. Do not imply YouTube videos are ad-free, or that source channel selection itself makes all ads child-safe.

## If ad-free playback becomes mandatory
Use SpeakOut-produced videos or videos licensed for self-hosting in a separate, explicitly approved video service. Uploading/redistributing third-party YouTube videos without the necessary rights is **not** an option. Until such rights and funding exist, maintain caregiver guidance and the manual Stop video action.
