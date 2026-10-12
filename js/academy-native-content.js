/* Native lesson previews remain separate from formal course assessment. */
(function (root) {
  'use strict';
  const aliases = {maths:'mathematics','english language':'english','agriculture science':'agricultural science','computer and it':'computer studies'};
  function subjectKey(value) {
    const key = String(value || '').trim().toLowerCase();
    return aliases[key] || key;
  }
  function levelKey(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^sss/, 'ss');
  }
  function filterLessons(lessons, subject, level) {
    return lessons.filter(l => (!subject || subjectKey(l.subject) === subjectKey(subject)) &&
      (!level || levelKey(l.level) === levelKey(level)));
  }
  function safeUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; }
    catch { return null; }
  }
  function signedReview(record, version) {
    return !!(version && record && record.status === 'approved' && record.version === version &&
      typeof record.reviewer === 'string' && record.reviewer.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt || '') && safeUrl(record.evidenceUrl));
  }
  function canEmbed(lesson) {
    const v = lesson.video;
    return !!(signedReview(lesson.review, lesson.contentVersion) &&
      lesson.reviewStatus === 'approved' && v && v.provider === 'youtube' &&
      /^[A-Za-z0-9_-]{11}$/.test(v.id || '') && v.reviewStatus === 'approved' &&
      signedReview(v.review, lesson.contentVersion) && v.creator && v.title &&
      v.sourceUrl === 'https://www.youtube.com/watch?v=' + v.id &&
      v.verification?.status === 'oembed-verified');
  }
  function renderExtras(container, lesson) {
    const make = (tag, text) => { const n = document.createElement(tag); n.textContent = text; return n; };
    const link = (label, url) => {
      const n = make('a', label), safe = safeUrl(url);
      if (safe) { n.href = safe; n.target = '_blank'; n.rel = 'noopener noreferrer'; }
      return n;
    };
    if (lesson.contentBatch) {
      container.append(make('p', 'Educator-review draft · ' + lesson.durationMinutes +
        ' minutes · Informal practice only; no formal grades or certificates.'));
      container.append(make('p', 'Before you start: ' + lesson.prerequisites));
    }
    for (const activity of lesson.activities || []) {
      container.append(make('h3', 'Practise: ' + activity.title), make('p', 'Materials: ' + activity.materials.join(', ')));
      const steps = document.createElement('ol');
      for (const step of activity.steps) steps.append(make('li', step));
      container.append(steps);
      const answer = document.createElement('details');
      answer.append(make('summary', 'Compare your activity with a worked response'), make('p', activity.expectedResponse));
      container.append(answer, make('p', 'Take it further: ' + activity.extension));
    }
    const video = lesson.video;
    if (video) {
      container.append(make('h3', 'Watch and reflect'));
      container.append(make('p', video.watchPrompt || 'Connect the video to the reading.'));
      if (canEmbed(lesson)) {
        const button = make('button', 'Load reviewed video');
        button.type = 'button';
        button.addEventListener('click', () => {
          const frame = document.createElement('iframe');
          frame.className = 'lesson-video';
          frame.title = video.title;
          frame.src = 'https://www.youtube-nocookie.com/embed/' + video.id;
          frame.loading = 'lazy';
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
          frame.allowFullscreen = true;
          button.replaceWith(frame);
        }, {once:true});
        container.append(make('p', 'Loading the video connects to YouTube. If playback is unavailable, use the complete reading and activity above.'), button);
        container.append(link('Open reviewed video on YouTube', video.sourceUrl));
      } else {
        container.append(make('p', 'Video playback is held for educator review. You can complete this lesson using the reading, activity and questions.'));
      }
      container.append(make('p', 'Video candidate: ' + video.title + ' — ' + video.creator));
      const candidate = document.createElement('details');
      candidate.append(make('summary', 'Video attribution and review evidence'));
      candidate.append(link('Creator channel: ' + video.creator, video.creatorUrl));
      candidate.append(make('p', 'Candidate only until approved. Embedding metadata checked: ' +
        (video.verification?.checkedAt || 'not checked') + '. This does not certify full playback or educational suitability.'));
      candidate.append(link('Open source video for educator review', video.sourceUrl));
      container.append(candidate);
    }
    if (lesson.curriculum) {
      const c = lesson.curriculum, source = document.createElement('details');
      source.append(make('summary', 'Topic source and curriculum mapping'));
      source.append(link(c.source + ' — ' + c.topic, c.sourceUrl));
      source.append(make('p', c.sourceLevel + ' · ' + c.sourceSubject + ' · Topic listing checked ' + c.verifiedAt));
      source.append(make('p', c.verificationScope + ' Curriculum edition and detailed outcome alignment remain unverified.'));
      source.append(make('p', 'Lesson text, examples and questions are original SpeakOut writing. Linked sources and externally hosted videos retain their owners’ rights.'));
      container.append(source);
    }
    if (lesson.facilitator) {
      const f = lesson.facilitator, notes = document.createElement('details');
      notes.append(make('summary', 'Facilitator guidance and review checklist'));
      for (const [label, key] of [['Suggested timing','timing'],['Common misconception','misconception'],['Support','support'],['Challenge','challenge'],['Review focus','reviewFocus']]) {
        notes.append(make('p', label + ': ' + f[key]));
      }
      notes.append(make('p', 'Review status: pending independent educator decision. Check the exact content version, curriculum mapping, answer key, full video, accessibility and safeguarding before recording approval.'));
      container.append(notes);
    }
  }
  root.AcademyNativeContent = {subjectKey, levelKey, filterLessons, safeUrl, signedReview, canEmbed, renderExtras};
})(globalThis);
