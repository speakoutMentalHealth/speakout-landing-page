import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { curatorSourceInput, fetchYouTubeUploads, fetchYouTubeVideosByIds, resolveYouTubeChannel } from "./tv-curator.js";

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...headers }
});

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "vary": "Origin"
  } : {};
}

const clean = value => String(value || "").trim();
const normalized = value => clean(value).toLowerCase();
const looksLikeEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(clean(value));
function humanName(profile = {}) {
  const candidates = [
    profile.fullName,
    `${clean(profile.firstName)} ${clean(profile.lastName)}`.trim(),
    profile.displayName,
    profile.name
  ].map(clean);
  return candidates.find(value => value && !looksLikeEmail(value)) || "Learner";
}

const publicCourseStatus = course => ["active", "published"].includes(normalized(course?.status));
const publicWebUrl = value => {
  try {
    const url = new URL(clean(value));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};
const textWords = value => {
  const text = Array.isArray(value)
    ? value.map(textWords).join(" ")
    : value && typeof value === "object"
      ? Object.values(value).map(textWords).join(" ")
      : typeof value === "string" ? value.replace(/<[^>]*>/gu, " ") : "";
  return text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length || 0;
};

function courseIsCatalogueReady(course = {}) {
  if (!publicCourseStatus(course) || !clean(course.title) || !clean(course.category)) return false;
  const type = normalized(course.courseType || course.type || "internal");
  const external = type === "external" || normalized(course.completionMethod) === "certificate-upload" || course.externalProvider === true;
  if (external) {
    const hasDestination = [course.externalUrl, course.courseUrl, course.providerCourseUrl].some(publicWebUrl);
    return Boolean(clean(course.provider) && hasDestination && textWords([
      course.title, course.shortDescription, course.description, course.outcomes, course.prerequisites, course.tags
    ]) >= 75);
  }
  if (type === "instructor-led") {
    return [course.enrollmentUrl, course.contactUrl].some(publicWebUrl) &&
      textWords([course.description, course.shortDescription, course.outcomes, course.prerequisites]) >= 75;
  }
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const completeModules = modules.length > 0 && modules.every(module =>
    clean(module?.title) && Array.isArray(module.lessons) && module.lessons.length > 0 &&
    module.lessons.every(lesson => clean(lesson?.title) && [lesson.content, lesson.videoUrl, lesson.audioUrl, lesson.resourceUrl].some(clean))
  );
  return completeModules && textWords([
    course.description, course.shortDescription, course.outcomes, course.prerequisites, modules, course.finalAssessment
  ]) >= 5000;
}

function publicCourseMetadata(course = {}) {
  const fields = [
    "id", "title", "courseType", "provider", "providerLogo", "category", "audience", "difficulty", "duration",
    "description", "status", "featured", "free", "certificateEligible", "completionMethod", "slug", "instructor",
    "level", "accessType", "coverUrl", "shortDescription", "fullDescription", "outcomes", "prerequisites", "tags",
    "lessonCount", "minimumCompletion", "minimumScore", "instructionalStandard", "instructionalStructure", "externalProvider",
    "externalUrl", "courseUrl", "providerCourseUrl", "providerUrl", "url", "enrollmentUrl", "contactUrl"
  ];
  const result = Object.fromEntries(fields.filter(field => course[field] !== undefined).map(field => [field, course[field]]));
  if (course.certificate && typeof course.certificate === "object") {
    result.certificate = {
      available: course.certificate.available === true,
      issuer: clean(course.certificate.issuer),
      verificationRequired: course.certificate.verificationRequired === true,
      uploadRequired: course.certificate.uploadRequired === true
    };
  }
  if (Array.isArray(course.modules)) {
    result.modules = course.modules.map((module, index) => ({
      id: clean(module?.id) || `${clean(course.id)}-module-${index + 1}`,
      title: clean(module?.title) || `Module ${index + 1}`,
      description: clean(module?.description),
      lessonCount: Array.isArray(module?.lessons) ? module.lessons.length : Number(module?.lessonCount || 0)
    }));
  }
  return result;
}
function safeId(value, label = "identifier") {
  const id = clean(value);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw Object.assign(new Error(`Invalid ${label}.`), { status: 400 });
  return id;
}

const CMS_COLLECTION_FIELDS = Object.freeze({
  homepageStats: ["title", "description", "value", "suffix", "category"],
  homepageMedia: ["title", "description", "type", "url", "imageUrl"],
  homepagePartners: ["title", "description", "logoUrl", "websiteUrl", "category"],
  homepagePodcasts: ["title", "description", "audioUrl", "category", "imageUrl"],
  homepageReports: ["title", "description", "url", "category", "imageUrl"],
  homepageVideos: ["title", "description", "youtubeUrl", "thumbnailUrl", "category"],
  tvEpisodes: ["title", "show", "description", "presenter", "guest", "guestRole", "tags", "url", "imageUrl", "format", "featured", "homePlacement", "programmingDays", "placementPriority", "placementStart", "placementEnd", "contentPillar", "audience", "publishDate", "scheduledAt", "sponsor", "consentConfirmed", "minorInvolved", "editorialReview"],
  tvAudio: ["title", "audioType", "description", "url", "imageUrl", "publishDate"],
  tvShows: ["title", "slug", "description", "host", "imageUrl", "category"]
});

function cmsCollection(value) {
  const collectionName = clean(value);
  if (!Object.hasOwn(CMS_COLLECTION_FIELDS, collectionName)) {
    throw Object.assign(new Error("Unsupported content collection."), { status: 400 });
  }
  return collectionName;
}

function validatePublicTvShow(record = {}) {
  const slug = clean(record.slug).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw Object.assign(new Error("Published TV series requires a valid lowercase URL slug."), { status: 409 });
  }
  if (clean(record.title).length < 3) {
    throw Object.assign(new Error("Published TV series requires a clear title."), { status: 409 });
  }
  if (clean(record.category).length < 2) {
    throw Object.assign(new Error("Published TV series requires a category."), { status: 409 });
  }
  if (clean(record.description).length < 40) {
    throw Object.assign(new Error("Published TV series requires a useful description of at least 40 characters."), { status: 409 });
  }
  if (!publicWebUrl(record.imageUrl)) {
    throw Object.assign(new Error("Published TV series requires a valid artwork URL."), { status: 409 });
  }
}

function cmsRecord(collectionName, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Invalid content record."), { status: 400 });
  }
  const record = {};
  for (const field of CMS_COLLECTION_FIELDS[collectionName]) {
    const value = clean(input[field]);
    if (value.length > 2000) throw Object.assign(new Error(`${field} is too long.`), { status: 400 });
    record[field] = value;
  }
  if (!record.title) throw Object.assign(new Error("Title is required."), { status: 400 });
  const status = normalized(input.status) || "active";
  if (!["active", "published", "draft", "hidden"].includes(status)) {
    throw Object.assign(new Error("Invalid content status."), { status: 400 });
  }
  const order = Number(input.order || 0);
  if (!Number.isFinite(order) || !Number.isInteger(order) || Math.abs(order) > 100000) {
    throw Object.assign(new Error("Invalid content order."), { status: 400 });
  }
  if (collectionName === "tvEpisodes") {
    const format = normalized(record.format || "episode");
    if (!["episode", "live", "short"].includes(format)) {
      throw Object.assign(new Error("Invalid TV content type."), { status: 400 });
    }
    try {
      const mediaUrl = new URL(record.url);
      const host = mediaUrl.hostname.replace(/^www\./u, "").toLowerCase();
      const allowed = host === "youtu.be" || ["youtube.com", "m.youtube.com", "music.youtube.com", "vimeo.com", "player.vimeo.com", "twitch.tv"].includes(host);
      if (!["http:", "https:"].includes(mediaUrl.protocol) || !allowed) throw new Error();
    } catch {
      throw Object.assign(new Error("Use a supported YouTube, Vimeo or Twitch URL."), { status: 400 });
    }
    const homePlacement = normalized(record.homePlacement || "auto");
    if (!["auto", "featured", "daily", "library_only"].includes(homePlacement)) {
      throw Object.assign(new Error("Invalid TV homepage placement."), { status: 400 });
    }
    record.homePlacement = homePlacement;
    const contentPillar = normalized(record.contentPillar || "general");
    if (!["general", "youth", "school", "adhd", "relationships", "motivation", "stories", "community", "advocacy"].includes(contentPillar)) {
      throw Object.assign(new Error("Invalid TV content pillar."), { status: 400 });
    }
    record.contentPillar = contentPillar;
    const audience = normalized(record.audience || "youth");
    if (!["youth", "students", "everyone", "parents", "educators"].includes(audience)) {
      throw Object.assign(new Error("Invalid TV audience."), { status: 400 });
    }
    record.audience = audience;

    const programmingDays = normalized(record.programmingDays || "all");
    if (!["all", "weekdays", "weekend", "mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(programmingDays)) {
      throw Object.assign(new Error("Invalid TV programming day pattern."), { status: 400 });
    }
    record.programmingDays = programmingDays;

    const placementPriority = Number(record.placementPriority || 100);
    if (!Number.isFinite(placementPriority) || !Number.isInteger(placementPriority) || placementPriority < 0 || placementPriority > 999) {
      throw Object.assign(new Error("TV placement priority must be a whole number from 0 to 999."), { status: 400 });
    }
    record.placementPriority = placementPriority;

    const placementDate = (value, label) => {
      const raw = clean(value);
      if (!raw) return "";
      const parsed = /^\d{4}-\d{2}-\d{2}$/u.test(raw) ? new Date(raw+"T00:00:00Z") : null;
      if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
        throw Object.assign(new Error(`Invalid TV ${label} date.`), { status: 400 });
      }
      return raw;
    };
    record.placementStart = placementDate(record.placementStart, "placement start");
    record.placementEnd = placementDate(record.placementEnd, "placement end");
    if (record.placementStart && record.placementEnd && record.placementEnd < record.placementStart) {
      throw Object.assign(new Error("TV placement end date cannot be before the start date."), { status: 400 });
    }
    const publicTvStatus = ["active", "published"].includes(status);
    if (publicTvStatus) {
      if (record.title.trim().length < 8) {
        throw Object.assign(new Error("Published TV content requires a clear title of at least 8 characters."), { status: 409 });
      }
      if (record.description.trim().length < 50) {
        throw Object.assign(new Error("Published TV content requires a useful description of at least 50 characters."), { status: 409 });
      }
      const tagCount = record.tags.split(",").map(value => value.trim()).filter(Boolean).length;
      if (tagCount < 2) {
        throw Object.assign(new Error("Published TV content requires at least two discovery tags."), { status: 409 });
      }
      try {
        const artworkUrl = new URL(record.imageUrl);
        if (!["http:", "https:"].includes(artworkUrl.protocol)) throw new Error();
      } catch {
        throw Object.assign(new Error("Published TV content requires a valid artwork URL."), { status: 409 });
      }
      if (format === "live" && ["featured", "daily"].includes(homePlacement)) {
        throw Object.assign(new Error("Live broadcasts use the Live channel and cannot use Main Stage or Today’s Focus placement."), { status: 409 });
      }
    }
    if (publicTvStatus && normalized(record.editorialReview) !== "complete") {
      throw Object.assign(new Error("Published TV content requires completed editorial review."), { status: 409 });
    }
    if (publicTvStatus && normalized(record.minorInvolved) === "yes" &&
        normalized(record.consentConfirmed) !== "yes") {
      throw Object.assign(new Error("Published content involving a minor requires confirmed consent."), { status: 409 });
    }
  }
  if (collectionName === "tvAudio" && record.url) {
    try {
      const mediaUrl = new URL(record.url);
      if (!["http:", "https:"].includes(mediaUrl.protocol)) throw new Error();
    } catch {
      throw Object.assign(new Error("Use a valid audio or Spotify URL."), { status: 400 });
    }
  }
  if (collectionName === "tvShows") {
    record.slug = clean(record.slug).toLowerCase();
    if (["active", "published"].includes(status)) validatePublicTvShow(record);
  }
  return { ...record, status, order };
}

