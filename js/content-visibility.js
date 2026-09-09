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
  if (!hasPublicStatus(item) || !hasText(item.title) || !hasText(item.category)) return false;

  const type = normalize(item.courseType || item.type || "internal");
  if (type === "external" || normalize(item.completionMethod) === "certificate-upload" || item.externalProvider === true) {
    const editorial = [item.title, item.shortDescription, item.description, item.outcomes, item.prerequisites, item.tags];
    return hasText(item.provider) &&
      [item.externalUrl, item.courseUrl, item.providerCourseUrl].some(hasValidWebUrl) &&
      countWords(editorial) >= CONTENT_THRESHOLDS.externalCourseEditorialWords;
  }

  if (type === "instructor-led") {
    return [item.enrollmentUrl, item.contactUrl].some(hasValidWebUrl);
  }

  const curriculum = [item.description, item.shortDescription, item.outcomes, item.prerequisites, item.modules, item.finalAssessment];
  return countWords(curriculum) >= CONTENT_THRESHOLDS.internalCourseWords &&
    Array.isArray(item.modules) && item.modules.length > 0 && item.modules.every(module => (
    hasText(module?.title) && Array.isArray(module.lessons) && module.lessons.length > 0 && module.lessons.every(hasCompleteLesson)
  ));
}

export function isPublicBook(item = {}) {
  if (!hasPublicStatus(item) || !hasText(item.title) || !hasText(item.category)) return false;
  if (!hasText(item.shortDescription) && !hasText(item.description)) return false;

  const hasAuthor = hasText(item.author) || hasText(item.authorName);
  const hasCover = hasSafeAssetPath(item.coverUrl) || hasSafeAssetPath(item.coverImage);
  const chapterList = Array.isArray(item.chapters) ? item.chapters : [];
  const hasStructuredChapters = chapterList.length >= 3 && chapterList.every(chapter => hasText(chapter?.title));
  const hasChapterBodies = hasStructuredChapters && chapterList.every(chapter => hasText(chapter.content) || hasText(chapter.body));
  const hasUnifiedBody = hasStructuredChapters && hasText(item.content);
  const hasChapters = hasChapterBodies || hasUnifiedBody;
  const hasDestination = [item.purchaseUrl, item.downloadUrl, item.bookUrl, item.fileUrl, item.readUrl].some(hasValidWebUrl) || hasChapters;

  return hasAuthor && hasCover && hasDestination &&
    countWords([item.content, chapterList.map(chapter => [chapter.content, chapter.body])]) >= CONTENT_THRESHOLDS.bookWords;
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
