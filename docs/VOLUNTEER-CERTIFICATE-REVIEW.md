# Volunteer certificate review — coordinator guide

**Scope:** manual, independently verified certificate references submitted by approved SpeakOut volunteers. This is not a training record import, PDF upload, or license verification.

## Volunteer journey

1. Sign up with the **Volunteer** role, await portal approval and sign in.
2. Save the volunteer profile (location, interests, availability, consent and safeguarding acknowledgement).
3. If an assessment was already passed, open **Existing training certificate** and enter the printed **MindCheck certificate ID**. Do not repeat the assessment while the reference is pending review.
4. The dashboard displays **Certificate submitted — awaiting verification**. Only a trusted administrator can change its review status.
5. If a certificate has no printed ID, contact the official SpeakOut coordinator privately instead of uploading personal documents through the general form.
6. If new to training, use the five-lesson MindCheck training and assessment link in the personalised next-step card.

## Administrator verification

1. Open **Volunteer applications**, then **Review submitted training certificate** for the specific volunteer. Never review a certificate sent through a public WhatsApp group.
2. Copy the reference; open the official [MindCheck certificate verification page](https://mindcheck.speakoutmentalhealth.org/verify.html) independently. Confirm the certificate is current and valid, identifies the same holder as the authenticated SpeakOut volunteer, is issued by the approved service, and represents the required volunteer assessment result.
3. If any detail is missing, contradictory, revoked, or unverifiable, **do not approve**; reject with a short generic reason, or seek manual verification from the issuer. Never trust a screenshot, printed ID alone, user-edited browser storage or a success message from an untrusted web page.
4. If independently verified and eligible, tick the attestation and select **Verify certificate and record assessment pass**. A single Firestore batch updates the certificate claim, the assessment status and a private in-app notification.
5. **Never** mark safeguarding as cleared or assign a volunteer based solely on an assessment certificate. Review fitness for the specific supervised role separately.
6. For rejected codes, a volunteer may submit a **different** printed reference. The same rejected code cannot be retried through the ordinary self-service flow.

## Current technical limits

- The MindCheck certificate service uses Google Apps Script. Its issuing-identity, revocation and server-side authentication guarantees require separate owner audit before secure automated verification.
- The new form stores a certificate **reference**, not the PDF or document itself. The one-record claim contains status, reviewer UID and review timestamp. It is **not yet** a tamper-resistant history of all previous review actions. Add a trusted audit ledger for full launch.
- In-app notifications work, but automatic email/WhatsApp delivery has not been implemented.
- Check staging rules, mobile browser and full release acceptance on PR #406 before deploying any production change.
- Account approval, assessment pass, safeguarding clearance and actual placement are intentionally distinct decisions.