async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha1Base64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function deterministicVerificationCode(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map(byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function toFirestore(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestore(v)])) } };
}

function fromFirestore(value) {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestore);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestore(value)]));
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestore(value)]));
}

async function firebaseAccessToken(env) {
  const cached = await env.TOKEN_CACHE?.get("firebase-access-token", "json");
  if (cached?.token) return cached.token;
  const key = await importPKCS8(String(env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3500).sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Firebase service authorization failed.");
  await env.TOKEN_CACHE?.put("firebase-access-token", JSON.stringify({ token: result.access_token }), { expirationTtl: 3300 });
  return result.access_token;
}

const databaseName = env => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`;
const databaseUrl = env => `https://firestore.googleapis.com/v1/${databaseName(env)}`;
const documentUrl = (env, path) => `${databaseUrl(env)}/documents/${path}`;

async function firestoreRequest(env, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await firebaseAccessToken(env)}`, "content-type": "application/json", ...(init.headers || {}) }
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || "Firestore request failed.");
    error.firestoreStatus = body?.error?.status;
    error.status = response.status;
    throw error;
  }
  return body;
}

async function getDocument(env, path, transaction = "") {
  const url = new URL(documentUrl(env, path));
  if (transaction) url.searchParams.set("transaction", transaction);
  const doc = await firestoreRequest(env, url.toString());
  return doc ? { id: doc.name.split("/").pop(), ...decodeFields(doc.fields) } : null;
}

async function listDocuments(env, collectionPath, limit = 1000) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(documentUrl(env, collectionPath));
    url.searchParams.set("pageSize", String(Math.min(100, limit - documents.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await firestoreRequest(env, url.toString());
    for (const doc of page?.documents || []) {
      documents.push({ id: doc.name.split("/").pop(), ...decodeFields(doc.fields) });
      if (documents.length >= limit) break;
    }
    pageToken = page?.nextPageToken || "";
  } while (pageToken && documents.length < limit);
  return { documents, truncated: Boolean(pageToken) };
}

async function queryDocumentsByField(env, collectionId, fieldPath, value, limit = 1000) {
  const rows = await firestoreRequest(env, `${databaseUrl(env)}/documents:runQuery`, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath }, op: "EQUAL", value: toFirestore(value) } },
      limit
    } })
  });
  const documents = (rows || []).flatMap(row => row.document ? [{
    id: row.document.name.split("/").pop(),
    ...decodeFields(row.document.fields)
  }] : []);
  return { documents, truncated: documents.length === limit };
}

async function queryAllDocuments(env, collectionId, limit = 1000) {
  const rows = await firestoreRequest(env, `${databaseUrl(env)}/documents:runQuery`, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId }],
      limit
    } })
  });
  const documents = (rows || []).flatMap(row => row.document ? [{
    id: row.document.name.split("/").pop(),
    ...decodeFields(row.document.fields)
  }] : []);
  return { documents, truncated: documents.length === limit };
}

async function queryDocumentsByValues(env, collectionId, fieldPath, values, limit = 300) {
  const unique = [...new Set((values || []).map(clean).filter(Boolean))].slice(0, limit);
  const documents = [];
  for (let start = 0; start < unique.length; start += 30) {
    const chunk = unique.slice(start, start + 30);
    const rows = await firestoreRequest(env, `${databaseUrl(env)}/documents:runQuery`, {
      method: "POST",
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId }],
        where: { fieldFilter: { field: { fieldPath }, op: "IN", value: toFirestore(chunk) } },
        limit: Math.min(limit - documents.length, 300)
      } })
    });
    for (const row of rows || []) {
      if (row.document) documents.push({
        id: row.document.name.split("/").pop(),
        ...decodeFields(row.document.fields)
      });
    }
    if (documents.length >= limit) break;
  }
  return { documents: documents.slice(0, limit), truncated: unique.length >= limit || documents.length >= limit };
}

function documentWrite(env, path, data) {
  return { update: { name: `${databaseName(env)}/documents/${path}`, fields: encodeFields(data) } };
}

function documentPatch(env, path, data) {
  return { ...documentWrite(env, path, data), updateMask: { fieldPaths: Object.keys(data) } };
}

function documentDelete(env, path) {
  return { delete: `${databaseName(env)}/documents/${path}` };
}

async function rollbackTransaction(env, transaction) {
  await firestoreRequest(env, `${databaseUrl(env)}/documents:rollback`, {
    method: "POST",
    body: JSON.stringify({ transaction })
  }).catch(() => null);
}

async function runTransaction(env, operation, maxAttempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const started = await firestoreRequest(env, `${databaseUrl(env)}/documents:beginTransaction`, {
      method: "POST",
      body: JSON.stringify({ options: { readWrite: {} } })
    });
    const transaction = started.transaction;
    const writes = [];
    try {
      const result = await operation({
        get: path => getDocument(env, path, transaction),
        set: (path, data) => writes.push(documentWrite(env, path, data)),
        patch: (path, data) => writes.push(documentPatch(env, path, data)),
        delete: path => writes.push(documentDelete(env, path))
      });
      await firestoreRequest(env, `${databaseUrl(env)}/documents:commit`, {
        method: "POST",
        body: JSON.stringify({ writes, transaction })
      });
      return result;
    } catch (error) {
      lastError = error;
      await rollbackTransaction(env, transaction);
      if (error.firestoreStatus !== "ABORTED" || attempt === maxAttempts - 1) throw error;
    }
  }
  throw lastError;
}

async function authenticatedUser(request, env) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const issuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;
  const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
  const { payload } = await jwtVerify(token, jwks, { issuer, audience: env.FIREBASE_PROJECT_ID });
  const uid = clean(payload.sub);
  const profile = await getDocument(env, `users/${uid}`);
  if (!profile || (profile.approved !== true && normalized(profile.status) !== "approved")) {
    throw Object.assign(new Error("Approved account required."), { status: 403 });
  }
  return { uid, email: clean(payload.email), profile };
}

function requireAdmin(user) {
  if (!["admin", "super_admin"].includes(normalized(user.profile.role))) {
    throw Object.assign(new Error("Administrator access required."), { status: 403 });
  }
}

const onTheMoveCollections = {
  hosts: { name: "onTheMoveApplications", statuses: ["new", "under_review", "action_required", "approved", "confirmed", "completed", "declined", "waitlisted", "screening", "needs_assessment", "funding_check", "planning", "delivered", "follow_up", "closed"] },
  sponsors: { name: "onTheMoveSponsorEnquiries", statuses: ["new", "contacted", "qualified", "proposal", "committed", "closed", "declined"] }
};

async function sendOnTheMoveEmail(env, user, data) {
  requireAdmin(user);
  const type = clean(data.type);
  const target = onTheMoveCollections[type];
  if (!target) throw Object.assign(new Error("Invalid request type."), { status: 400 });
  const id = safeId(data.id, "request identifier");
  const requestId = clean(data.requestId);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw Object.assign(new Error("Invalid send request identifier."), { status: 400 });
  }
  const subject = clean(data.subject);
  const body = clean(data.body);
  if (!subject || subject.length > 200 || /[\\r\\n]/.test(subject) || !body || body.length > 10000) {
    throw Object.assign(new Error("Subject or message length is invalid."), { status: 400 });
  }
  const path = `${target.name}/${id}`;
  const record = await getDocument(env, path);
  if (!record) throw Object.assign(new Error("Request not found."), { status: 404 });
  if (clean(record[type === "hosts" ? "applicationId" : "enquiryId"]) !== id || !target.statuses.includes(normalized(record.status))) {
    throw Object.assign(new Error("Request identifier or status is invalid."), { status: 409 });
  }
  const previous = (Array.isArray(record.communicationHistory) ? record.communicationHistory : []).find(entry => entry.requestId === requestId);
  if (previous) return { ok: true, entry: previous };
  const to = clean(record.email);
  const name = clean(record.contactName);
  if (!looksLikeEmail(to) || to.length > 160 || !name || name.length > 120) {
    throw Object.assign(new Error("The saved contact details are invalid."), { status: 422 });
  }
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw Object.assign(new Error("Email service is not configured."), { status: 503 });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "Idempotency-Key": `on-the-move/${requestId}` },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], subject, text: body })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !clean(result.id)) {
    throw Object.assign(new Error("Email provider did not accept the message. Please retry with the same draft."), { status: 502 });
  }
  const entry = { requestId, providerMessageId: clean(result.id), deliveryStatus: "accepted", status: normalized(record.status), subject, channel: "email", sentAt: new Date().toISOString(), recordedByUid: user.uid, recordedByEmail: user.email, recipientEmail: to, recipientName: name };
  await runTransaction(env, async tx => {
    const current = await tx.get(path);
    if (!current) throw Object.assign(new Error("Request disappeared after email acceptance."), { status: 500 });
    const history = Array.isArray(current.communicationHistory) ? current.communicationHistory : [];
    if (history.some(item => item.requestId === requestId)) return;
    tx.patch(path, { communicationHistory: [...history, entry], lastCommunicationAt: entry.sentAt });
  });
  return { ok: true, entry };
}

function requireRole(user, roles) {
  if (!roles.includes(normalized(user.profile.role))) {
    throw Object.assign(new Error("This account cannot access the requested role data."), { status: 403 });
  }
}

function sameSchool(profile, record) {
  const schoolId = clean(profile.schoolId);
  const schoolCode = clean(profile.schoolCode);
  return Boolean(
    (schoolId && clean(record.schoolId) === schoolId) ||
    (schoolCode && clean(record.schoolCode) === schoolCode)
  );
}

const publicSubject = subject => ({
  id: subject.id,
  fullName: clean(subject.fullName) || `${clean(subject.firstName)} ${clean(subject.lastName)}`.trim() || "Learner",
  firstName: clean(subject.firstName),
  lastName: clean(subject.lastName),
  studentId: clean(subject.studentId),
  role: clean(subject.role),
  status: clean(subject.status),
  classLevel: clean(subject.classLevel || subject.occupation),
  schoolId: clean(subject.schoolId),
  schoolCode: clean(subject.schoolCode),
  schoolName: clean(subject.schoolName)
});

const publicRoleProgress = item => ({
  id: item.id, userId: clean(item.userId), type: clean(item.type), courseId: clean(item.courseId), bookId: clean(item.bookId),
  title: clean(item.title || item.courseTitle || item.bookTitle), status: clean(item.status),
  percent: Math.max(0, Math.min(100, Number(item.percent ?? item.progressPercent ?? item.progress ?? 0) || 0)),
  completed: item.completed === true, updatedAt: item.updatedAt || item.createdAt || null
});

const publicRoleCertificate = item => ({
  id: item.id, userId: clean(item.userId || item.recipientId), courseId: clean(item.courseId),
  title: clean(item.title || item.courseTitle || item.programmeTitle || "Certificate"), type: clean(item.type),
  status: clean(item.status || item.verificationStatus), verificationCode: clean(item.verificationCode),
  issueDate: item.issueDate || item.issuedAt || item.createdAt || null
});

async function roleOverview(env, user, requestedSubjectId = "") {
  const role = normalized(user.profile.role);
  let subjects = [];

  if (["admin", "super_admin"].includes(role)) {
    if (clean(requestedSubjectId)) {
      const subjectId = safeId(requestedSubjectId, "student identifier");
      const subject = await getDocument(env, `users/${subjectId}`);
      if (subject) subjects = [subject];
    } else {
      const usersPage = await listDocuments(env, "users", 300);
      subjects = usersPage.documents.filter(item => normalized(item.role) === "student");
    }
  } else if (role === "parent") {
    const links = await queryDocumentsByField(env, "parentStudentLinks", "parentId", user.uid, 100);
    const subjectIds = links.documents
      .filter(link => normalized(link.status) === "approved")
      .map(link => clean(link.studentId)).filter(Boolean).slice(0, 20);
    for (const subjectId of subjectIds) {
      const subject = await getDocument(env, `users/${safeId(subjectId, "student identifier")}`);
      if (subject && normalized(subject.role) === "student") subjects.push(subject);
    }
  } else if (role === "teacher") {
    const assignments = await queryDocumentsByField(env, "teacherStudents", "teacherId", user.uid, 100);
    const assignedIds = assignments.documents.map(item => clean(item.studentId || item.userId)).filter(Boolean).slice(0, 40);
    for (const subjectId of assignedIds) {
      const subject = await getDocument(env, `users/${safeId(subjectId, "student identifier")}`);
      if (subject && normalized(subject.role) === "student" && sameSchool(user.profile, subject)) subjects.push(subject);
    }
    if (!subjects.length) {
      const schoolField = clean(user.profile.schoolId) ? "schoolId" : "schoolCode";
      const schoolValue = clean(user.profile.schoolId || user.profile.schoolCode);
      if (schoolValue) {
        const schoolUsers = await queryDocumentsByField(env, "users", schoolField, schoolValue, 200);
        subjects = schoolUsers.documents.filter(item => normalized(item.role) === "student" && sameSchool(user.profile, item));
      }
    }
  } else if (role === "school_admin" || role === "school") {
    const schoolField = clean(user.profile.schoolId) ? "schoolId" : "schoolCode";
    const schoolValue = clean(user.profile.schoolId || user.profile.schoolCode);
    if (schoolValue) {
      const schoolUsers = await queryDocumentsByField(env, "users", schoolField, schoolValue, 300);
      subjects = schoolUsers.documents.filter(item => sameSchool(user.profile, item));
    }
  } else {
    requireRole(user, ["parent", "teacher", "school_admin", "school", "admin", "super_admin"]);
  }

  const uniqueSubjects = [...new Map(subjects.map(subject => [subject.id, subject])).values()].slice(0, 300);
  const subjectIds = uniqueSubjects.map(subject => subject.id);
  const [progressPage, certificatePage] = await Promise.all([
    queryDocumentsByValues(env, "userProgress", "userId", subjectIds),
    queryDocumentsByValues(env, "certificates", "userId", subjectIds)
  ]);
  return {
    role,
    subjects: uniqueSubjects.map(publicSubject),
    progress: progressPage.documents.map(publicRoleProgress),
    certificates: certificatePage.documents.map(publicRoleCertificate),
    truncated: uniqueSubjects.length >= 300 || progressPage.truncated || certificatePage.truncated
  };
}

function requireCloudinary(env) {
  for (const name of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    if (!clean(env[name])) throw Object.assign(new Error("Secure evidence service is not configured."), { status: 503 });
  }
}

function evidenceFile(data) {
  const file = data.file;
  if (!(file instanceof File)) throw Object.assign(new Error("Select an evidence image."), { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    throw Object.assign(new Error("Evidence must be a JPG, PNG or WebP image below 8 MB."), { status: 400 });
  }
  return file;
}

function evidenceFormat(file) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[file.type];
}

async function uploadPrivateEvidence(env, user, file) {
  const assetId = crypto.randomUUID();
  const publicId = `speakout/private-evidence/${user.uid}/${crypto.randomUUID()}`;
  const format = evidenceFormat(file);
  if (env.EVIDENCE_BUCKET) {
    const stored = await env.EVIDENCE_BUCKET.put(publicId, file.stream(), {
      httpMetadata: { contentType: file.type, contentDisposition: `inline; filename=\"evidence.${format}\"`, cacheControl: "private, no-store, max-age=0" },
      customMetadata: { ownerId: user.uid, assetId, format }
    });
    if (!stored) throw Object.assign(new Error("Secure evidence upload failed."), { status: 502 });
    return { assetId, publicId, version: 1, format, resourceType: "image", storage: "r2" };
  }
  requireCloudinary(env);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `speakout/private-evidence/${user.uid}`;
  const cloudinaryPublicId = publicId.slice(folder.length + 1);
  const signatureBase = `folder=${folder}&public_id=${cloudinaryPublicId}&timestamp=${timestamp}&type=authenticated${env.CLOUDINARY_API_SECRET}`;
  const upload = new FormData();
  upload.append("file", file);
  upload.append("api_key", env.CLOUDINARY_API_KEY);
  upload.append("timestamp", String(timestamp));
  upload.append("folder", folder);
  upload.append("public_id", cloudinaryPublicId);
  upload.append("type", "authenticated");
  upload.append("signature", await sha1Hex(signatureBase));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: upload });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error("Secure evidence upload failed."), { status: 502 });
  return { assetId: result.asset_id, publicId: result.public_id, version: result.version, format: result.format, resourceType: result.resource_type, storage: "cloudinary" };
}

