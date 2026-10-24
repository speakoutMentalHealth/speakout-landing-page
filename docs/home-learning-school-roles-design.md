# Home Learning: School Accounts and Permissions — Technical Design

**Status:** Proposal only; no authentication, student records or backend access are enabled by this document.

## Roles and minimum permissions

| Role | May do | Must not do |
|---|---|---|
| Visitor | View publicly published resources | Access private dashboards |
| Parent/caregiver | Manage own account, consent settings, linked child's learning plan | Access unrelated children or school rosters |
| Teacher | View assigned classes and approved learning resources; manage assigned lesson plans | Access unassigned classes, medical data or counseling records |
| School administrator | Manage own school's staff, class assignments and approved enrolments | Access other schools or private wellbeing records |
| Content editor | Draft and submit educational content | Self-approve content without independent review |
| Qualified educator reviewer | Review curriculum mapping and sign off assigned content | Override system-wide access rules |
| Platform administrator | Manage platform configuration and audit logs | Read sensitive child information without documented necessity |

## Architecture

- Use existing authenticated infrastructure only after its security and data model have been audited.
- Enforce authorization server-side on every request; never rely on hidden buttons or client-side role flags.
- Store school membership and class assignments with tenant isolation.
- Separate educational activity records from MindCheck wellbeing, counseling, assessment and anonymous-reporting data.
- Use adult-controlled child profiles, age-appropriate consent and a data minimization policy.
- Do not collect child names, birthdays or sensitive information in the public preview pages.
- Implement explicit access revocation, deletion requests, retention limits and audit logging.
- Verify relevant Nigeria data protection and child-safeguarding obligations with appropriate professionals before rollout.

## Proposed data entities (not yet created)

- schools: id, name, status
- school_memberships: school_id, adult_user_id, role, status
- classes: id, school_id, label, academic_year
- class_teachers: class_id, teacher_user_id
- learner_profiles: id, guardian_user_id, display_alias, stage, consent_status
- learner_enrolments: learner_id, class_id, status
- learning_assignments: id, class_id, resource_id, due_date
- learning_progress: learner_id, resource_id, completion_status, updated_at
- content_reviews: resource_id, reviewer_user_id, review_status, curriculum_source, reviewed_at
- access_audit: actor_user_id, action, target_type, target_id, timestamp

These fields are conceptual and must be refined through a threat model, privacy review and integration audit before any migration.

## Release gates

1. Audit current login, database, hosting and school enrolment flows.
2. Confirm school-tenant isolation and test attempts to access another school's resources.
3. Verify guardian ownership before linking a child profile.
4. Add accessible invitation and permission-revocation flows.
5. Run automated authorization tests for every role.
6. Conduct privacy, security and safeguarding review before a limited school pilot.
7. Obtain explicit approval before production deployment.

## Pilot approach

Start with a consenting partner school and adult-only teacher accounts. Use synthetic learner profiles until the security and privacy review is complete. Do not upload real student data to the development branch or public repository.
