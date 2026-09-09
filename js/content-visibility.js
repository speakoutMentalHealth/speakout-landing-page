const normalize = value => String(value ?? "").trim().toLowerCase();
const hasText = value => typeof value === "string" && value.trim().length > 0;

export const CONTENT_THRESHOLDS = Object.freeze({
  internalCourseWords: 5000,
  externalCourseEditorialWords: 75,
  bookWords: 2500,
});

export function countWords(value) {
  const text = Array.isArray(value)
    ? value.map(countableText).join(" ")
    : countableText(value);
  return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
}

function countableText(value) {
  if (typeof value === "string") return value.replace(/<[^>]*>/g, " ");
  if (Array.isArray(value)) return value.map(countableText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(countableText).join(" ");
  return "";
}

export function hasPublicStatus(item = {}) {
  return ["active", "published"].includes(normalize(item.status));
}

function hasValidWebUrl(value) {
  if (!hasText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasSafeAssetPath(value) {
  if (!hasText(value) || value.includes("..") || /["'<>]/.test(value)) return false;
  return /^(?:\.\/)?(?:images|assets)\/[a-z0-9/_\-.]+$/i.test(value) || hasValidWebUrl(value);
}

function hasCompleteLesson(lesson = {}) {
  return hasText(lesson.title) && (
    hasText(lesson.content) ||
    hasText(lesson.videoUrl) ||
    hasText(lesson.audioUrl) ||
    hasText(lesson.resourceUrl)
  );
}

export function isPublicCourse(item = {}) {
  return hasPublicStatus(item) && courseReadiness(item).ready;
}

export function courseReadiness(item = {}) {
  const reasons = [];
  if (!hasText(item.title)) reasons.push("Add a title");
  if (!hasText(item.category)) reasons.push("Choose a category");

  const type = normalize(item.courseType || item.type || "internal");
  if (type === "external" || normalize(item.completionMethod) === "certificate-upload" || item.externalProvider === true) {
    const editorial = [item.title, item.shortDescription, item.description, item.outcomes, item.prerequisites, item.tags];
    const wordCount = countWords(editorial);
    if (!hasText(item.provider)) reasons.push("Name the external provider");
    if (![item.externalUrl, item.courseUrl, item.providerCourseUrl].some(hasValidWebUrl)) reasons.push("Add a valid provider URL");
    if (wordCount < CONTENT_THRESHOLDS.externalCourseEditorialWords) reasons.push(`Add ${CONTENT_THRESHOLDS.externalCourseEditorialWords - wordCount} more editorial words`);
    return { ready: reasons.length === 0, reasons, wordCount, minimumWords: CONTENT_THRESHOLDS.externalCourseEditorialWords, kind: "external-course" };
  }

  if (type === "instructor-led") {
    const wordCount = countWords([item.description, item.shortDescription, item.outcomes, item.prerequisites]);
    if (![item.enrollmentUrl, item.contactUrl].some(hasValidWebUrl)) reasons.push("Add a valid enrollment or contact URL");
    if (wordCount < CONTENT_THRESHOLDS.externalCourseEditorialWords) reasons.push(`Add ${CONTENT_THRESHOLDS.externalCourseEditorialWords - wordCount} more editorial words`);
    return { ready: reasons.length === 0, reasons, wordCount, minimumWords: CONTENT_THRESHOLDS.externalCourseEditorialWords, kind: "instructor-led-course" };
  }

  const curriculum = [item.description, item.shortDescription, item.outcomes, item.prerequisites, item.modules, item.finalAssessment];
  const wordCount = countWords(curriculum);
  const completeModules = Array.isArray(item.modules) && item.modules.length > 0 && item.modules.every(module => (
    hasText(module?.title) && Array.isArray(module.lessons) && module.lessons.length > 0 && module.lessons.every(hasCompleteLesson)
  ));
  if (!completeModules) reasons.push("Add complete embedded modules and lessons");
  if (wordCount < CONTENT_THRESHOLDS.internalCourseWords) reasons.push(`Add ${CONTENT_THRESHOLDS.internalCourseWords - wordCount} more curriculum words`);
  return { ready: reasons.length === 0, reasons, wordCount, minimumWords: CONTENT_THRESHOLDS.internalCourseWords, kind: "internal-course" };
}

export function isPublicBook(item = {}) {
  return hasPublicStatus(item) && bookReadiness(item).ready;
}

export function bookReadiness(item = {}) {
  const reasons = [];
  if (!hasText(item.title)) reasons.push("Add a title");
  if (!hasText(item.category)) reasons.push("Choose a category");
  if (!hasText(item.shortDescription) && !hasText(item.description)) reasons.push("Add a description");

  const hasAuthor = hasText(item.author) || hasText(item.authorName);
  const hasCover = hasSafeAssetPath(item.coverUrl) || hasSafeAssetPath(item.coverImage);
  const chapterList = Array.isArray(item.chapters) ? item.chapters : [];
  const hasStructuredChapters = chapterList.length >= 3 && chapterList.every(chapter => hasText(chapter?.title));
  const hasChapterBodies = hasStructuredChapters && chapterList.every(chapter => hasText(chapter.content) || hasText(chapter.body));
  const hasUnifiedBody = hasStructuredChapters && hasText(item.content);
  const hasChapters = hasChapterBodies || hasUnifiedBody;
  const hasDestination = [item.purchaseUrl, item.downloadUrl, item.bookUrl, item.fileUrl, item.readUrl].some(hasValidWebUrl) || hasChapters;
  const wordCount = countWords([item.content, item.readerHtml, item.contentHtml, chapterList.map(chapter => [chapter.content, chapter.body])]);
  if (!hasAuthor) reasons.push("Add an author");
  if (!hasCover) reasons.push("Add a safe cover image");
  if (!hasStructuredChapters) reasons.push("Add at least three titled chapters");
  if (!hasDestination) reasons.push("Add readable chapter content or a valid destination");
  if (wordCount < CONTENT_THRESHOLDS.bookWords) reasons.push(`Add ${CONTENT_THRESHOLDS.bookWords - wordCount} more content words`);
  return { ready: reasons.length === 0, reasons, wordCount, minimumWords: CONTENT_THRESHOLDS.bookWords, kind: "book" };
}

const COURSE_COVERS = Object.freeze({
  "mental-health": "images/learning-covers/course-mental-health-v1.png",
  leadership: "images/learning-covers/course-leadership-v1.png",
  "digital-skills": "images/learning-covers/course-digital-skills-v1.png",
  programming: "images/learning-covers/course-digital-skills-v1.png",
  "artificial-intelligence": "images/learning-covers/course-digital-skills-v1.png",
  career: "images/learning-covers/course-career-v1.png",
  "career-development": "images/learning-covers/course-career-v1.png",
  "financial-literacy": "images/learning-covers/course-financial-literacy-v1.png",
});

export function courseCoverUrl(item = {}) {
  return hasSafeAssetPath(item.coverUrl)
    ? item.coverUrl
    : COURSE_COVERS[normalize(item.category)] || "images/learning-covers/course-career-v1.png";
}
