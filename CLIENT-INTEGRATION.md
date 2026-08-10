# SpeakHub Secure Learning — Client Integration

The V4 player must stop scoring locally and stop writing userProgress/certificates directly.

Use Firebase Functions Web SDK:

```js
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-functions.js";

const functions = getFunctions();

const getLearningStateFn = httpsCallable(functions, "getLearningState");
const markLessonCompleteFn = httpsCallable(functions, "markLessonComplete");
const getAssessmentFn = httpsCallable(functions, "getAssessment");
const submitAssessmentFn = httpsCallable(functions, "submitAssessment");
```

## Mark a lesson complete

```js
const result = await markLessonCompleteFn({
  courseId,
  lessonId: lesson.id
});

applyServerProgress(result.data.progress);
```

The backend rejects an attempt to complete a locked lesson.

## Load a module quiz

```js
const result = await getAssessmentFn({
  courseId,
  type: "module",
  moduleIndex
});

renderServerAssessment(result.data.assessment);
```

The returned questions contain NO answer keys.

## Submit a module quiz

```js
const result = await submitAssessmentFn({
  courseId,
  type: "module",
  moduleIndex,
  answers // array of selected option indexes
});

if (result.data.passed) {
  // next module may now unlock
}
```

## Final assessment

```js
const exam = await getAssessmentFn({
  courseId,
  type: "final"
});

const result = await submitAssessmentFn({
  courseId,
  type: "final",
  answers
});

if (result.data.passed && result.data.certificate) {
  location.href =
    `certificate-view.html?id=${encodeURIComponent(result.data.certificate.id)}`;
}
```

The final callable:
1. re-checks 100% course requirements,
2. scores answers server-side,
3. confirms the pass mark,
4. creates one idempotent certificate,
5. returns only certificate metadata to the browser.

Do not retain the old V4 functions that calculate quiz scores from `q.answer`,
write `userProgress` with `setDoc`, or create `certificates` in browser JavaScript.