async function removePrivateEvidence(env, uploaded) {
  if (uploaded?.storage === "r2" && env.EVIDENCE_BUCKET) {
    await env.EVIDENCE_BUCKET.delete(uploaded.publicId).catch(() => null);
    return;
  }
  if (uploaded?.storage === "cloudinary") {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sha1Hex(`public_id=${uploaded.publicId}&timestamp=${timestamp}&type=authenticated${env.CLOUDINARY_API_SECRET}`);
    const body = new URLSearchParams({ public_id: uploaded.publicId, timestamp: String(timestamp), type: "authenticated", api_key: env.CLOUDINARY_API_KEY, signature });
    await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body
    }).catch(() => null);
  }
}

function bounded(value, max, label) {
  const result = clean(value);
  if (result.length > max) throw Object.assign(new Error(`${label} is too long.`), { status: 400 });
  return result;
}

function optionalHttpsUrl(value, label) {
  const result = clean(value);
  if (!result) return "";
  let parsed;
  try { parsed = new URL(result); } catch { throw Object.assign(new Error(`${label} must be a valid HTTPS URL.`), { status: 400 }); }
  if (parsed.protocol !== "https:") throw Object.assign(new Error(`${label} must be a valid HTTPS URL.`), { status: 400 });
  return parsed.toString();
}

function externalCourse(course) {
  return normalized(course?.courseType) === "external" || normalized(course?.completionMethod) === "certificate-upload" || course?.externalProvider === true;
}

const modulesOf = course => Array.isArray(course.modules) ? course.modules : [];
const lessonsOf = module => Array.isArray(module?.lessons) ? module.lessons : [];
const lessonId = (courseId, mi, lesson, li) => lesson?.id || `${courseId}-m${mi + 1}-l${li + 1}`;
const assessmentId = (courseId, type, mi) => type === "final" ? `${courseId}__final` : `${courseId}__module__${mi}`;

function emptyProgress(uid, courseId, course) {
  return { userId: uid, courseId, courseTitle: course.title || "", completedLessons: [], passedModuleQuizzes: {}, moduleQuizScores: {}, finalAssessmentPassed: false, finalAssessmentScore: 0, percent: 0, progress: 0, status: "in_progress" };
}

function courseIsLearnable(course) {
  const status = normalized(course?.status || "active");
  const type = normalized(course?.courseType || "internal");
  const completion = normalized(course?.completionMethod);
  return ["active", "published"].includes(status) &&
    !["external", "instructor-led"].includes(type) &&
    completion !== "certificate-upload" &&
    modulesOf(course).some(module => lessonsOf(module).length > 0);
}

function counts(courseId, course, progress) {
  const done = new Set(progress.completedLessons || []);
  let total = 0, complete = 0;
  modulesOf(course).forEach((module, mi) => {
    const ids = lessonsOf(module).map((lesson, li) => lessonId(courseId, mi, lesson, li));
    total += ids.length + (module.quiz ? 1 : 0);
    complete += ids.filter(id => done.has(id)).length + (module.quiz && progress.passedModuleQuizzes?.[String(mi)] === true ? 1 : 0);
  });
  return { total, complete, percent: total ? Math.round(complete / total * 100) : 0 };
}

function moduleComplete(courseId, modules, mi, progress) {
  const done = new Set(progress.completedLessons || []);
  return lessonsOf(modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li))) &&
    (!modules[mi].quiz || progress.passedModuleQuizzes?.[String(mi)] === true);
}

function previousModulesComplete(courseId, modules, target, progress) {
  for (let i = 0; i < target; i++) if (!moduleComplete(courseId, modules, i, progress)) return false;
  return true;
}

function publicProgress(progress, course) {
  const result = counts(progress.courseId, course, progress);
  return { ...progress, percent: result.percent, progress: result.percent };
}

async function learningContext(env, user, courseId, reader = path => getDocument(env, path)) {
  const course = await reader(`courses/${courseId}`);
  if (!course) throw Object.assign(new Error("Course not found."), { status: 404 });
  if (!courseIsLearnable(course)) throw Object.assign(new Error("This course is not available for guided learning."), { status: 409 });
  const progressPath = `userProgress/${user.uid}_${courseId}`;
  const storedProgress = await reader(progressPath);
  const progress = storedProgress || emptyProgress(user.uid, courseId, course);
  return { course, progress, progressPath, enrolled: Boolean(storedProgress), modules: modulesOf(course) };
}

function requireEnrollment(ctx) {
  if (!ctx.enrolled) throw Object.assign(new Error("Enroll in this course before starting lessons."), { status: 409 });
}

function safeAssessment(assessment) {
  return {
    id: assessment.id,
    type: assessment.type,
    title: assessment.title || "Assessment",
    passMark: Number(assessment.passMark || 70),
    questions: (assessment.questions || []).map((q, index) => ({ index, question: q.question || q.text || `Question ${index + 1}`, options: (q.options || []).map(x => typeof x === "object" ? x.text || x.label || "" : x) }))
  };
}

