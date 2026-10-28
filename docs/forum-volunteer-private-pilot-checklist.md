# SpeakOut Community — volunteer-only private pilot

**Audience:** existing SpeakOut volunteer WhatsApp group (approximately 30 adults). **Release policy:** signup can be public, but discussion rooms are invitation-only and unpublished until explicitly approved. A WhatsApp group membership or a MindCheck DOB selection is not proof of adult eligibility.

## Admin preparation

1. Open https://speakoutmentalhealth.org/admin-forum.html while signed in as an approved portal administrator. Create a room with **ID** `adult-pilot`, **visibility** `private`, **status** `open`, **published** `false`. Do not publish the room before activating the gate.
2. Volunteers go through https://speakoutmentalhealth.org/forum.html → **Sign up** and await individual account approval. Approved volunteers sign in via https://speakoutmentalhealth.org/auth.html?next=forum#login.
3. Use the portal's existing **admin-users.html** to review pending portal accounts against your existing verified volunteer roster. Do not approve accounts just because they joined a WhatsApp group; confirm identity, age 18+ and approval under SpeakOut's actual process.
4. Open https://speakoutmentalhealth.org/admin-forum-access.html. For each approved user, enter the exact Firebase UID, verify eligibility, set **Approved adult access**, and add `adult-pilot` to **Private rooms**. Assign a *moderator* role and `adult-pilot` to **Moderator-assigned rooms** for at least one verified moderator. Establish a second qualified moderator/backup independently.
5. Document the named moderator and backup, review hours, report-handling process, 24-hour safety escalation/referral, emergency shutdown owner, privacy notice and content moderation expectations. This forum is not a crisis service.
6. Production index readiness and a successful separate Firebase staging acceptance must be confirmed before any public volunteer post.

## Enable the trusted pilot gate

1. On GitHub, navigate to **Actions → Forum Production Private Pilot Control → Run workflow** on main.
2. Select `enable`, enter room `adult-pilot`, the real responsible admin's **Firebase UID** as `actor_uid`, `24` for `hours`, and a factual audit reason without personal data. Enter the exact safeguard confirmation string only after independently checking the adult member roster, moderator, backup and escalation coverage.
3. The trusted script refuses activation if the room does not exist, is not private/open, lacks an approved verified member or has no assigned approved moderator. It also refuses an already-active gate. An authorized service account must have Firestore access.
4. **Only after the workflow succeeds**, sign in to **admin-forum.html** and explicitly **publish** the named private room; publication writes a separate immutable audit. The 24-hour gate auto-expires, but the room should also be explicitly unpublished at the end.
5. Test with one approved assigned adult, one approved unassigned adult, one nonapproved profile and an anonymous browser. Verify approved members can submit pending topics/replies, assigned moderators can review/approve/report/lock, and unauthorized users cannot read the private room.
6. If an issue appears, **unpublish** and/or lock the room immediately. The same workflow with `action=disable` revokes the trusted gate. Review logs and keep the pilot restricted while investigating.

## WhatsApp pilot rollout

First invite 5–10 existing verified adults to test account application, approval and first post. After the real user journey and moderation are validated, invite the remaining volunteers. Provide the official SpeakOut link only. Never solicit ID photos, birth dates, assessment results or passwords in the WhatsApp group or forum discussions.

Draft group invitation (send only after room activation and successful first-member test):

> We're inviting our SpeakOut volunteers to test the new **SpeakOut Community** — a private, moderated space to connect, learn, share ideas and support our outreach work. To join, open https://speakoutmentalhealth.org/forum.html, select **Sign up**, and submit your account application. Our team will review and approve verified adult volunteers individually. Once approved, sign in with your own details. Private discussions will appear after you are assigned to the volunteer pilot room. Please share any issues with the volunteer coordinators privately; do not post personal health information.

**Do not describe the pilot as fully live until the gate, first private room, moderator and end-to-end production tests have passed.**
