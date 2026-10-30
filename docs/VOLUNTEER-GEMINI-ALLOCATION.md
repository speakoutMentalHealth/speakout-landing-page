# Gemini-assisted volunteer coordinator allocation — release guide

## Workflow

1. Administrator opens Volunteer Management → **Coordinator directory and available capacity**. Register actual supervisors with their approved work email, expertise, state, availability, supervision modes and maximum volunteers.
2. Set **Already assigned outside this system** correctly for each coordinator. This is the initial baseline load from the existing manual process, and must be reconciled whenever that process is used.
3. Open the applicant's **Gemini proposed role and coordinator** panel. Generate a recommendation. This saves **a pending draft only**; no role or supervision access is granted.
4. The allocator filters strictly by coordinator active status, capacity, overlapping focus area, availability, mode and state for in-person/hybrid work. It ranks by *utilisation* (baseline + allocations divided by capacity). Gemini only chooses between equally ranked, eligible coordinators.
5. Gemini receives only application categories and pseudonymous coordinator IDs, **not** volunteer names, emails, free-text experience, case details or coordinator contact information. It returns an assignment role, nonclinical scope, reporting instructions and a coordinator ID validated against the shortlist.
6. Administrator reads the completed draft and selects **Approve and publish** or **Request revision**. Approval is permitted only when the source application is independently assessed as passed, safeguarding cleared, and eligibility verified.
7. The server-side Firestore transaction rechecks the coordinator's available capacity and the volunteer's status, creates the assignment, increments the coordinator's allocated workload, updates the volunteer's stage, stores an audit record, and sends a private in-app notification.
8. If no coordinator is suitable, the volunteer remains unassigned. A previous draft is never an entitlement to placement.

## Activation requirements

- Configure \`GEMINI_API_KEY\` as a **Cloudflare Worker secret** for the SpeakOut Platform API. Never put the key in GitHub source code, client JavaScript, a web form, or a volunteer document.
- Optional \`VOLUNTEER_GEMINI_MODEL\` defaults to \`gemini-2.5-flash\`. Confirm the allowed model under the actual AI Studio project and current quotas.
- Confirm the privacy notice explains that **non-identifying categories only** are used for generating suggested roles, including a lawful data-processing basis.
- Verify the full integration using **synthetic coordinators and accounts in staging** and the signed-in administrator browser, with no real beneficiary information.
- The automated system does not issue credentials, verify past MindCheck certificates, clear safeguarding, grant forum access or directly contact beneficiaries.
- The existing manual coordinator assignment form is a **legacy path** that does not increment the AI allocator's counter; update each coordinator's baseline load to include those assignments or migrate manual assignments before the allocation tool is used at scale.
- The pilot supports up to 100 directory entries in a single query; deliberately stops if truncated. Build pagination and a reconciliation migration before expanding beyond that limit.
- No real coordinator records or Gemini secret are supplied in this change. **It is not a live Gemini integration until the secret is securely configured, staging verified, and production deployments pass**.

## Tests and operating checks

- Unit: two coordinators × ten eligible volunteers should result in 5:5 allocation, and unequal capacities should balance by utilisation.
- Reject full, paused, mismatched expertise/availability/region and any Gemini-selected ID outside the eligible shortlist.
- Cross-account Firestore reads/writes to coordinator directory, pending AI drafts and audit logs are denied; only authenticated server-side actions can mutate these.
- Approve requires independent pass and safeguarding clearance; capacity and previous assignment are rechecked *inside one transaction* before every publication.
- Test simultaneous administrator approvals for the last coordinator slot, stale drafts, expired drafts, unavailable provider, missing secret, invalid JSON, and account revocation.
- Confirm private inbox delivery and all mobile/desktop UX states, including a human request for revision.

## Explicit limits

This is an admin-assisted draft/publish pilot. It is not unsupervised automated safeguarding or clinical volunteer assignment. Notification is **in-app**, not phone push, email or WhatsApp. The coordinator's directory record is an operational profile and is kept separate from SpeakOut's other projects.
