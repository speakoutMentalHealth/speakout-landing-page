# Education sections and class placement

`my-learning.html` is the signed-in, approved learner's entry point for courses and materials. It groups published, ready content into Kiddies Corner (Nursery and Primary), Secondary and Tertiary. These are demarcations, not access restrictions: a primary learner can browse and open a secondary course with its level clearly labelled. The school class or saved preference selects the initial view, while browsing another section never changes that default. The student dashboard and navigation link to it. The Materials entry point uses `#materials`.

| Section | Supported classes / levels |
| --- | --- |
| Kiddies Corner / Nursery | Nursery 1–3 |
| Kiddies Corner / Primary | Primary 1–6 |
| Secondary | JSS 1–3 and SS 1–3 |
| Tertiary | 100–600 Level; ND 1–2; HND 1–2; NCE 1–3; Postgraduate |

## Learner placement

- School-linked students start with the existing school-controlled `classLevel` or `level`. Aliases normalise to supported labels. Every student can browse any section and select a class filter or “All classes / levels”, even if the school has not yet recorded a supported class. Browsing does not update the school record.
- Approved independent students can optionally save a specific stage/class through “Save as my default” in their own `learningPreferences/{uid}`. “Browse learning” never writes a preference. Existing rules still reject cross-user, school-linked, unapproved or privilege-field writes.
- Parents, teachers and administrators can also browse without changing learner records or granting parent-child access.
- `kiddies.html` links to Nursery and Primary courses and materials via `my-learning.html?stage=nursery` / `?stage=primary`, with `#materials` for materials. These links override only the current view. Each card displays all its education stages, class metadata and course difficulty separately.
- Approval, school tenancy and provider enrolment requirements remain their existing policies. Education stage and class do not add enrolment restrictions.

## Content classification

Admin Courses and Admin Books expose education-section, class and subject fields. The shared parser validates them before saving:

```
educationStages: ["secondary", "tertiary"]
classLevels: ["SS 2", "100 Level"]
subject: "Digital Skills"
```

An empty class list means suitable across the selected education section(s), not curriculum alignment with every individual class. It must be a deliberate editorial decision. A specific class list narrows the selected class filter. Anyone can choose another class or all classes; it never limits eligibility to open or take a course. Malformed class labels fail closed. The public course metadata API preserves these fields.

Legacy audience labels `nursery`, `primary`, `secondary`, `university` and `tertiary` can supply a section if explicit `educationStages` are absent. `student`, `general`, role labels and difficulty (`beginner`, `intermediate`, `advanced`) do not identify a child's education stage. An explicit empty section list keeps the record unclassified, even if it has an old audience label. No bulk relabelling or publication occurs during deployment.

Only items that pass the existing publishing/content-readiness checks appear. Empty classes show a truthful notice. A catalogue download failure has a separate error state; it must not be presented as a lack of content. Class metadata expresses reviewed suitability, not a claim that a course is accredited, satisfies a Nigerian curriculum or is free of provider age/enrolment restrictions.

## Content work still required

The strongest existing catalogue coverage is secondary and tertiary. Nursery and primary require teacher-reviewed foundational material before those sections can be called complete. Prioritise original or properly licensed resources for early language/reading, numeracy, guided play and age-appropriate wellbeing; then primary English, mathematics and science. Do not relabel adult self-help, clinical material or advanced coding as nursery content simply to fill a section.

For secondary, map reviewed subjects and resources to JSS/SS classes. For tertiary, add programme/department and subject mappings with partner colleges before claiming programme-specific coverage; the current release supports level and subject discovery, not a complete degree catalogue. Confirm class suitability with pilot teachers, record source/rights and educational review, and then assign explicit section/class metadata through the admin builders.

## Verification

- Unit tests cover supported classes, aliases, conflicting placement, class filtering and publisher validation.
- Firestore emulator tests prove permitted independent preference writes and rejected cross-user, school-linked, unapproved and privilege-field writes.
- Browser checks use mocked Firebase to exercise preference restoration, save/error states, materials links, school defaults with unrestricted cross-level browsing and no record writes, unpublished/unclassified exclusion and responsive WCAG checks at four widths.
- The combined release gate remains the live staging check for approval, learning, schools, publishing and academic results. Actual new-page preference save/reopen and curriculum suitability on physical devices remain owner/teacher acceptance checks.

Deployment changes the frontend and Firestore rules. The metadata API field preservation also requires the Worker deployment triggered by its source change.

This clarification supersedes PR175’s disabled section selectors for school-linked learners. No additional rule or Worker change is needed.
