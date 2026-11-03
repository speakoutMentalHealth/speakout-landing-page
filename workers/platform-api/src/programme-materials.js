// Private facilitator handouts. Metadata is server-only and files never have public URLs.
const err = (message, status = 400) => Object.assign(new Error(message), { status });
const str = value => String(value == null ? "" : value).trim();
const roleOf = user => str(user?.profile?.actualRole || user?.profile?.role).toLowerCase();
const safeId = value => {
  const id = str(value);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw err("Invalid identifier.");
  return id;
};
const safeFileName = value => str(value).replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 110) || "resource";
const fileTypes = Object.freeze({
  "application/pdf": ["pdf", "raw"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx", "raw"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx", "raw"],
  "image/png": ["png", "image"],
  "image/jpeg": ["jpg", "image"]
});

export function canAccessProgrammeMaterial(user, programme, publish = false) {
  if (!programme || !user?.uid) return false;
  const role = roleOf(user);
  if (role === "super_admin") return true;
  const schoolId = str(user.profile?.schoolId);
  const schoolCode = str(user.profile?.schoolCode);
  const sameSchool = schoolId
    ? schoolId === str(programme.schoolId)
    : Boolean(schoolCode && schoolCode === str(programme.schoolCode));
  if (!sameSchool) return false;
  if (["school_admin", "school", "admin"].includes(role)) return true;
  if (publish || role !== "teacher") return false;
  return programme.createdBy === user.uid ||
    (Array.isArray(programme.facilitatorIds) && programme.facilitatorIds.includes(user.uid));
}

export function validateProgrammeMaterialFile(file) {
  if (typeof File === "undefined" || !(file instanceof File)) throw err("Select a file.");
  const type = fileTypes[file.type];
  if (!type || file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw err("Use a PDF, Word DOCX, PowerPoint PPTX, JPG or PNG file, up to 10 MB.");
  }
  return { format:type[0], resourceType:type[1], contentType:file.type };
}

