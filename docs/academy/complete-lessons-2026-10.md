# Academy complete lesson batch — 2026-10-12

## Release scope
Twelve new original lesson previews (15 native lessons including the three existing samples), seven subjects, six class levels, 60 new explained questions, 12 paper-based activities and facilitator guidance. This is a substantial first batch, not a complete Nigerian curriculum.

The existing subject discovery → subject materials → class filter → native lesson route is retained. Class keys now match JSS1/JSS 1 and SS1/SSS1. Lesson links back to materials preserve the subject and class. Failed catalogue requests are reported as unavailable rather than silently presented as empty.

## Evidence and rights
Every new lesson records a specific Federal Ministry of Education Inspire topic page and its class. Source topic/class listings were checked on 2026-10-12. These listings establish topic mapping only. No verified curriculum edition, term, week or detailed outcome reference is claimed; those fields remain explicitly unverified pending educator confirmation.

All narrative, examples, activities, questions and answer explanations were written originally for SpeakOut. No source lesson prose, worksheets, transcripts or video files were copied. Prices, survey counts, clubs and schools in examples are fictional.

YouTube oEmbed returned title, creator/channel and iframe metadata for the 11 unique candidate videos on 2026-10-12. Each lesson stores the exact verification URL and attribution. One introductory economics candidate found in search was rejected because oEmbed identified it as a monetary/fiscal-policy video; the correct introductory video is recorded instead. oEmbed availability is not proof of successful full playback, regional availability, captions, age suitability or pedagogical approval.

## Review and publication gate
All new lessons are public **review previews**, following the native draft model in PRs #287–#289. They remain informal practice with no formal marks or certificates. No teacher review or approval is invented.

Video rendering fails closed. It requires BOTH lesson and video approval records, each naming a reviewer, dated evidence URL and matching contentVersion, plus verified metadata, correct provider, validated ID and matching canonical watch URL. A reviewStatus string alone cannot unlock an embed. Approved videos load the privacy-enhanced player only after a learner clicks. Pending videos show attribution and an explicitly labelled source link for educator review; no iframe loads.

Before approval, follow the proposed [committee procedure](curriculum-review-committee-procedure.md): independently review the exact version, source mapping, accuracy, answer keys, safeguarding, accessibility, full video and captions; document any required school pilot and corrections. Approval for a supervised pilot does not equal release approval. Increment contentVersion after substantive changes and re-review both records. Approval evidence must refer to that version and identify the reviewer; do not put learner personal data in public records. Formal-course publication requires its own authorised release process; this batch does not add any formal course or certificate eligibility.

## Content inventory
| Class | Subject | Lesson | Official topic |
|---|---|---|---|
| Primary 2 | Mathematics | Equal shares: halves and quarters | [Fractions](https://inspire.education.gov.ng/lessons/2295/preview) |
| Primary 4 | Mathematics | A market receipt: adding money and checking change | [Money](https://inspire.education.gov.ng/lessons/5679/preview) |
| JSS 2 | Mathematics | Fractions, ratios and percentages in a school survey | [Fractions](https://inspire.education.gov.ng/lessons/214/preview) |
| JSS 1 | English Language | Main ideas and evidence: a school transport passage | [Reading for main and supporting ideas](https://inspire.education.gov.ng/lessons/736/preview) |
| JSS 1 | English Language | Follow written directions: setting up a class reading corner | [Reading to follow direction in written communication](https://inspire.education.gov.ng/lessons/823/preview) |
| JSS 1 | Agricultural Science | Plan a school garden: resources for production | [Factors of Agricultural Production](https://inspire.education.gov.ng/lessons/3804/preview) |
| SS 1 | Chemistry | Elements, compounds and mixtures in everyday materials | [Symbols, Formulae and Equations: Elements, compounds and mixtures (I)](https://inspire.education.gov.ng/lessons/9460/preview) |
| SS 1 | Chemistry | Choose a separation method: sand, salt and water | [Standard Separation Techniques for Mixtures](https://inspire.education.gov.ng/lessons/10341/preview) |
| SS 1 | Economics | Scarcity and choices in a school club | [Meaning of Economics and related concepts](https://inspire.education.gov.ng/lessons/10402/preview) |
| SS 1 | Economics | Opportunity cost: what is the next best alternative? | [Meaning of Economics and related concepts](https://inspire.education.gov.ng/lessons/10402/preview) |
| JSS 2 | Civic Education | Government roles: making, carrying out and interpreting laws | [Government](https://inspire.education.gov.ng/lessons/9698/preview) |
| JSS 3 | Basic Science | Trace a meal: digestion and absorption | [Digestive System](https://inspire.education.gov.ng/lessons/9668/preview) |

## Validation
The batch test is included automatically by npm test's phase*.test.mjs pattern. It validates counts, unique IDs, substantial reading, activities, answer indexes/explanations, mapping evidence, pending status, aliases, safe URLs, dual version-specific approval, lazy media loading and text-only rendering of injected markup. The existing Firebase account-sync module is unchanged; assessment, certificate and security-rule files are untouched. Full repository Node and Firestore emulator checks must pass on the PR head before merge.

## Educator acceptance checklist
- Confirm class, subject, exact curriculum edition and detailed outcomes, or retain explicit unmapped status.
- Read every worked example and independently solve all five questions.
- Try the paper activity and check its expected response and accessibility alternative.
- Watch the entire candidate on the target devices; check creator identity, relevance, language, captions, safeguarding, regional playback and embed permission.
- Record independent dated, version-specific decisions and required corrections.
- Recheck any changed content and video before approving; never equate automated CI with educator approval.
