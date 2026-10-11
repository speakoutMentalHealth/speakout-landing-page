# SpeakOut Academy — partner content review register

**Status:** Internal editorial workflow. This register is not a statement of approval, a rights licence, or curriculum certification.

## Required workflow

1. **Discover** a specific lesson-level asset on Inspire, Ignite or eLearn. Record the exact source page and the asset URL, its title, grade, subject, topic, format and publisher. Do not use a portal homepage as an asset URL.
2. **Verify** the source actually opens and the material matches the target learning outcome. Capture the date, reviewer, source identifier, and evidence of the lesson's content.
3. **Rights review:** Confirm whether SpeakOut may embed, copy, host, download, adapt or redistribute the material. These are distinct permissions. Record documentary evidence and any attribution requirements. A partnership claim alone is insufficient.
4. **Curriculum review:** Have a qualified educator map the resource to class, subject, topic, objective, language, accessibility and appropriate age; record review decision and date. Do not label anything NERDC-approved unless evidence explicitly supports that claim.
5. **Integrate:** Pair learner media (Inspire), facilitator guidance (Ignite), and curriculum/topic support (eLearn) where specific verified assets exist. Write original teaching transitions, worked examples, 10–15 validated questions with explanations and an offline alternative.
6. **Publish:** Only after asset-specific technical, rights, safety, accessibility and educator checks are complete. Otherwise retain the lesson in draft and show original content only.

## Source roles (to be verified asset by asset)

| Source | Discovery portal | Intended role | Default status |
|---|---|---|---|
| Inspire | https://inspire.education.gov.ng/ | Learner-facing video, audio, reading | Not cleared |
| Ignite | https://ignite.education.gov.ng/ | Teacher/facilitator planning and methods | Not cleared |
| eLearn | https://elearn.education.gov.ng/ | Curriculum topic and learning support | Not cleared |

## Per-asset record (copy for each asset)

```json
{
  "source": "inspire | ignite | elearn",
  "sourcePageUrl": null,
  "assetUrl": null,
  "assetTitle": null,
  "publisher": null,
  "grade": null,
  "subject": null,
  "topic": null,
  "objective": null,
  "format": null,
  "accessibilityNotes": null,
  "rightsEvidenceUrl": null,
  "allowedUses": [],
  "attribution": null,
  "curriculumEvidenceUrl": null,
  "technicalVerifiedAt": null,
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewStatus": "discovered",
  "publicationStatus": "unpublished"
}
```

## Release gate

Reject any record with missing source page, missing verifiable asset, absent rights evidence for its intended use, unreviewed curriculum mapping, or inaccessible/unsafe media. Do not bypass this gate to fill a lesson with generic portal links.

## First editorial queue

- Primary 1 English: Ada and Her Red Bag — identify a compatible phonics/reading resource on Inspire, literacy facilitator guidance on Ignite and a relevant eLearn topic; validate exact class and learning objective.
- Primary 1 Mathematics: counting, addition and subtraction — identify matching learner demonstrations, facilitator strategy and curriculum topic.
- Primary 2–6 English: review each original story and question bank before connecting verified resources.
- Primary 1–6 Mathematics: check each calculation, difficulty, question feedback and outcome map before release.

**Current release status:** Existing original sample lessons and practice remain development previews. No external media is represented as approved or imported.
