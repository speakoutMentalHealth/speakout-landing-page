# SpeakOut Content Seeding Pack

Seed these into Firestore collections:
- books
- courses
- announcements
- events
- media

Minimum before FAMSA review:
- 6 books
- 6 courses
- 2 announcements
- 3 events
- 3 media records

Do not copy copyrighted external books into the platform unless permission is granted.

## Publication standard

Public pages use `js/content-visibility.js` as the single readiness gate:

- Internal courses: at least 5,000 meaningful curriculum words, complete titled modules and lessons, and `active` or `published` status.
- External courses: at least 75 words of original editorial context, a named provider, a valid provider URL, and `active` or `published` status. Provider-hosted lesson text is not copied.
- Books and guides: at least 2,500 meaningful content words, three or more titled chapters, an author, a safe cover image, a readable body or destination, and `active` or `published` status.

Metadata keys and HTML tags do not count toward the word threshold. Incomplete records remain in Firestore for editorial work but are excluded from public catalogues, audience libraries, details, readers, and players.

## Audience guide pack

`firestore-seed/audience-guides.json` contains the current publishable student, teacher, and parent/caregiver guides. Rebuild it after editing source lessons with:

```powershell
node firestore-seed\build-audience-guides.mjs
```

Import the three resulting records into the `books` collection using their `id` values as document IDs. The generated cover assets live in `images/learning-covers/`.
