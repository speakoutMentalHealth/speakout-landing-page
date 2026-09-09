const normalize = value => String(value ?? "").trim().toLowerCase();
const hasText = value => typeof value === "string" && value.trim().length > 0;

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
  if (!hasText(item.shortDescription) && !hasText(item.description)) return false;

  const type = normalize(item.courseType || item.type || "internal");
  if (type === "external" || normalize(item.completionMethod) === "certificate-upload" || item.externalProvider === true) {
    return hasText(item.provider) && [item.externalUrl, item.courseUrl, item.providerCourseUrl].some(hasValidWebUrl);
  }

  if (type === "instructor-led") {
    return [item.enrollmentUrl, item.contactUrl].some(hasValidWebUrl);
  }

  return Array.isArray(item.modules) && item.modules.length > 0 && item.modules.every(module => (
    hasText(module?.title) && Array.isArray(module.lessons) && module.lessons.length > 0 && module.lessons.every(hasCompleteLesson)
  ));
}

export function isPublicBook(item = {}) {
  if (!hasPublicStatus(item) || !hasText(item.title) || !hasText(item.category)) return false;
  if (!hasText(item.shortDescription) && !hasText(item.description)) return false;

  const hasAuthor = hasText(item.author) || hasText(item.authorName);
  const hasCover = hasValidWebUrl(item.coverUrl) || hasValidWebUrl(item.coverImage);
  const hasChapters = Array.isArray(item.chapters) && item.chapters.length > 0 && item.chapters.every(chapter => (
    hasText(chapter?.title) && (hasText(chapter.content) || hasText(chapter.body))
  ));
  const hasDestination = [item.purchaseUrl, item.downloadUrl, item.bookUrl, item.fileUrl, item.readUrl].some(hasValidWebUrl) || hasChapters;

  return hasAuthor && hasCover && hasDestination;
}
