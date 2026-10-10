# Nursery and Primary starter pack — review edition

This is the first original, AI-assisted draft content pack for Kiddies Corner. It contains two substantial activity books and two deliberately incomplete course outlines. It does not populate the student catalogue automatically or establish official curriculum alignment.

| Draft | Contents | Technical state | Educational state |
| --- | --- | --- | --- |
| Nursery: Talk, Notice and Count | Six chapters: adult-supported learning, familiar words, conversation/turn-taking, small-group counting, sorting/patterns, pretend-shop practice | 3,103 chapter words; book readiness passes; status draft | Teacher, accessibility and rights review pending; Nursery 1–3 labels provisional |
| Primary: Read, Explain and Solve | Six chapters: learning routines, reading comprehension, sentences/questions, joining/separating groups, tens/ones, combined mini-project | 3,100 chapter words; book readiness passes; status draft | Teacher, accessibility and rights review pending; Primary 1–3 labels provisional |
| Nursery course outline | Six proposed sessions linked to the activity book, outcomes and facilitator prerequisites | Not a complete/publishable course; no graded assessments or certificates | Full course authoring and early-years pedagogy decision pending |
| Primary course outline | Six proposed sessions linked to the activity book, outcomes and facilitator prerequisites | Not a complete/publishable course; no graded assessments or certificates | Full course authoring and class mapping pending |

## Read, print and review

Open `kiddies-review.html`, choose the Nursery or Primary activity book, and print the selected book. Print styles retain the draft notice and remove navigation, controls and the course outline. The review page renders chapter paragraphs/headings as plain text; embedded scripts, images and event handlers cannot enter its DOM. It contains no child data collection, approval submission or claim that a human has approved the pack. The review copy is intentionally accessible for reading; it is not confidential content.

The Markdown sources are `content/kiddies/nursery-activities.md` and `content/kiddies/primary-activities.md`. Rebuild the JSON pack with:

```
node firestore-seed/build-kiddies-starter.mjs
```

The build is deterministic and makes no database writes. `firestore-seed/kiddies-starter-pack.json` is a review/import artifact, not a bundled fallback for My Learning. No existing pack is relabelled or published.

## Administrator draft import

Admin Courses and Admin Books link to the review copy and `admin-kiddies-review.html`. Only approved admin/super-admin roles can activate the import; existing Firestore administrator rules remain the server-side authority. The button creates four records as drafts in one Firestore transaction after validating the entire pack. Every existing starter ID stops the entire transaction, protecting teacher edits and already-published records. No merge overwrite, public status, assessments, certificates, source rights verification or curriculum approval is added.

The import is prepared in code, but deploying this page does not import records into production. An authorised administrator must actually use it. Browser tests mock Firebase; they do not prove that a production administrator clicked the button. A repeated import is intentionally refused. Maintain revisions through the normal editorial process or an explicitly reviewed migration; do not delete edited records to make this importer run again.

The existing admin builders can manually publish content after their readiness checks. This release does not add a new server-side human-review enforcement policy. Keep imported records in draft and record the teacher's decision before choosing public status. Passing a word threshold is not teacher approval.

## Pedagogy and full-course work

Nursery content is short, adult-led, optional and adaptable. The longer text belongs to the facilitator's explanations and activity planning, not a demand for a child to read a long screen. Materials avoid small loose counters and unnecessary purchases, allow home-language discussion and support non-written responses. Activities can be printed or copied before a session. They are supplementary educational activities, not clinical advice, developmental screening or accredited class completion.

The current internal-course threshold is 5,000 curriculum words and the guided player was built around lesson completion and graded assessments. Neither outline passes that threshold. Before turning the outlines into delivered early-years courses, agree a suitable lesson and observation model with teachers. Do not pad child activities or add graded quizzes merely to satisfy an older course template. Any change to publishing/assessment policy needs its own implementation and verification; this pack does not weaken those controls.

## Reference basis and limits

The activities and fictional stories were newly written for this pack; they do not reproduce a curriculum, textbook or third-party illustrations. AI-assisted authorship is disclosed and originality/rights checks remain pending. UNICEF's play-based-learning reference informs the general approach; its text and photographs are not copied. The NERDC portal is provided for a teacher to check current curriculum and class mapping, not as evidence that this pack is already aligned or endorsed.

- UNICEF: https://www.unicef.org/sites/default/files/2018-12/UNICEF-Lego-Foundation-Learning-through-Play.pdf
- NERDC: https://nerdc.gov.ng/content_manager/new_curriculum_home.html

## Teacher decision record — blank template

| Field | Reviewer entry |
| --- | --- |
| Pack version and book | |
| Reviewer name, role and institution | |
| Review date | |
| Proposed classes and subjects | |
| Current curriculum references checked | |
| Content/arithmetic/answer corrections | |
| Language and accessibility adjustments | |
| Materials and supervision checks | |
| Originality and source-rights checks | |
| Trial setting and consent arrangements | |
| De-identified observations and revisions | |
| Decision: revise / approve supplementary material / reject | |
| Remaining limits and next review date | |

Do not include identifiable child data in this repository or public review copy. Approval here would apply to a named version of supplementary material, not accreditation, a full curriculum or completion of the course outlines.

## Verification

Node tests check truthful draft status, book readiness, incomplete course status, certificate/assessment exclusion, class labels, full validation before database access, transaction write ordering and refusal to overwrite existing content. Browser checks exercise responsive/accessibility review at four widths, print presentation, safe rendering of injected markup, admin role configuration and draft-only/no-overwrite import using Firebase mocks. Existing combined staging checks cover approval, learners, school tenancy, publishing/rights and academic results. Physical-device printing, actual production draft import and teacher approval remain separate acceptance work.