function answerIndex(question) {
  if (Number.isInteger(question.answer)) return question.answer;
  if (Number.isInteger(question.correctAnswer)) return question.correctAnswer;
  return null;
}

async function assessmentContext(env, user, courseId, type, mi, reader = path => getDocument(env, path)) {
  const ctx = await learningContext(env, user, courseId, reader);
  requireEnrollment(ctx);
  if (!["module", "final"].includes(type)) throw Object.assign(new Error("Invalid assessment type."), { status: 400 });
  if (type === "module") {
    if (!Number.isInteger(mi) || !ctx.modules[mi]) throw Object.assign(new Error("Invalid module."), { status: 400 });
    if (!previousModulesComplete(courseId, ctx.modules, mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
    const done = new Set(ctx.progress.completedLessons || []);
    if (!lessonsOf(ctx.modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li)))) {
      throw Object.assign(new Error("Complete all lessons in this module first."), { status: 409 });
    }
  } else if (counts(courseId, ctx.course, ctx.progress).percent !== 100) {
    throw Object.assign(new Error("Complete all course requirements first."), { status: 409 });
  }
  const assessment = await reader(`courseAssessments/${assessmentId(courseId, type, mi)}`);
  if (!assessment) throw Object.assign(new Error("Secure assessment unavailable."), { status: 404 });
  return { ...ctx, assessment };
}

function evidenceDescriptor(record) {
  const publicId = clean(record.evidencePublicId);
  const ownerId = safeId(record.userId, "evidence owner identifier");
  const version = Number(record.evidenceVersion);
  const format = normalized(record.evidenceFormat || "jpg");
  const resourceType = normalized(record.evidenceResourceType || "image");
  const expectedPrefix = `speakout/private-evidence/${ownerId}/`;
  const assetName = publicId.slice(expectedPrefix.length);
  if (!publicId.startsWith(expectedPrefix) || !/^[A-Za-z0-9-]{8,80}$/.test(assetName) || !Number.isInteger(version) || version < 1 || !/^[a-z0-9]{2,12}$/.test(format) || resourceType !== "image") {
    throw Object.assign(new Error("This evidence record needs migration before it can be viewed securely."), { status: 409 });
  }
  if (!/^[A-Za-z0-9_-]{8,180}$/.test(clean(record.evidenceAssetId))) {
    throw Object.assign(new Error("This evidence record needs migration before it can be viewed securely."), { status: 409 });
  }
  return { publicId, ownerId, version, format, resourceType };
}

