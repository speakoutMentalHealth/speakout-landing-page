import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("volunteer dashboard renders accessible real-time notification inbox", () => {
  const html = read("volunteer-dashboard.html");
  const js = read("js/volunteer-inbox.js");
  assert.match(html, /id="notificationsCard"/);
  assert.match(html, /id="notificationList"/);
  assert.match(html, /id="notificationUnread"/);
  assert.match(html, /href="#notificationsCard"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(js, /onSnapshot\(/);
  assert.match(js, /orderBy\("createdAt", "desc"\)/);
  assert.match(js, /limit\(25\)/);
  assert.match(js, /readAt: serverTimestamp\(\)/);
  assert.match(js, /body\.textContent = message\.body/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
});

test("only authorized admin sends individual in-app messages, automatic status notifications are atomic", () => {
  const admin = read("js/admin-volunteers.js");
  assert.match(admin, /function notificationEditor\(/);
  assert.match(admin, /function newNotification\(/);
  assert.match(admin, /Send in-app notification/);
  assert.match(admin, /await addDoc\(notificationCollection\(uid\)/);
  assert.match(admin, /const batch = writeBatch\(db\)/);
  assert.match(admin, /batch\.set\(doc\(notificationCollection\(uid\)\)/);
  assert.match(admin, /await batch\.commit\(\)/);
  assert.match(admin, /actingAdminUid = user\.uid/);
  assert.match(admin, /mailto:/);
  assert.match(admin, /not automatically sent as email, WhatsApp or a phone push/);
});

test("Firestore rules explicitly exclude inbox from wildcard rules", () => {
  const rules = read("firebase/firestore.rules");
  assert.match(rules, /match \/volunteerNotifications\/\{volunteerId\}/);
  assert.match(rules, /match \/messages\/\{messageId\}/);
  assert.match(rules, /resource\.data\.readAt == null/);
  assert.match(rules, /request\.resource\.data\.readAt == request\.time/);
  assert.match(rules, /m\.senderUid == request\.auth\.uid/);
  assert.match(rules, /m\.recipientUid == volunteerId/);
  const wildcard = rules.split('match /{collection}/{document=**}')[1];
  assert.ok(wildcard, "recursive wildcard missing");
  assert.equal((wildcard.match(/collection != "volunteerNotifications"/g) || []).length, 4);
});

test("message content is not medical data and sending service never claims delivery of email or push", () => {
  const rules = read("firebase/firestore.rules");
  const messages = rules.slice(rules.indexOf('match /volunteerNotifications/{volunteerId}'), rules.indexOf('match /volunteerAssignments/{volunteerId}'));
  assert.match(messages, /"body"/);
  assert.match(messages, /m\.body\.size\(\) <= 450/);
  assert.doesNotMatch(messages, /medical|patientHistory|beneficiaryRecord/);
  const html = read("volunteer-dashboard.html");
  assert.match(html, /not a phone push notification or an automated email/);
});
