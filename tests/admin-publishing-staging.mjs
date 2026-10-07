import assert from "node:assert/strict";
import { createSign, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

const projectId = "speakout-portal-staging";
const apiKey = "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const workerBase = "https://speakout-platform-api-staging.speakout-platform-api.workers.dev";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;

if (!serviceAccountPath) throw new Error("FIREBASE_SERVICE_ACCOUNT_FILE is required.");

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
assert.equal(serviceAccount.project_id, projectId);

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `admin-publish-${suffix}@example.test`;
const password = `Stage-${randomBytes(18).toString("base64url")}!9a`;
const standardId = `uat-standard-${suffix}`;
const audiobookId = `uat-audiobook-${suffix}`;
const authUrl = operation => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${apiKey}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let adminToken = "";
let authUser = null;

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function serviceAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/datastore",
    iat: now,
    exp: now + 3500
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(serviceAccount.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const body = await response.json();
  assert.equal(response.ok, true, "service-account OAuth exchange failed");
  return body.access_token;
}

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key,item]) => [key,encode(item)])) } };
}

const fields = object => Object.fromEntries(Object.entries(object).map(([key,value]) => [key,encode(value)]));

async function firestore(path, { method = "GET", data } = {}) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    method,
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: data ? JSON.stringify({ fields: fields(data) }) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function signupAdmin() {
  const response = await fetch(authUrl("signUp"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = await response.json();
  assert.equal(response.ok, true, "staging admin signup failed");
  authUser = body;

  const seeded = await firestore(`users/${body.localId}`, {
    method: "PATCH",
    data: {
      uid: body.localId,
      email,
      fullName: "Publishing UAT Admin",
      role: "admin",
      status: "approved",
      approved: true
    }
  });
  assert.equal(seeded.response.ok, true, "staging admin profile seed failed");
  return body;
}

async function adminRequest(path, data) {
  const response = await fetch(`${workerBase}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${authUser.idToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(data)
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function publicTv() {
  const response = await fetch(`${workerBase}/v1/media/tv`);
  const body = await response.json();
  assert.equal(response.ok, true, "public TV bundle request failed");
  return body;
}

function hasEpisode(bundle, id) {
  return Array.isArray(bundle.episodes) && bundle.episodes.some(item => item.id === id);
}

const standardRecord = {
  title: `Student Opportunity Story ${suffix}`,
  show: "SpeakOut UAT",
  description: "A staging-only editorial item used to verify draft, publication, public visibility and removal from the SpeakOut TV catalogue.",
  presenter: "SpeakOut",
  guest: "",
  guestRole: "",
  tags: "students,education,opportunity",
  url: "https://www.youtube.com/watch?v=abcdefghijk",
  tiktokUrl: "",
  imageUrl: "https://example.com/speakout-uat-cover.jpg",
  format: "episode",
  status: "draft",
  featured: "no",
  homePlacement: "library_only",
  programmingDays: "all",
  placementPriority: "100",
  placementStart: "",
  placementEnd: "",
  contentPillar: "school",
  audience: "students",
  learningType: "standard",
  learningCategory: "",
  regionFocus: "",
  bookRights: "not_applicable",
  publishDate: "2026-10-07",
  scheduledAt: "",
  sponsor: "",
  consentConfirmed: "yes",
  minorInvolved: "no",
  editorialReview: "complete",
  order: 9999
};

const audiobookDraft = {
  title: `Complete Audiobook Public Domain UAT ${suffix}`,
  show: "Books & Audiobooks",
  description: "A staging-only full audiobook record used to prove that SpeakOut blocks public release until the source rights are explicitly verified.",
  presenter: "SpeakOut",
  guest: "",
  guestRole: "",
  tags: "audiobook,students,learning",
  url: "https://www.youtube.com/watch?v=lmnopqrstuv",
  tiktokUrl: "",
  imageUrl: "https://example.com/speakout-audiobook-uat.jpg",
  format: "episode",
  status: "draft",
  featured: "no",
  homePlacement: "library_only",
  programmingDays: "all",
  placementPriority: "100",
  placementStart: "",
  placementEnd: "",
  contentPillar: "motivation",
  audience: "students",
  learningType: "audiobook",
  learningCategory: "personal_development",
  regionFocus: "global",
  bookRights: "review_required",
  publishDate: "2026-10-07",
  scheduledAt: "",
  sponsor: "",
  consentConfirmed: "yes",
  minorInvolved: "no",
  editorialReview: "complete",
  order: 9998
};

adminToken = await serviceAccessToken();

try {
  await signupAdmin();

  const saveDraft = await adminRequest("/v1/admin/content/upsert", {
    collection: "tvEpisodes",
    id: standardId,
    record: standardRecord
  });
  assert.equal(saveDraft.response.ok, true, "standard TV draft could not be saved");

  let bundle = await publicTv();
  assert.equal(hasEpisode(bundle, standardId), false, "draft TV content leaked into the public catalogue");

  const publish = await adminRequest("/v1/admin/content/status", {
    collection: "tvEpisodes",
    id: standardId,
    status: "published"
  });
  assert.equal(publish.response.ok, true, "valid TV draft could not be published");

  bundle = await publicTv();
  assert.equal(hasEpisode(bundle, standardId), true, "published TV content did not appear publicly");

  const hide = await adminRequest("/v1/admin/content/status", {
    collection: "tvEpisodes",
    id: standardId,
    status: "hidden"
  });
  assert.equal(hide.response.ok, true, "published TV content could not be hidden");

  bundle = await publicTv();
  assert.equal(hasEpisode(bundle, standardId), false, "hidden TV content remained in the public catalogue");

  const saveAudiobook = await adminRequest("/v1/admin/content/upsert", {
    collection: "tvEpisodes",
    id: audiobookId,
    record: audiobookDraft
  });
  assert.equal(saveAudiobook.response.ok, true, "audiobook draft could not be saved");

  const blockedAudiobookPublish = await adminRequest("/v1/admin/content/status", {
    collection: "tvEpisodes",
    id: audiobookId,
    status: "published"
  });
  assert.equal(blockedAudiobookPublish.response.status, 409, "unverified audiobook rights did not block publication");
  assert.match(
    String(blockedAudiobookPublish.body?.error || blockedAudiobookPublish.body?.message || ""),
    /verified official, licensed or public-domain source/i
  );

  bundle = await publicTv();
  assert.equal(hasEpisode(bundle, audiobookId), false, "rights-blocked audiobook leaked publicly");

  const rightsVerified = await adminRequest("/v1/admin/content/upsert", {
    collection: "tvEpisodes",
    id: audiobookId,
    record: { ...audiobookDraft, bookRights: "public_domain" }
  });
  assert.equal(rightsVerified.response.ok, true, "verified audiobook rights could not be saved");

  const audiobookPublish = await adminRequest("/v1/admin/content/status", {
    collection: "tvEpisodes",
    id: audiobookId,
    status: "published"
  });
  assert.equal(audiobookPublish.response.ok, true, "rights-verified audiobook could not be published");

  bundle = await publicTv();
  const publicAudiobook = (bundle.episodes || []).find(item => item.id === audiobookId);
  assert.ok(publicAudiobook, "rights-verified audiobook did not appear publicly");
  assert.equal(publicAudiobook.learningType, "audiobook");
  assert.equal(publicAudiobook.bookRights, "public_domain");

  const hideAudiobook = await adminRequest("/v1/admin/content/status", {
    collection: "tvEpisodes",
    id: audiobookId,
    status: "hidden"
  });
  assert.equal(hideAudiobook.response.ok, true, "published audiobook could not be hidden");

  bundle = await publicTv();
  assert.equal(hasEpisode(bundle, audiobookId), false, "hidden audiobook remained public");

  for (const id of [standardId, audiobookId]) {
    const deleted = await adminRequest("/v1/admin/content/delete", {
      collection: "tvEpisodes",
      id
    });
    assert.equal(deleted.response.ok, true, `${id} could not be deleted`);
  }

  console.log(JSON.stringify({
    ok: true,
    draftNotPublic: true,
    publishPublic: true,
    hiddenRemovedFromPublic: true,
    audiobookRightsBlocked: true,
    audiobookVerifiedRightsPublished: true,
    audiobookHiddenRemovedFromPublic: true,
    recordsDeleted: true,
    standardId,
    audiobookId
  }, null, 2));
} finally {
  for (const id of [standardId, audiobookId]) {
    await firestore(`tvEpisodes/${id}`, { method: "DELETE" }).catch(() => null);
  }
  if (authUser?.localId) {
    await firestore(`users/${authUser.localId}`, { method: "DELETE" }).catch(() => null);
  }
  if (authUser?.idToken) {
    await fetch(authUrl("delete"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: authUser.idToken })
    }).catch(() => null);
  }
}