async function authenticatedEvidenceResponse(env, record) {
  const { publicId, ownerId, version, format, resourceType } = evidenceDescriptor(record);
  if (env.EVIDENCE_BUCKET) {
    const object = await env.EVIDENCE_BUCKET.get(publicId);
    if (object) {
      if (object.customMetadata?.ownerId !== ownerId || object.customMetadata?.assetId !== clean(record.evidenceAssetId)) {
        throw Object.assign(new Error("Evidence ownership validation failed."), { status: 403 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("content-type", headers.get("content-type") || `image/${format}`);
      headers.set("content-disposition", `inline; filename=\"evidence.${format}\"`);
      headers.set("cache-control", "private, no-store, max-age=0");
      headers.set("x-content-type-options", "nosniff");
      headers.set("x-robots-tag", "noindex, nofollow");
      return new Response(object.body, { status: 200, headers });
    }
    if (normalized(record.evidenceStorage) === "r2") throw Object.assign(new Error("Secure evidence was not found."), { status: 404 });
  }
  requireCloudinary(env);
  const encodedPublicId = publicId.split("/").map(encodeURIComponent).join("/");
  const deliveryTail = `v${version}/${encodedPublicId}.${format}`;
  const signature = (await sha1Base64Url(`${deliveryTail}${env.CLOUDINARY_API_SECRET}`)).slice(0, 8);
  const response = await fetch(`https://res.cloudinary.com/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${resourceType}/authenticated/s--${signature}--/${deliveryTail}`);
  if (!response.ok || !response.body) {
    throw Object.assign(new Error("Secure evidence retrieval failed."), { status: response.status === 404 ? 404 : 502 });
  }
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") || `image/${format}`,
      "content-disposition": `inline; filename=\"evidence.${format}\"`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}


const publicMediaStatus = item => ["active","published"].includes(normalized(item?.status));

function pickPublicFields(item, fields) {
  const out = {};
  for (const field of fields) {
    if (item?.[field] !== undefined && item?.[field] !== null) out[field] = item[field];
  }
  return out;
}

function publicTvEpisode(item = {}) {
  return pickPublicFields(item, [
    "id","title","show","description","presenter","guest","guestRole","tags","url","imageUrl",
    "format","featured","homePlacement","programmingDays","placementPriority","placementStart",
    "placementEnd","contentPillar","audience","publishDate","scheduledAt","sponsor","status","order",
    "createdAt","updatedAt","sourceType","sourceChannelTitle","sourceChannelId","sourceVideoId",
    "sourceUrl","sourceAttribution","curatedBySpeakOut"
  ]);
}

function publicTvShow(item = {}) {
  return pickPublicFields(item, [
    "id","title","slug","description","host","imageUrl","category","status","order","createdAt","updatedAt"
  ]);
}

function publicTvAudio(item = {}) {
  return pickPublicFields(item, [
    "id","title","audioType","description","url","audioUrl","sourceUrl","sourceGuid","imageUrl","publishDate","status","order",
    "source","durationMs","explicit","createdAt","updatedAt"
  ]);
}

function spotifyEpisodeId(raw) {
  try {
    const url = new URL(clean(raw));
    if (url.hostname.replace(/^www\./u,"").toLowerCase() !== "open.spotify.com") return "";
    return url.pathname.match(/^\/episode\/([^/?#]+)/u)?.[1] || "";
  } catch {
    return "";
  }
}

function decodePodcastText(value) {
  const numericEntity = (match, raw, radix) => {
    const point = Number.parseInt(raw, radix);
    return Number.isInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  };
  const text = String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<\/(?:p|div|li|h[1-6])>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x([0-9a-f]+);/giu, (match, raw) => numericEntity(match, raw, 16))
    .replace(/&#([0-9]+);/gu, (match, raw) => numericEntity(match, raw, 10))
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, String.fromCharCode(34))
    .replace(/&apos;/giu, "'");
  return clean(text.replace(/\s+/gu, " "));
}

function rssTag(block, tag) {
  const match = String(block || "").match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "iu"));
  return decodePodcastText(match?.[1] || "");
}

function rssAttribute(block, tag, attribute) {
  const match = String(block || "").match(new RegExp("<" + tag + "\\b[^>]*\\b" + attribute + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1[^>]*>", "iu"));
  return decodePodcastText(match?.[2] || "");
}

function podcastDurationMs(value) {
  const raw = clean(value);
  if (!raw) return 0;
  if (/^\d+(?:\.\d+)?$/u.test(raw)) return Math.max(0, Math.round(Number(raw) * 1000));
  const parts = raw.split(":").map(Number);
  if (parts.some(part => !Number.isFinite(part) || part < 0)) return 0;
  if (parts.length === 2) return Math.round((parts[0] * 60 + parts[1]) * 1000);
  if (parts.length === 3) return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
  return 0;
}

function podcastPublishDate(value) {
  const time = Date.parse(clean(value));
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : "";
}

function podcastExplicit(value) {
  return ["yes", "true", "explicit"].includes(normalized(value));
}

function audioIdentityKeys(item = {}) {
  const keys = [];
  const spotifyId = spotifyEpisodeId(item.url) || spotifyEpisodeId(item.sourceUrl);
  if (spotifyId) keys.push("spotify:" + spotifyId);
  if (clean(item.sourceGuid)) keys.push("guid:" + clean(item.sourceGuid));
  if (clean(item.audioUrl)) keys.push("audio:" + clean(item.audioUrl));
  const title = normalized(item.title).replace(/\s+/gu, " ");
  const date = clean(item.publishDate).slice(0, 10);
  if (title && date) keys.push("title-date:" + title + "|" + date);
  return keys;
}

async function spotifyShowEpisodes(env) {
  const feedUrl = clean(env.SPOTIFY_RSS_URL);
  if (!feedUrl || !publicWebUrl(feedUrl)) return { configured: false, items: [] };

  const response = await fetch(feedUrl, {
    headers: {
      "accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      "user-agent": "SpeakOut-TV-RSS/1.0"
    },
    redirect: "follow"
  });
  if (!response.ok) throw Object.assign(new Error("Spotify RSS episode sync failed."), { status: 502 });

  const xml = await response.text();
  const channelHead = xml.split(/<item\b/iu)[0] || "";
  const channelImage = rssAttribute(channelHead, "itunes:image", "href");
  const spotifyShowUrl = clean(env.SPOTIFY_SHOW_ID)
    ? "https://open.spotify.com/show/" + encodeURIComponent(clean(env.SPOTIFY_SHOW_ID))
    : "";
  const blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/giu)].map(match => match[1]).slice(0, 250);
  const items = [];

  for (const block of blocks) {
    const title = rssTag(block, "title") || "SpeakOut Podcast";
    const enclosureUrl = rssAttribute(block, "enclosure", "url");
    if (!publicWebUrl(enclosureUrl)) continue;
    const explicit = podcastExplicit(rssTag(block, "itunes:explicit"));
    if (explicit) continue;

    const guid = rssTag(block, "guid") || enclosureUrl;
    const digest = await sha1Hex(guid);
    const sourceUrlCandidate = rssTag(block, "link");
    const sourceUrl = publicWebUrl(sourceUrlCandidate) ? sourceUrlCandidate : spotifyShowUrl;
    const imageUrl = rssAttribute(block, "itunes:image", "href") || channelImage;
    const description = rssTag(block, "content:encoded") || rssTag(block, "description") || rssTag(block, "itunes:summary");

    items.push({
      id: "spotify-rss-" + digest.slice(0, 20),
      title,
      audioType: "Podcast",
      description,
      url: sourceUrl || enclosureUrl,
      audioUrl: enclosureUrl,
      sourceUrl: sourceUrl || enclosureUrl,
      sourceGuid: guid,
      imageUrl: publicWebUrl(imageUrl) ? imageUrl : "",
      publishDate: podcastPublishDate(rssTag(block, "pubDate") || rssTag(block, "dc:date")),
      status: "published",
      order: 0,
      source: "spotify",
      durationMs: podcastDurationMs(rssTag(block, "itunes:duration")),
      explicit: false
    });
  }

  return { configured: true, items };
}

async function publicTvBundle(env) {
  const [episodesPage, showsPage, legacyVideoPage] = await Promise.all([
    queryAllDocuments(env, "tvEpisodes"),
    queryAllDocuments(env, "tvShows"),
    queryAllDocuments(env, "homepageVideos")
  ]);
  const episodes = episodesPage.documents.filter(publicMediaStatus).map(publicTvEpisode);
  const seenUrls = new Set(episodes.map(item => clean(item.url)).filter(Boolean));
  for (const item of legacyVideoPage.documents.filter(publicMediaStatus)) {
    const url = clean(item.youtubeUrl || item.url);
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    episodes.push({
      id: "legacy-" + clean(item.id),
      title: clean(item.title) || "SpeakOut TV",
      show: clean(item.category) || "SpeakOut Stories",
      description: clean(item.description),
      url,
      imageUrl: clean(item.thumbnailUrl || item.imageUrl),
      format: "episode",
      status: "published",
      homePlacement: "auto",
      contentPillar: "general",
      audience: "youth",
      publishDate: clean(item.publishDate || item.createdAt),
      order: Number(item.order || 0),
      source: "legacy-homepage-video"
    });
  }
  const shows = showsPage.documents.filter(publicMediaStatus).map(publicTvShow);
  return {
    episodes,
    shows,
    truncated: episodesPage.truncated || showsPage.truncated || legacyVideoPage.truncated
  };
}

async function publicAudioBundle(env) {
  const page = await queryAllDocuments(env, "tvAudio");
  const manual = page.documents.filter(publicMediaStatus).map(publicTvAudio);
  let spotify = { configured: false, items: [] };
  try {
    spotify = await spotifyShowEpisodes(env);
  } catch (error) {
    console.error("Spotify sync:", error);
  }
  const seen = new Set();
  const items = [];
  for (const item of manual) {
    for (const key of audioIdentityKeys(item)) seen.add(key);
    items.push(item);
  }
  for (const item of spotify.items) {
    const keys = audioIdentityKeys(item);
    if (keys.some(key => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    items.push(item);
  }
  items.sort((a,b) =>
    String(b.publishDate || "").localeCompare(String(a.publishDate || "")) ||
    Number(a.order || 0) - Number(b.order || 0)
  );
  return { items, spotifyConfigured: spotify.configured, truncated: page.truncated };
}


function youtubeVideoIdFromUrl(raw) {
  try {
    const url = new URL(clean(raw));
    const host = url.hostname.replace(/^www\./u, "").toLowerCase();
    if (host === "youtu.be") return clean(url.pathname.split("/").filter(Boolean)[0]);
    if (["youtube.com","m.youtube.com","music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") return clean(url.searchParams.get("v"));
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/u);
      return clean(match?.[1]);
    }
  } catch {}
  return "";
}

function curatorEpisodeRecord(candidate = {}, source = {}) {
  const keywords = Array.isArray(source.includeKeywords) ? source.includeKeywords : [];
  return {
    title: clean(candidate.title) || "Curated YouTube video",
    show: clean(source.show || candidate.show || "SpeakOut Picks"),
    description: clean(candidate.description).slice(0, 2000),
    presenter: "",
    guest: "",
    guestRole: "",
    tags: keywords.join(", "),
    url: clean(candidate.url),
    imageUrl: clean(candidate.thumbnailUrl),
    format: "episode",
    status: "draft",
    homePlacement: "library_only",
    programmingDays: "all",
    placementPriority: 100,
    placementStart: "",
    placementEnd: "",
    contentPillar: normalized(source.contentPillar || candidate.contentPillar || "motivation") || "motivation",
    audience: normalized(source.audience || candidate.audience || "youth") || "youth",
    featured: "false",
    publishDate: clean(candidate.publishedAt).slice(0, 10),
    order: 0,
    scheduledAt: "",
    sponsor: "",
    consentConfirmed: "no",
    minorInvolved: "no",
    editorialReview: "pending",
    sourceType: "youtube-curated",
    sourceChannelTitle: clean(candidate.channelTitle),
    sourceChannelId: clean(candidate.channelId),
    sourceVideoId: clean(candidate.videoId),
    sourceUrl: clean(candidate.url),
    sourceAttribution: "YouTube · " + clean(candidate.channelTitle || "Original creator"),
    sourceTitle: clean(candidate.title),
    sourceDescription: clean(candidate.description),
    sourceThumbnailUrl: clean(candidate.thumbnailUrl),
    youtubeMetadataRefreshedAt: new Date().toISOString(),
    curatorManagedMetadata: true,
    curatedBySpeakOut: true
  };
}

async function curatorState(env) {
  const [sourcesPage, candidatesPage] = await Promise.all([
    listDocuments(env, "tvCuratorSources", 250),
    listDocuments(env, "tvCuratorCandidates", 500)
  ]);
  const sources = sourcesPage.documents.sort((a,b) => clean(a.label || a.channelTitle).localeCompare(clean(b.label || b.channelTitle)));
  const candidates = candidatesPage.documents.sort((a,b) =>
    String(b.discoveredAt || b.publishedAt || "").localeCompare(String(a.discoveredAt || a.publishedAt || ""))
  );
  return {
    configured: Boolean(clean(env.YOUTUBE_API_KEY)),
    sources,
    candidates,
    truncated: sourcesPage.truncated || candidatesPage.truncated
  };
}

async function saveCuratorSource(env, user, data = {}) {
  const input = curatorSourceInput(data.source || data);
  if (!input.channelRef) throw Object.assign(new Error("YouTube channel is required."), { status: 400 });
  const channel = await resolveYouTubeChannel(env.YOUTUBE_API_KEY, input.channelRef);
  if (channel.madeForKids) {
    throw Object.assign(new Error("Made-for-kids channels are not supported by the SpeakOut curator workflow."), { status: 409 });
  }
  const id = data.id ? safeId(data.id, "curator source identifier") : safeId("yt-" + channel.channelId, "curator source identifier");
  const now = new Date().toISOString();
  return runTransaction(env, async tx => {
    const existing = await tx.get("tvCuratorSources/" + id);
    const record = {
      ...(existing || {}),
      ...input,
      channelId: channel.channelId,
      channelTitle: channel.title,
      channelDescription: channel.description,
      channelThumbnailUrl: channel.thumbnailUrl,
      uploadsPlaylistId: channel.uploadsPlaylistId,
      channelMetadataRefreshedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      updatedBy: user.uid
    };
    tx.set("tvCuratorSources/" + id, record);
    return { ok: true, source: { id, ...record } };
  });
}

async function draftCuratorCandidate(env, tx, candidate, source, actor) {
  const episodeId = safeId("curated-" + candidate.videoId, "curated episode identifier");
  const existing = await tx.get("tvEpisodes/" + episodeId);
  if (!existing) {
    const now = new Date().toISOString();
    tx.set("tvEpisodes/" + episodeId, {
      ...curatorEpisodeRecord(candidate, source),
      createdAt: now,
      updatedAt: now,
      updatedBy: actor
    });
  }
  return episodeId;
}

async function syncCuratorSource(env, source, actor = "system") {
  if (!clean(env.YOUTUBE_API_KEY)) {
    throw Object.assign(new Error("YouTube curator is not configured. Add the YOUTUBE_API_KEY Worker secret."), { status: 503 });
  }
  const channel = await resolveYouTubeChannel(env.YOUTUBE_API_KEY, source.channelId || source.channelRef);
  if (channel.madeForKids) {
    throw Object.assign(new Error("Made-for-kids channels are not supported by the SpeakOut curator workflow."), { status: 409 });
  }
  const refreshedSource = {
    ...source,
    channelId: channel.channelId,
    channelTitle: channel.title,
    channelDescription: channel.description,
    channelThumbnailUrl: channel.thumbnailUrl,
    uploadsPlaylistId: channel.uploadsPlaylistId,
    channelMetadataRefreshedAt: new Date().toISOString()
  };
  const videos = await fetchYouTubeUploads(env.YOUTUBE_API_KEY, refreshedSource, 25);
  const [candidatePage, episodePage] = await Promise.all([
    listDocuments(env, "tvCuratorCandidates", 1000),
    listDocuments(env, "tvEpisodes", 1000)
  ]);
  const knownVideos = new Set();
  candidatePage.documents.forEach(item => {
    if (clean(item.videoId)) knownVideos.add(clean(item.videoId));
  });
  episodePage.documents.forEach(item => {
    const id = clean(item.sourceVideoId) || youtubeVideoIdFromUrl(item.url);
    if (id) knownVideos.add(id);
  });
  const fresh = videos.filter(video => !knownVideos.has(video.videoId));
  const now = new Date().toISOString();
  const result = await runTransaction(env, async tx => {
    let created = 0, drafted = 0;
    for (const video of fresh) {
      const candidateId = safeId("yt-" + video.videoId, "curator candidate identifier");
      const record = {
        ...video,
        sourceId: clean(refreshedSource.id),
        sourceLabel: clean(refreshedSource.label || refreshedSource.channelTitle),
        show: clean(refreshedSource.show || "SpeakOut Picks"),
        contentPillar: normalized(refreshedSource.contentPillar || "motivation"),
        audience: normalized(refreshedSource.audience || "youth"),
        sourceMode: normalized(refreshedSource.mode || "review"),
        status: normalized(refreshedSource.mode) === "draft" ? "drafted" : "pending",
        discoveredAt: now,
        youtubeMetadataRefreshedAt: now,
        updatedAt: now,
        reviewedAt: "",
        reviewedBy: "",
        draftEpisodeId: ""
      };
      if (normalized(refreshedSource.mode) === "draft") {
        record.draftEpisodeId = await draftCuratorCandidate(env, tx, record, refreshedSource, actor);
        drafted += 1;
      }
      tx.set("tvCuratorCandidates/" + candidateId, record);
      created += 1;
    }
    const existingSource = await tx.get("tvCuratorSources/" + safeId(refreshedSource.id, "curator source identifier"));
    if (existingSource) {
      tx.set("tvCuratorSources/" + refreshedSource.id, {
        ...existingSource,
        channelId: refreshedSource.channelId,
        channelTitle: refreshedSource.channelTitle,
        channelDescription: refreshedSource.channelDescription,
        channelThumbnailUrl: refreshedSource.channelThumbnailUrl,
        uploadsPlaylistId: refreshedSource.uploadsPlaylistId,
        channelMetadataRefreshedAt: refreshedSource.channelMetadataRefreshedAt,
        lastSyncedAt: now,
        lastSyncNewCount: created,
        lastSyncError: "",
        updatedAt: now,
        updatedBy: actor
      });
    }
    return { created, drafted, scanned: videos.length };
  });
  return { sourceId: source.id, sourceTitle: refreshedSource.label || refreshedSource.channelTitle, ...result };
}

async function refreshStoredYouTubeMetadata(env, actor = "system") {
  if (!clean(env.YOUTUBE_API_KEY)) return { configured: false, refreshed: 0, unavailable: 0 };
  const [candidatePage, episodePage] = await Promise.all([
    listDocuments(env, "tvCuratorCandidates", 1000),
    listDocuments(env, "tvEpisodes", 1000)
  ]);
  const threshold = Date.now() - 20*24*60*60*1000;
  const stale = value => {
    const time = Date.parse(clean(value));
    return !Number.isFinite(time) || time < threshold;
  };
  const candidateRows = candidatePage.documents.filter(item => clean(item.videoId) && stale(item.youtubeMetadataRefreshedAt));
  const episodeRows = episodePage.documents.filter(item =>
    item.sourceType === "youtube-curated" && clean(item.sourceVideoId) && stale(item.youtubeMetadataRefreshedAt)
  );
  const ids = [...new Set([
    ...candidateRows.map(item => clean(item.videoId)),
    ...episodeRows.map(item => clean(item.sourceVideoId))
  ])].filter(Boolean);
  if (!ids.length) return { configured: true, refreshed: 0, unavailable: 0 };

  const metadata = await fetchYouTubeVideosByIds(env.YOUTUBE_API_KEY, ids);
  const now = new Date().toISOString();
  let refreshed = 0, unavailable = 0;

  const chunks = [];
  const operations = [
    ...candidateRows.map(item => ({ kind:"candidate", item, videoId:clean(item.videoId) })),
    ...episodeRows.map(item => ({ kind:"episode", item, videoId:clean(item.sourceVideoId) }))
  ];
  for (let start=0; start<operations.length; start+=150) chunks.push(operations.slice(start,start+150));

  for (const chunk of chunks) {
    await runTransaction(env, async tx => {
      for (const op of chunk) {
        const video = metadata.get(op.videoId);
        if (!video?.eligible) {
          unavailable += 1;
          if (op.kind === "candidate") {
            tx.set("tvCuratorCandidates/" + op.item.id, {
              ...op.item,
              title: "",
              description: "",
              channelTitle: "",
              thumbnailUrl: "",
              tags: [],
              status: "unavailable",
              youtubeMetadataRefreshedAt: now,
              updatedAt: now,
              updatedBy: actor
            });
          } else {
            const managed = op.item.curatorManagedMetadata !== false;
            tx.set("tvEpisodes/" + op.item.id, {
              ...op.item,
              ...(managed ? { title:"Unavailable YouTube video", description:"", imageUrl:"" } : {}),
              status: "hidden",
              sourceChannelTitle: "",
              sourceAttribution: "",
              sourceTitle: "",
              sourceDescription: "",
              sourceThumbnailUrl: "",
              youtubeMetadataRefreshedAt: now,
              updatedAt: now,
              updatedBy: actor
            });
          }
          continue;
        }

        refreshed += 1;
        if (op.kind === "candidate") {
          tx.set("tvCuratorCandidates/" + op.item.id, {
            ...op.item,
            title: video.title,
            description: video.description,
            channelId: video.channelId,
            channelTitle: video.channelTitle,
            tags: video.tags,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl,
            url: video.url,
            status: op.item.status === "unavailable" ? (op.item.draftEpisodeId ? "drafted" : "pending") : op.item.status,
            youtubeMetadataRefreshedAt: now,
            updatedAt: now,
            updatedBy: actor
          });
        } else {
          const managed = op.item.curatorManagedMetadata !== false;
          tx.set("tvEpisodes/" + op.item.id, {
            ...op.item,
            ...(managed ? {
              title: video.title,
              description: video.description,
              imageUrl: video.thumbnailUrl,
              publishDate: video.publishedAt.slice(0,10),
              url: video.url
            } : {}),
            sourceChannelTitle: video.channelTitle,
            sourceChannelId: video.channelId,
            sourceUrl: video.url,
            sourceAttribution: "YouTube · " + video.channelTitle,
            sourceTitle: video.title,
            sourceDescription: video.description,
            sourceThumbnailUrl: video.thumbnailUrl,
            youtubeMetadataRefreshedAt: now,
            updatedAt: now,
            updatedBy: actor
          });
        }
      }
      return { ok:true };
    });
  }
  return { configured:true, refreshed, unavailable };
}

async function syncAllCuratorSources(env, actor = "system", sourceId = "") {
  if (!clean(env.YOUTUBE_API_KEY)) return { configured: false, results: [], error: "YOUTUBE_API_KEY is not configured." };
  const page = await listDocuments(env, "tvCuratorSources", 250);
  const sources = page.documents.filter(source => normalized(source.status || "active") === "active" && (!sourceId || source.id === sourceId));
  const results = [];
  for (const source of sources) {
    try {
      results.push(await syncCuratorSource(env, source, actor));
    } catch (error) {
      const now = new Date().toISOString();
      await runTransaction(env, async tx => {
        const current = await tx.get("tvCuratorSources/" + source.id);
        if (current) {
          const refreshedAt = Date.parse(clean(current.channelMetadataRefreshedAt));
          const metadataExpired = !Number.isFinite(refreshedAt) || Date.now()-refreshedAt > 30*24*60*60*1000;
          tx.set("tvCuratorSources/" + source.id, {
            ...current,
            ...(metadataExpired ? { channelTitle:"", channelDescription:"", channelThumbnailUrl:"" } : {}),
            lastSyncedAt: now,
            lastSyncError: clean(error.message).slice(0, 500),
            updatedAt: now,
            updatedBy: actor
          });
        }
        return { ok: true };
      });
      results.push({ sourceId: source.id, sourceTitle: source.label || source.channelTitle || source.channelRef, error: error.message || "Sync failed." });
    }
  }
  return { configured: true, results };
}

async function reviewCuratorCandidate(env, user, data = {}) {
  const candidateId = safeId(data.id, "curator candidate identifier");
  const decision = normalized(data.decision);
  if (!["draft","reject"].includes(decision)) throw Object.assign(new Error("Choose draft or reject."), { status: 400 });
  return runTransaction(env, async tx => {
    const candidate = await tx.get("tvCuratorCandidates/" + candidateId);
    if (!candidate) throw Object.assign(new Error("Curator candidate not found."), { status: 404 });
    if (decision === "reject") {
      const updated = {
        ...candidate,
        status: "rejected",
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.uid,
        updatedAt: new Date().toISOString()
      };
      tx.set("tvCuratorCandidates/" + candidateId, updated);
      return { ok: true, candidate: { id: candidateId, ...updated } };
    }
    const source = candidate.sourceId ? await tx.get("tvCuratorSources/" + safeId(candidate.sourceId, "curator source identifier")) : {};
    const draftEpisodeId = candidate.draftEpisodeId || await draftCuratorCandidate(env, tx, candidate, source || {}, user.uid);
    const updated = {
      ...candidate,
      status: "drafted",
      draftEpisodeId,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.uid,
      updatedAt: new Date().toISOString()
    };
    tx.set("tvCuratorCandidates/" + candidateId, updated);
    return { ok: true, candidate: { id: candidateId, ...updated }, draftEpisodeId };
  });
}

async function route(request, env, path, data) {
  if (path === "/v1/catalog/courses") {
    const page = await listDocuments(env, "courses", 500);
    const courses = page.documents.filter(courseIsCatalogueReady).map(publicCourseMetadata)
      .sort((a, b) => Number(b.featured === true) - Number(a.featured === true) || clean(a.title).localeCompare(clean(b.title)));
    return json({ courses, truncated: page.truncated }, 200, {
      "cache-control": "public, max-age=120, s-maxage=300",
      "x-content-type-options": "nosniff"
    });
  }
  if (path === "/v1/media/tv") {
    return json(await publicTvBundle(env), 200, {
      "cache-control": "public, max-age=60, s-maxage=180",
      "x-content-type-options": "nosniff"
    });
  }
  if (path === "/v1/media/audio") {
    return json(await publicAudioBundle(env), 200, {
      "cache-control": "public, max-age=60, s-maxage=180",
      "x-content-type-options": "nosniff"
    });
  }
  const user = await authenticatedUser(request, env);
  if (path === "/v1/admin/on-the-move/send-email") return sendOnTheMoveEmail(env, user, data);
  const courseSpecificLearningPaths = new Set([
    "/v1/learning/enroll",
    "/v1/learning/state",
    "/v1/learning/lessons/complete",
    "/v1/learning/assessments/get",
    "/v1/learning/assessments/submit"
  ]);
  const courseId = courseSpecificLearningPaths.has(path) ? safeId(data.courseId, "course identifier") : clean(data.courseId);

  if (path === "/v1/admin/media/evidence") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const record = await getDocument(env, `externalLearningRecords/${recordId}`);
    if (!record) throw Object.assign(new Error("Evidence record not found."), { status: 404 });
    return authenticatedEvidenceResponse(env, record);
  }

  if (path === "/v1/external-learning/status") {
    const requestedCourseId = safeId(data.courseId, "course identifier");
    const page = await queryDocumentsByField(env, "externalLearningRecords", "userId", user.uid);
    const records = page.documents.filter(item => item.courseId === requestedCourseId)
      .sort((a, b) => String(b.updatedAt || b.submittedAt || "").localeCompare(String(a.updatedAt || a.submittedAt || "")));
    return { record: records[0] || null };
  }

  if (path === "/v1/external-learning/submit") {
    const requestedCourseId = safeId(data.courseId, "course identifier");
    const course = await getDocument(env, `courses/${requestedCourseId}`);
    if (!course || !externalCourse(course) || !["active", "published"].includes(normalized(course.status || "active"))) {
      throw Object.assign(new Error("This external course is not available for submission."), { status: 409 });
    }
    const completionDate = bounded(data.completionDate, 10, "Completion date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDate) || completionDate > new Date().toISOString().slice(0, 10)) {
      throw Object.assign(new Error("Enter a valid completion date that is not in the future."), { status: 400 });
    }
    const certificateNumber = bounded(data.certificateNumber, 120, "Certificate number");
    const learnerNote = bounded(data.learnerNote, 1200, "Learner note");
    const verificationUrl = optionalHttpsUrl(data.verificationUrl, "Verification URL");
    const uploaded = await uploadPrivateEvidence(env, user, evidenceFile(data));
    const recordId = safeId(`${user.uid}_${requestedCourseId}`, "record identifier");
    try {
      return await runTransaction(env, async tx => {
        const existing = await tx.get(`externalLearningRecords/${recordId}`);
        if (existing && !["rejected", "resubmission_required"].includes(normalized(existing.status))) {
          throw Object.assign(new Error("This submission is already awaiting review or has been approved."), { status: 409 });
        }
        const now = new Date().toISOString();
        const provider = bounded(course.provider || "External Provider", 160, "Provider");
        const record = {
          ...(existing || {}), userId: user.uid, userEmail: user.email || clean(user.profile.email),
          learnerName: humanName(user.profile),
          learnerRole: clean(user.profile.role) || "user", schoolId: clean(user.profile.schoolId), schoolCode: clean(user.profile.schoolCode),
          courseId: requestedCourseId, courseTitle: bounded(course.title || "External course", 240, "Course title"),
          courseCategory: bounded(course.category, 120, "Course category"), courseType: "external", provider,
          providerCourseUrl: optionalHttpsUrl(course.externalUrl || course.courseUrl || course.providerCourseUrl || course.providerUrl || course.url, "Provider course URL"),
          certificateIssuer: bounded(course.certificate?.issuer || course.certificateIssuer || provider, 160, "Certificate issuer"),
          completionDate, certificateNumber, verificationUrl, learnerNote,
          proofType: uploaded.storage === "r2" ? "private-r2-image" : "cloudinary-authenticated-image",
          evidenceAssetId: uploaded.assetId, evidencePublicId: uploaded.publicId, evidenceVersion: uploaded.version,
          evidenceFormat: uploaded.format, evidenceResourceType: uploaded.resourceType, evidenceStorage: uploaded.storage,
          status: "pending_review", verificationStatus: "pending", submittedBy: user.uid, submittedAt: now,
          createdAt: existing?.createdAt || now, updatedAt: now,
          resubmissionCount: existing ? Number(existing.resubmissionCount || 0) + 1 : 0,
          reviewerFeedback: "", reviewedBy: "", reviewedAt: null
        };
        tx.set(`externalLearningRecords/${recordId}`, record);
        return { ok: true, record: { id: recordId, ...record } };
      });
    } catch (error) {
      await removePrivateEvidence(env, uploaded);
      throw error;
    }
  }

  if (path === "/v1/roles/overview") {
    return roleOverview(env, user, clean(data.subjectId));
  }

  if (path === "/v1/roles/school/users/status") {
    requireRole(user, ["school_admin", "school", "admin", "super_admin"]);
    const targetUserId = safeId(data.userId, "user identifier");
    const status = normalized(data.status);
    if (!["approved", "pending_school_approval", "rejected", "suspended"].includes(status)) {
      throw Object.assign(new Error("Invalid account status."), { status: 400 });
    }
    return runTransaction(env, async tx => {
      const target = await tx.get(`users/${targetUserId}`);
      if (!target) throw Object.assign(new Error("User account not found."), { status: 404 });
      if (!["admin", "super_admin"].includes(normalized(user.profile.role)) && !sameSchool(user.profile, target)) {
        throw Object.assign(new Error("You can update only users in your school."), { status: 403 });
      }
      if (!["student", "teacher", "parent"].includes(normalized(target.role))) {
        throw Object.assign(new Error("This account role cannot be managed here."), { status: 403 });
      }
      const now = new Date().toISOString();
      tx.set(`users/${targetUserId}`, {
        ...target,
        status,
        approved: status === "approved",
        updatedAt: now,
        reviewedAt: now,
        reviewedBy: user.uid
      });
      return { ok: true, userId: targetUserId, status };
    });
  }

  if (path === "/v1/learning/dashboard") {
    const [progressPage, certificatesPage] = await Promise.all([
      queryDocumentsByField(env, "userProgress", "userId", user.uid),
      queryDocumentsByField(env, "certificates", "userId", user.uid)
    ]);
    return {
      progress: progressPage.documents,
      certificates: certificatesPage.documents,
      truncated: progressPage.truncated || certificatesPage.truncated
    };
  }

  if (path === "/v1/learning/enroll") {
    return runTransaction(env, async tx => {
      const ctx = await learningContext(env, user, courseId, tx.get);
      if (ctx.enrolled) return { created: false, progress: publicProgress(ctx.progress, ctx.course) };
      const now = new Date().toISOString();
      const progress = publicProgress({ ...ctx.progress, enrolledAt: now, updatedAt: now }, ctx.course);
      tx.set(ctx.progressPath, progress);
      return { created: true, progress };
    });
  }

  if (path === "/v1/learning/state") {
    const ctx = await learningContext(env, user, courseId);
    requireEnrollment(ctx);
    return { progress: publicProgress(ctx.progress, ctx.course) };
  }

  if (path === "/v1/learning/lessons/complete") {
    return runTransaction(env, async tx => {
      const ctx = await learningContext(env, user, courseId, tx.get);
      requireEnrollment(ctx);
      const target = clean(data.lessonId);
      let found;
      ctx.modules.forEach((module, mi) => lessonsOf(module).forEach((lesson, li) => {
        if (lessonId(courseId, mi, lesson, li) === target) found = { mi, li };
      }));
      if (!found) throw Object.assign(new Error("Lesson not found."), { status: 404 });
      if (!previousModulesComplete(courseId, ctx.modules, found.mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
      if (found.li > 0) {
        const prior = lessonId(courseId, found.mi, ctx.modules[found.mi].lessons[found.li - 1], found.li - 1);
        if (!(ctx.progress.completedLessons || []).includes(prior)) throw Object.assign(new Error("Complete the previous lesson first."), { status: 409 });
      }
      const completed = [...new Set([...(ctx.progress.completedLessons || []), target])];
      const updated = publicProgress({ ...ctx.progress, completedLessons: completed, updatedAt: new Date().toISOString() }, ctx.course);
      tx.set(ctx.progressPath, updated);
      return { progress: updated };
    });
  }

  if (path === "/v1/learning/assessments/get" || path === "/v1/learning/assessments/submit") {
    const type = normalized(data.type);
    const mi = Number(data.moduleIndex);
    if (path.endsWith("/get")) {
      const ctx = await assessmentContext(env, user, courseId, type, mi);
      return { assessment: safeAssessment(ctx.assessment) };
    }
    return runTransaction(env, async tx => {
      const ctx = await assessmentContext(env, user, courseId, type, mi, tx.get);
      const answers = Array.isArray(data.answers) ? data.answers : [];
      const questions = ctx.assessment.questions || [];
      if (!questions.length || answers.length !== questions.length) throw Object.assign(new Error("Answer every question."), { status: 400 });
      let correct = 0;
      questions.forEach((question, index) => {
        const key = answerIndex(question);
        if (key === null) throw Object.assign(new Error("Assessment configuration error."), { status: 500 });
        if (Number(answers[index]) === key) correct++;
      });
      const score = Math.round(correct / questions.length * 100);
      const passMark = Number(ctx.assessment.passMark || 70);
      const passed = score >= passMark;
      const now = new Date().toISOString();
      const updated = { ...ctx.progress, passedModuleQuizzes: { ...(ctx.progress.passedModuleQuizzes || {}) }, moduleQuizScores: { ...(ctx.progress.moduleQuizScores || {}) }, updatedAt: now };
      let certificate = null;
      if (type === "module") {
        updated.moduleQuizScores[String(mi)] = Math.max(Number(updated.moduleQuizScores[String(mi)] || 0), score);
        if (passed) updated.passedModuleQuizzes[String(mi)] = true;
      } else {
        updated.finalAssessmentScore = Math.max(Number(updated.finalAssessmentScore || 0), score);
        if (passed) {
          updated.finalAssessmentPassed = true;
          updated.status = "completed";
          const id = `${user.uid}_${courseId}`;
          const existing = await tx.get(`certificates/${id}`);
          if (!existing) {
            const verificationCode = await deterministicVerificationCode(`course:${id}`);
            const recipientName = humanName(user.profile);
            if (recipientName === "Learner") throw Object.assign(new Error("Complete your first and last name in your profile before a certificate can be issued."), { status: 409 });
            const record = { id, userId: user.uid, recipientId: user.uid, recipientName, recipientEmail: user.email || clean(user.profile.email), recipientEmailNormalized: normalized(user.email || user.profile.email), courseId, courseTitle: ctx.course.title || "Course", type: "course", status: "active", finalScore: score, verificationCode, issueDate: now.slice(0, 10), createdAt: now };
            tx.set(`certificates/${id}`, record);
            tx.set(`publicCertificateVerifications/${verificationCode}`, { recipientName: record.recipientName, awardTitle: record.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: record.issueDate, status: record.status, certificateNumber: id });
            certificate = { id, verificationCode };
          } else certificate = { id, verificationCode: existing.verificationCode };
          updated.certificateId = id;
        }
      }
      const finalProgress = publicProgress(updated, ctx.course);
      tx.set(ctx.progressPath, finalProgress);
      return { score, passMark, passed, progress: finalProgress, certificate };
    });
  }

  if (path === "/v1/admin/certificates/repair-names") {
    requireRole(user, ["admin", "super_admin"]);
    const certificatesPage = await listDocuments(env, "certificates");
    let repaired = 0, skipped = 0;
    for (const certificate of certificatesPage.documents) {
      const ownerId = clean(certificate.userId || certificate.recipientId || certificate.learnerId);
      if (!ownerId) { skipped++; continue; }
      const profile = await getDocument(env, `users/${safeId(ownerId, "learner identifier")}`);
      const name = profile ? humanName(profile) : "Learner";
      if (!profile || name === "Learner") { skipped++; continue; }
      if (clean(certificate.recipientName) !== name) {
        await setDocument(env, `certificates/${certificate.id}`, { ...certificate, recipientName: name, recipientId: ownerId, nameRepairedAt: new Date().toISOString() });
        const code = clean(certificate.verificationCode);
        if (code) {
          const projection = await getDocument(env, `publicCertificateVerifications/${code}`);
          if (projection) await setDocument(env, `publicCertificateVerifications/${code}`, { ...projection, recipientName: name, nameRepairedAt: new Date().toISOString() });
        }
        repaired++;
      }
    }
    return { ok: true, scanned: certificatesPage.documents.length, repaired, skipped, truncated: certificatesPage.truncated };
  }

  if (path === "/v1/admin/assessments/migrate") {
    requireAdmin(user);
    if (data.dryRun !== true) throw Object.assign(new Error("Only dry-run migration inventory is enabled."), { status: 409 });
    const [coursesPage, assessmentsPage, certificatesPage, projectionsPage, evidencePage] = await Promise.all([
      listDocuments(env, "courses"),
      listDocuments(env, "courseAssessments"),
      listDocuments(env, "certificates"),
      listDocuments(env, "publicCertificateVerifications"),
      listDocuments(env, "externalLearningRecords")
    ]);
    const assessmentIds = new Set(assessmentsPage.documents.map(item => item.id));
    let embeddedModuleAssessments = 0;
    let embeddedFinalAssessments = 0;
    let missingSecureAssessments = 0;
    for (const course of coursesPage.documents) {
      modulesOf(course).forEach((module, mi) => {
        if (!module.quiz) return;
        embeddedModuleAssessments++;
        if (!assessmentIds.has(assessmentId(course.id, "module", mi))) missingSecureAssessments++;
      });
      if (course.finalAssessment || course.finalQuiz) {
        embeddedFinalAssessments++;
        if (!assessmentIds.has(assessmentId(course.id, "final", 0))) missingSecureAssessments++;
      }
    }
    const certificateCodes = new Map();
    let certificatesMissingCode = 0;
    let duplicateVerificationCodes = 0;
    let missingPublicProjections = 0;
    const projectionIds = new Set(projectionsPage.documents.map(item => item.id));
    for (const certificate of certificatesPage.documents) {
      const code = clean(certificate.verificationCode);
      if (!code) certificatesMissingCode++;
      else {
        certificateCodes.set(code, (certificateCodes.get(code) || 0) + 1);
        if (!projectionIds.has(code)) missingPublicProjections++;
      }
    }
    certificateCodes.forEach(count => { if (count > 1) duplicateVerificationCodes += count - 1; });
    const orphanPublicProjections = projectionsPage.documents.filter(item => !certificateCodes.has(item.id)).length;
    const evidenceMetadataIncomplete = evidencePage.documents.filter(item => {
      const hasLegacyEvidence = Boolean(item.proofData || item.proofUrl || item.evidenceUrl || item.secureUrl);
      const hasAnySecureMetadata = Boolean(item.evidenceAssetId || item.evidencePublicId || item.evidenceVersion || item.evidenceFormat || item.evidenceResourceType);
      const hasCompleteSecureMetadata = Boolean(item.evidenceAssetId && item.evidencePublicId && item.evidenceVersion && item.evidenceFormat && item.evidenceResourceType);
      return hasLegacyEvidence || (hasAnySecureMetadata && !hasCompleteSecureMetadata);
    }).length;
    return {
      dryRun: true,
      generatedAt: new Date().toISOString(),
      writesPerformed: 0,
      assessments: {
        coursesScanned: coursesPage.documents.length,
        secureAssessments: assessmentsPage.documents.length,
        embeddedModuleAssessments,
        embeddedFinalAssessments,
        missingSecureAssessments
      },
      certificates: {
        certificatesScanned: certificatesPage.documents.length,
        publicProjections: projectionsPage.documents.length,
        certificatesMissingCode,
        duplicateVerificationCodes,
        missingPublicProjections,
        orphanPublicProjections
      },
      evidence: { recordsScanned: evidencePage.documents.length, evidenceMetadataIncomplete },
      truncated: [coursesPage, assessmentsPage, certificatesPage, projectionsPage, evidencePage].some(page => page.truncated),
      safeToMigrate: missingSecureAssessments === 0 && certificatesMissingCode === 0 && duplicateVerificationCodes === 0 && evidenceMetadataIncomplete === 0,
      message: "Inventory only. No data was changed. Back up Firestore and review every reported exception before enabling a migration write path."
    };
  }

  if (path === "/v1/admin/book-submissions/review") {
    requireAdmin(user);
    const submissionId = safeId(data.submissionId, "submission identifier");
    const decision = normalized(data.decision);
    if (!submissionId || !["approved", "rejected"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    return runTransaction(env, async tx => {
      const submission = await tx.get(`bookSubmissions/${submissionId}`);
      if (!submission) throw Object.assign(new Error("Submission not found."), { status: 404 });
      if (normalized(submission.status) !== "pending") throw Object.assign(new Error("This submission has already been reviewed."), { status: 409 });
      const now = new Date().toISOString();
      tx.set(`bookSubmissions/${submissionId}`, { ...submission, status: decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
      let bookId = null;
      if (decision === "approved") {
        bookId = safeId(clean(submission.bookId) || `submitted-${submissionId}`, "book identifier");
        tx.set(`books/${bookId}`, {
          title: submission.title || "Untitled resource", author: submission.authorName || "Independent contributor",
          category: submission.category || "general", audience: submission.audience || ["general"],
          shortDescription: submission.shortDescription || "", description: submission.description || "",
          coverUrl: submission.coverUrl || "", accessType: submission.accessType || "free",
          price: Number(submission.price || 0), currency: submission.currency || "₦",
          purchasePlatform: submission.purchasePlatform || "", purchaseUrl: submission.purchaseUrl || "",
          status: "active", source: "approved-submission", sourceSubmissionId: submissionId,
          createdAt: now, updatedAt: now
        });
      }
      return { ok: true, decision, bookId };
    });
  }

  if (path === "/v1/admin/external-learning/list") {
    requireAdmin(user);
    const page = await queryAllDocuments(env, "externalLearningRecords");
    const records = page.documents.map(({ proofData, proofUrl, evidenceUrl, secureUrl, ...record }) => record)
      .sort((a, b) => String(b.updatedAt || b.submittedAt || "").localeCompare(String(a.updatedAt || a.submittedAt || "")));
    return { records, truncated: page.truncated };
  }

  if (path === "/v1/admin/external-learning/review") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const decision = normalized(data.decision);
    if (!recordId || !["approved", "rejected", "resubmission_required"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    return runTransaction(env, async tx => {
      const record = await tx.get(`externalLearningRecords/${recordId}`);
      if (!record) throw Object.assign(new Error("Submission not found."), { status: 404 });
      if (!["pending_review", "pending", "submitted"].includes(normalized(record.status))) throw Object.assign(new Error("This submission is not awaiting review."), { status: 409 });
      if (decision === "approved") evidenceDescriptor(record);
      const now = new Date().toISOString();
      tx.set(`externalLearningRecords/${recordId}`, { ...record, status: decision, verificationStatus: decision === "approved" ? "verified" : decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
      let certificate = null;
      if (decision === "approved") {
        const recordCourseId = safeId(record.courseId, "course identifier");
        const recordUserId = safeId(record.userId, "user identifier");
        const id = `external_${recordUserId}_${recordCourseId}`;
        const existing = await tx.get(`certificates/${id}`);
        if (!existing) {
          const verificationCode = await deterministicVerificationCode(`external:${id}`);
          const certificateRecord = { id, userId: recordUserId, recipientName: record.learnerName || "Learner", courseId: recordCourseId, courseTitle: record.courseTitle || "External course", externalProvider: record.provider || "External Provider", sourceRecordId: recordId, type: "external-completion", status: "active", verificationCode, issueDate: now.slice(0, 10), createdAt: now };
          tx.set(`certificates/${id}`, certificateRecord);
          tx.set(`publicCertificateVerifications/${verificationCode}`, { recipientName: certificateRecord.recipientName, awardTitle: certificateRecord.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: certificateRecord.issueDate, status: certificateRecord.status, certificateNumber: id, achievementType: "externally-completed course verified by SpeakOut" });
          certificate = { id, verificationCode };
        } else certificate = { id, verificationCode: existing.verificationCode };
      }
      return { ok: true, decision, certificate };
    });
  }

  if (path === "/v1/admin/tv-curator/list") {
    requireAdmin(user);
    return curatorState(env);
  }

  if (path === "/v1/admin/tv-curator/source/save") {
    requireAdmin(user);
    return saveCuratorSource(env, user, data);
  }

  if (path === "/v1/admin/tv-curator/source/delete") {
    requireAdmin(user);
    const sourceId = safeId(data.id, "curator source identifier");
    return runTransaction(env, async tx => {
      const existing = await tx.get("tvCuratorSources/" + sourceId);
      if (!existing) throw Object.assign(new Error("Curator source not found."), { status: 404 });
      tx.delete("tvCuratorSources/" + sourceId);
      return { ok: true, id: sourceId };
    });
  }

  if (path === "/v1/admin/tv-curator/sync") {
    requireAdmin(user);
    const sourceId = clean(data.id) ? safeId(data.id, "curator source identifier") : "";
    const sync = await syncAllCuratorSources(env, user.uid, sourceId);
    const refresh = await refreshStoredYouTubeMetadata(env, user.uid);
    return { ...sync, metadataRefresh: refresh };
  }

  if (path === "/v1/admin/tv-curator/review") {
    requireAdmin(user);
    return reviewCuratorCandidate(env, user, data);
  }

  if (path === "/v1/admin/content/upsert") {
    requireAdmin(user);
    const collectionName = cmsCollection(data.collection);
    const record = cmsRecord(collectionName, data.record);
    const recordId = data.id ? safeId(data.id, "content identifier") : `cms-${crypto.randomUUID()}`;
    return runTransaction(env, async tx => {
      const existing = await tx.get(`${collectionName}/${recordId}`);
      const now = new Date().toISOString();
      const curatorSourceFields = collectionName === "tvEpisodes" && existing?.sourceType === "youtube-curated" ? {
        sourceType: existing.sourceType,
        sourceChannelTitle: existing.sourceChannelTitle,
        sourceChannelId: existing.sourceChannelId,
        sourceVideoId: existing.sourceVideoId,
        sourceUrl: existing.sourceUrl,
        sourceAttribution: existing.sourceAttribution,
        sourceTitle: existing.sourceTitle,
        sourceDescription: existing.sourceDescription,
        sourceThumbnailUrl: existing.sourceThumbnailUrl,
        youtubeMetadataRefreshedAt: existing.youtubeMetadataRefreshedAt,
        curatorManagedMetadata: false,
        curatedBySpeakOut: existing.curatedBySpeakOut === true
      } : {};
      tx.set(`${collectionName}/${recordId}`, {
        ...curatorSourceFields,
        ...record,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        updatedBy: user.uid
      });
      return { ok: true, id: recordId };
    });
  }

  if (path === "/v1/admin/content/status") {
    requireAdmin(user);
    const collectionName = cmsCollection(data.collection);
    const recordId = safeId(data.id, "content identifier");
    const status = normalized(data.status);
    if (!["active", "published", "draft", "hidden"].includes(status)) {
      throw Object.assign(new Error("Invalid content status."), { status: 400 });
    }
    return runTransaction(env, async tx => {
      const existing = await tx.get(`${collectionName}/${recordId}`);
      if (!existing) throw Object.assign(new Error("Content record not found."), { status: 404 });
      if (collectionName === "tvShows" && ["active", "published"].includes(status)) validatePublicTvShow(existing);
      const validated = collectionName === "tvEpisodes" && ["active", "published"].includes(status)
        ? cmsRecord(collectionName, { ...existing, status })
        : null;
      tx.set(`${collectionName}/${recordId}`, {
        ...existing,
        ...(validated || {}),
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      return { ok: true, id: recordId, status };
    });
  }

  if (path === "/v1/admin/content/delete") {
    requireAdmin(user);
    const collectionName = cmsCollection(data.collection);
    const recordId = safeId(data.id, "content identifier");
    return runTransaction(env, async tx => {
      const existing = await tx.get(`${collectionName}/${recordId}`);
      if (!existing) throw Object.assign(new Error("Content record not found."), { status: 404 });
      tx.delete(`${collectionName}/${recordId}`);
      return { ok: true, id: recordId };
    });
  }

  if (path.startsWith("/v1/admin/")) {
    throw Object.assign(new Error("This privileged endpoint is not enabled until its Phase 1 audit implementation is complete."), { status: 501 });
  }

  throw Object.assign(new Error("Endpoint not found."), { status: 404 });
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil((async()=>{
      await syncAllCuratorSources(env, "cloudflare-cron");
      await refreshStoredYouTubeMetadata(env, "cloudflare-cron");
    })().catch(error => console.error("TV curator scheduled sync:", error)));
  },
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const path = new URL(request.url).pathname;
    const publicGetPaths = new Set(["/v1/catalog/courses","/v1/media/tv","/v1/media/audio"]);
    const isPublicGet = request.method === "GET" && publicGetPaths.has(path);
    if (request.method !== "POST" && !isPublicGet) return json({ error: "Method not allowed." }, 405, headers);
    const origin = request.headers.get("origin") || "";
    if (origin && !headers["access-control-allow-origin"]) return json({ error: "Origin not allowed." }, 403);
    try {
      const type = request.headers.get("content-type") || "";
      let data = {};
      if (type.includes("application/json")) data = await request.json();
      else if (type.includes("multipart/form-data")) {
        const form = await request.formData();
        data = Object.fromEntries(form.entries());
      }
      const result = await route(request, env, path, data);
      if (result instanceof Response) {
        const responseHeaders = new Headers(result.headers);
        Object.entries(headers).forEach(([key, value]) => responseHeaders.set(key, value));
        return new Response(result.body, { status: result.status, statusText: result.statusText, headers: responseHeaders });
      }
      return json(result, 200, headers);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Request failed." }, error.status || 500, headers);
    }
  }
};
