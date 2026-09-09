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

## Priority library expansion

`firestore-seed/priority-library-books.json` upgrades twenty existing placeholder document IDs with full publications:

- Mental Health Foundations Handbook
- Anxiety Management Workbook
- Career Planning and Readiness Handbook
- Practical Personal Finance Workbook
- Digital Safety and Cybersecurity Handbook
- Depression Awareness and Support Guide
- Practical Stress Management Workbook
- Psychological First Aid Field Guide
- Leadership Foundations Handbook
- Conflict Resolution Practice Guide
- Student Leadership Practice Handbook
- Community Leadership Field Guide
- Team Leadership and Performance Handbook
- Computer Basics Practical Guide
- Microsoft Excel Applied Workbook
- Microsoft Word Practical Workbook
- Canva Design and Visual Communication Workbook
- Budgeting and Cash-Flow Workbook
- Saving and Emergency Planning Guide
- Debt Management and Credit Guide

Each record contains four to six chapters and at least 5,000 meaningful content words. Rebuild the pack after editing its source courses with:

```powershell
node firestore-seed\build-priority-library.mjs
```

Import these records with merge semantics into the `books` collection. Because their IDs match existing placeholders, they replace those thin entries without creating duplicate catalogue cards.

## Priority course expansion

`firestore-seed/priority-courses.json` upgrades fifteen incomplete course IDs:

- Six internal courses with six complete modules, eighteen lessons, final assessments, cover art and 9,800–11,500 curriculum words each.
- Nine provider-hosted courses with verified destinations and at least 75 words of original SpeakHub editorial guidance. Provider-owned lessons are not copied.

Rebuild the pack after editing source curricula with:

```powershell
node firestore-seed\build-priority-courses.mjs
```

Import the records with merge semantics into the `courses` collection. The Admin Courses page validates every record with the shared readiness gate before writing, so incomplete courses cannot be published through the pack importer.
