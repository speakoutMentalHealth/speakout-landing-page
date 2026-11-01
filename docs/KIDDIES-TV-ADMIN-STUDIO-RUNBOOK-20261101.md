# SpeakOut Kiddies TV — Admin Studio

## Purpose
Kiddies TV now has a dedicated management interface just like adult SpeakOut TV. After a single Firestore security setup, authorised administrators can add, edit, publish, unpublish and archive videos **without GitHub, ChatGPT or redeployment**.

Admin URL: https://speakoutmentalhealth.org/admin-kiddies-tv.html
Public URL: https://speakoutmentalhealth.org/kiddies-tv.html
Database: Firebase project speaakout-portal, collections kiddiesTvVideos and kiddiesTvConfig, distinct from tvEpisodes.

## Activation and safety
1. Merge and verify **security PR #431** first. Main-branch changes to firebase/firestore.rules automatically run the existing production deployment workflow, Deploy Firestore Rules. Confirm its job **completed successfully** before deploying the live editor/public runtime.
2. Publish the editor and managed public viewer from the separate UI PR. Main admin/dashboard and adult TV Studio will link to Kiddies TV Studio.
3. Sign in using an **approved admin or super_admin** account, using the same identity and authorisation system as SpeakOut TV.
4. The first edit or archive creates kiddiesTvConfig/live with mode overlay and the list of old static IDs to hide. No mass-import of all 30 current videos is necessary.
5. The public view loads the 30 existing clips only while **no overlay config exists**. After the first admin operation, it reads public config and the secure Firestore query of published records. If Firestore is down or permissions fail after activation, the player **fails closed** rather than resurrecting previously hidden videos.
6. Admin-authored videos stay drafts until a named reviewer confirms a complete content review, exact ages, correctness, captions, adverts/sponsors/end screen and mobile playback.
7. Archive removes content from the public display but retains its database record and audit fields. Restore as a draft and publish again after review as appropriate.
8. Only **individual YouTube video IDs**, not whole playlists, are supported in public player. No autoplay or external watch redirects are introduced.
9. The under-two pathway remains caregiver-only: age bands may be 3–5, 6–9, 10–12, 13–17, never 0–2.

## Staff workflow
Open Admin Dashboard → Kiddies TV Studio, or use the Kiddies TV Studio shortcut from the adult TV Studio.

To add: paste a valid YouTube watch or short link, add a title, original creator, learning objective, approved subject and appropriate age group(s). Save as Draft. The editor may open the video in a separate admin preview tab; this does not affect children's controlled player. After *actually* reviewing the full video and verifying playback, record reviewer name/date and check review confirmation, select Publish, then Save. The video becomes visible after a public refresh.

To update: find video in the library search, Edit, change title/subject/age/description, Save. To remove quickly: Unpublish or Archive. Older static videos are hidden by a Firestore config record; no source file deletion. Restoring an archived video returns it to Draft, requiring explicit republishing.

## Security and data flow
- The public reader uses Firestore REST with existing public Firebase client API key. API keys are not credentials. Firestore security rules allow only published video documents to be queried anonymously. The query explicitly filters status == published.
- An approved admin can get the full collection through Firebase Auth and perform transactional updates. The broader generic Firestore rule explicitly excludes the Kiddies TV collections so validation cannot be bypassed.
- Firestore publishes require status published, approved true, reviewConfirmed true and reviewer/date metadata. Non-admins cannot write anything. There is no hard delete.
- Public video URLs remain embedded using youtube-nocookie.com, with YouTube ads and external links outside SpeakOut control.

## Testing and limitations
- Security is exercised via Firebase Firestore emulator tests (anonymous, learner, admin, invalid review, archive).
- Browser tests simulate REST config, new published videos, hidden old content and Firestore outages.
- Mocked tests do not establish that real YouTube embeds, iOS fullscreen and captions work on a particular user's device.
- Production Firestore deployment, the live edit using a real admin profile, and production host smoke tests must be verified separately before calling the backend live.
- The existing source catalogue is a backup, not a second editorial backend; after activation, live hides and new records use Firestore.