export async function programmeMaterialsRoute({path, data, user, env, getDocument, queryDocumentsByField, transactionalSet, runTransaction, sha1Hex, sha1Base64Url}) {
  const programmeId = path === "/v1/programme-materials/download" || path === "/v1/programme-materials/archive" ? "" : safeId(data.programmeId);
  let material = null;
  if (!programmeId) {
    const materialId = safeId(data.materialId);
    material = await getDocument(env, "programmeMaterials/" + materialId);
    if (!material) throw err("Material not found.", 404);
  }
  const id = programmeId || safeId(material.programmeId);
  const programme = await getDocument(env, "programmes/" + id);
  if (!programme) throw err("Programme not found.", 404);
  const publish = ["/v1/programme-materials/upload", "/v1/programme-materials/archive"].includes(path);
  if (!canAccessProgrammeMaterial(user, programme, publish)) throw err("This material is not available to your account.", 403);

  if (path === "/v1/programme-materials/list") {
    const page = await queryDocumentsByField(env, "programmeMaterials", "programmeId", id, 300);
    const materials = page.documents
      .filter(item => item.status === "active" && item.schoolId === programme.schoolId)
      .map(item => ({
        id:item.id, programmeId:id, title:item.title, note:item.note || "",
        week:Number(item.week || 0), fileName:item.fileName,
        createdAt:item.createdAt, uploadedBy:item.uploadedBy
      }))
      .sort((a,b) => a.week - b.week || String(b.createdAt).localeCompare(String(a.createdAt)));
    return { ok:true, programmeName:str(programme.name), materials, truncated:page.truncated };
  }

  if (path === "/v1/programme-materials/upload") {
    const file = data.file;
    const type = validateProgrammeMaterialFile(file);
    const title = str(data.title).slice(0, 140);
    const note = str(data.note).slice(0, 800);
    const week = Number(data.week || 0);
    if (title.length < 3) throw err("Enter a descriptive title (at least three characters).");
    if (!Number.isInteger(week) || week < 0 || week > 24) throw err("Choose a valid week from 1 to 24, or General.");
    const materialId = safeId("material_" + crypto.randomUUID());
    const assetId = crypto.randomUUID();
    const fileName = safeFileName(title).replace(/\.[^.]+$/, "") + "." + type.format;
    const folder = "speakout/private-programme-materials/" + id;
    const objectName = crypto.randomUUID();
    const key = folder + "/" + objectName + "." + type.format;
    let uploaded;

    if (env.EVIDENCE_BUCKET) {
      const stored = await env.EVIDENCE_BUCKET.put(key, file.stream(), {
        httpMetadata:{
          contentType:type.contentType,
          contentDisposition:"attachment; filename=\"" + fileName + "\"",
          cacheControl:"private, no-store, max-age=0"
        },
        customMetadata:{schoolId:str(programme.schoolId), programmeId:id, materialId, assetId}
      });
      if (!stored) throw err("Private file upload failed.", 502);
      uploaded = { storage:"r2", publicId:key, assetId, version:1 };
    } else {
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        throw err("Private resource storage is not configured.", 503);
      }
      const timestamp = Math.floor(Date.now() / 1000);
      const cloudName = type.resourceType === "raw" ? objectName + "." + type.format : objectName;
      const signature = await sha1Hex("folder=" + folder + "&public_id=" + cloudName +
        "&timestamp=" + timestamp + "&type=authenticated" + env.CLOUDINARY_API_SECRET);
      const upload = new FormData();
      upload.append("file", file);
      upload.append("api_key", env.CLOUDINARY_API_KEY);
      upload.append("timestamp", String(timestamp));
      upload.append("folder", folder);
      upload.append("public_id", cloudName);
      upload.append("type", "authenticated");
      upload.append("signature", signature);
      const response = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(env.CLOUDINARY_CLOUD_NAME) +
        "/" + type.resourceType + "/upload", {method:"POST", body:upload});
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.public_id) throw err("Private resource upload failed.", 502);
      uploaded = { storage:"cloudinary", publicId:result.public_id, assetId:str(result.asset_id) || assetId, version:Number(result.version || 1) };
    }
    const record = {
      programmeId:id, schoolId:str(programme.schoolId), title, note, week, fileName,
      fileContentType:type.contentType, fileFormat:type.format, fileResourceType:type.resourceType,
      fileStorage:uploaded.storage, filePublicId:uploaded.publicId, fileVersion:uploaded.version,
      fileAssetId:uploaded.assetId, uploadedBy:user.uid, status:"active",
      createdAt:new Date().toISOString()
    };
    try {
      await transactionalSet(env, "programmeMaterials/" + materialId, record);
    } catch (error) {
      if (uploaded.storage === "r2" && env.EVIDENCE_BUCKET) await env.EVIDENCE_BUCKET.delete(uploaded.publicId).catch(() => null);
      throw error;
    }
    return { ok:true, material:{id:materialId, title, note, week, fileName} };
  }

  if (path === "/v1/programme-materials/archive") {
    if (material.schoolId !== programme.schoolId) throw err("School mismatch.", 403);
    await runTransaction(env, async tx => {
      const current = await tx.get("programmeMaterials/" + material.id);
      if (!current || current.programmeId !== id || current.schoolId !== programme.schoolId) throw err("Material not found.", 404);
      tx.patch("programmeMaterials/" + material.id, {status:"archived", archivedBy:user.uid, archivedAt:new Date().toISOString()});
    });
    return { ok:true };
  }

  if (path === "/v1/programme-materials/download") {
    if (material.schoolId !== programme.schoolId || material.status !== "active") throw err("Material not available.", 404);
    const headers = {
      "content-type":str(material.fileContentType) || "application/octet-stream",
      "content-disposition":"attachment; filename=\"" + safeFileName(material.fileName) + "\"",
      "cache-control":"private, no-store, max-age=0",
      "x-content-type-options":"nosniff",
      "x-robots-tag":"noindex, nofollow"
    };
    if (material.fileStorage === "r2") {
      if (!env.EVIDENCE_BUCKET) throw err("Private storage is unavailable.", 503);
      const file = await env.EVIDENCE_BUCKET.get(str(material.filePublicId));
      if (!file) throw err("Private file not found.", 404);
      const metadata = file.customMetadata || {};
      if (metadata.programmeId !== id || metadata.materialId !== material.id ||
          metadata.schoolId !== programme.schoolId || metadata.assetId !== material.fileAssetId) {
        throw err("Private file ownership check failed.", 403);
      }
      return new Response(file.body, {status:200, headers});
    }
    if (material.fileStorage !== "cloudinary" || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_SECRET) {
      throw err("Private file provider unavailable.", 503);
    }
    const resourceType = material.fileResourceType === "image" ? "image" : "raw";
    const fileId = str(material.filePublicId);
    if (!fileId.startsWith("speakout/private-programme-materials/" + id + "/")) throw err("File ownership mismatch.", 403);
    const deliveryTail = "v" + Number(material.fileVersion || 1) + "/" +
      fileId.split("/").map(encodeURIComponent).join("/") +
      (resourceType === "image" ? "." + str(material.fileFormat) : "");
    const signature = (await sha1Base64Url(deliveryTail + env.CLOUDINARY_API_SECRET)).slice(0,8);
    const response = await fetch("https://res.cloudinary.com/" + encodeURIComponent(env.CLOUDINARY_CLOUD_NAME) + "/" +
      resourceType + "/authenticated/s--" + signature + "--/" + deliveryTail);
    if (!response.ok || !response.body) throw err("Private file retrieval failed.", 502);
    return new Response(response.body, {status:200, headers});
  }
  throw err("Unknown material action.", 404);
}
