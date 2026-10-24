# Home Learning: Curriculum Review and Release Gate

Status: development policy draft. Applies to every SpeakOut-produced nursery, primary, secondary and tertiary learning resource.

## Required review record

For each resource, record:
- Unique resource ID, target age/class, subject, learning objective, author and version.
- Authoritative curriculum title, issuing authority, edition/year, exact strand/topic or learning outcome and source URL/page (where applicable).
- Content accuracy, age appropriateness, cultural and language accessibility, learning accessibility, answer-key accuracy and any necessary safeguarding notes.
- Copyright/licensing and permission for any third-party text, illustrations or exercises.
- Qualified educator reviewer name, relevant credentials, review date and documented outcome.
- Any outstanding corrections, approval date and next review due date.

## Status transitions

1. `unreviewed`: initial author draft. Always show preview notice.
2. `in_review`: assigned educator is checking the content. Never label approved.
3. `changes_requested`: author must address issues; review again.
4. `approved`: only after documented qualified educator sign-off, source verification and safeguarding/accessibility checks.
5. `retired`: removed from discovery if superseded, incorrect or unsafe.

Never infer approval from publication on GitHub, a successful build or use by a school. Do not use `approved` without a recorded reviewer and `reviewed_at` date. Where curriculum reference is unavailable, mark the item supplementary and leave the reference null.

## Release checklist

- [ ] Confirm all internal links and JSON catalogue paths resolve.
- [ ] Confirm topic filters and search work with keyboard and on narrow mobile screens.
- [ ] Confirm print layouts and answer keys, including numerical answers.
- [ ] Confirm child-data privacy: no names, analytics identifiers or progress uploads without an approved privacy design.
- [ ] Confirm no external resource is presented as owned or accredited by SpeakOut.
- [ ] Confirm all preview resources have visible unreviewed labels.
- [ ] Complete educator review and curriculum mapping before describing lessons as aligned or approved.
- [ ] Pilot with consenting adult supervision and collect non-identifying usability feedback.
- [ ] Obtain explicit approval before merging/deploying to production.

## AI learning assistant gate

Do not activate a child-facing AI tutor until vetted content retrieval, parental controls, age-appropriate responses, moderation, human escalation, abuse protection, cost controls and privacy assessments are documented and tested. The initial AI pilot must not invent accreditation, diagnose conditions or collect children's sensitive information.
