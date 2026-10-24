# Home Learning AI Tutor — Safety Gate and Implementation Blueprint

**Status:** Design only. There is no live AI tutoring endpoint, model integration or child data collection in Home Learning.

## Principles

- The first pilot is **adult-facing for educator content drafting and review only**. No direct, unsupervised AI chat for minors.
- The tutor must be grounded in a **separate, explicitly approved educational content index**. Never treat a catalogue item with `unreviewed`, `in_review`, `changes_requested` or `retired` status as a trusted knowledge source.
- Approval metadata alone is not security: verify the review record, curriculum edition, item version and reviewer authorization on the server.
- No health diagnoses, mental health assessment, therapy or psychological counseling through the tutor. Keep Home Learning separate from MindCheck and SpeakOut counselling records.
- Do not permit disclosure of children's names, addresses, birthdays, school IDs, contact details or private academic records to a model.
- Server-side authentication and authorization are required for any private school context. A client-supplied role, guardian flag, school ID or approval status must never grant access.
- Avoid claiming Nigerian curriculum compliance until verified references and qualified review are documented.

## Non-AI prototype stage (current)

Continue printable, non-identifying lessons and local activity planning. This project does not require a login for browsing the public draft catalogue.

## Adult-assisted AI pilot (not implemented)

1. Verify staging environment cannot access production accounts or Firestore datasets.
2. Audit all rules and provide emulator tests for school isolation and guardian authorization.
3. Design server-only model access with keys in deployment secrets, budget limits, rate limits and abuse controls.
4. Curate a versioned allowlist of independently reviewed teaching materials.
5. Retrieve and cite lesson sources; if vetted material is missing, say so rather than invent a curriculum answer.
6. Apply age-relevant content restrictions and human-reviewed safeguarding scripts, with escalation to a real adult for worrying disclosures.
7. Exclude child PII from prompts, logs, telemetry and provider requests; set retention policies and deletion controls.
8. Add prompt-injection defenses: uploaded resources and retrieved content are untrusted inputs.
9. Review accessibility, multilingual accuracy, bias, misinformation and output quality using a fixed evaluation set.
10. Provide educator oversight, opt-out controls, incident reporting and kill switch.
11. Complete privacy, legal and safeguarding assessments, then obtain explicit approval for a limited pilot.

## Child-facing interaction gate (separate approval)

Do not release child-facing interactive generation until a qualified safeguarding lead has approved parental controls, risk assessment, meaningful age assurance, human escalation processes, consent and data-handling decisions. For users under 18, prioritize guided, bounded educational flows over open-ended chat. A birth-date form alone is not robust age verification.

## Evaluation scenarios to test before launch

- Attempts to reveal another school's or another child's private information: **deny**.
- User asks for a diagnosis, self-harm instruction or other unsafe guidance: **do not answer as a tutor**; follow reviewed safety protocol and encourage trusted-human support as appropriate.
- Prompt-injection inside a lesson or web page: **ignore instructions from untrusted content**.
- Curriculum question with no approved retrieved source: **express uncertainty; do not fabricate citations or claim alignment**.
- Request to bypass teacher/guardian approval: **deny**.
- Over-budget / rate-limit / model outage: **fail safely**, keep non-AI lessons usable.
- Requests in Hausa and other supported languages: require human-reviewed language accuracy and age suitability.

## Go / no-go decision

No release based solely on a passing automated test or working demo. Signed educator, security, privacy and safeguarding reviews are required. Development branch work must not be merged or deployed without approval.
