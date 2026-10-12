import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const data = JSON.parse(read('data/academy-native-lessons.json'));
const batch = data.lessons.filter(l => l.contentBatch === 'nigeria-complete-lessons-2026-10');
const context = vm.createContext({URL});
vm.runInContext(read('js/academy-native-content.js'), context);
const api = context.AcademyNativeContent;

test('complete batch has substantive original lessons, valid answers and traceable topic/video evidence', () => {
  assert.equal(batch.length, 12);
  assert.equal(new Set(data.lessons.map(l => l.id)).size, data.lessons.length);
  assert.equal(new Set(batch.map(l => l.subject)).size, 7);
  assert.equal(new Set(batch.map(l => l.level)).size, 6);
  for (const l of batch) {
    assert.equal(l.sections.length, 4, l.id);
    assert.ok(l.sections.map(s=>s.text).join(' ').split(/\s+/).length >= 180, l.id);
    assert.equal(l.questions.length, 5, l.id);
    assert.ok(l.activities[0].steps.length >= 3);
    assert.ok(l.activities[0].expectedResponse.length > 50);
    for (const q of l.questions) {
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length);
      assert.equal(new Set(q.choices).size, q.choices.length);
      assert.ok(q.explanation.length > 35);
    }
    assert.equal(l.rights.text, 'original-speakout');
    assert.equal(l.curriculum.editionStatus, 'unverified');
    assert.match(l.curriculum.sourceUrl, /^https:\/\/inspire\.education\.gov\.ng\/lessons\/\d+\/preview$/);
    assert.equal(l.curriculum.sourceLevel, l.level);
    assert.ok(l.facilitator.support && l.facilitator.misconception && l.facilitator.reviewFocus);
    assert.match(l.video.id, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(l.video.sourceUrl, 'https://www.youtube.com/watch?v=' + l.video.id);
    assert.equal(l.video.verification.status, 'oembed-verified');
    assert.ok(l.video.creator && l.video.creatorUrl && l.video.watchPrompt);
    assert.equal(l.publicationStatus, 'review-preview');
    assert.equal(l.reviewStatus, 'pending');
    assert.equal(l.review.reviewer, null);
    assert.equal(api.canEmbed(l), false);
  }
});

function approvedFixture() {
  const l = structuredClone(batch[0]);
  const review = {status:'approved',version:l.contentVersion,reviewer:'Fixture educator',reviewedAt:'2026-10-12',evidenceUrl:'https://example.org/review/1'};
  l.reviewStatus = 'approved';
  l.review = {...review};
  l.video.reviewStatus = 'approved';
  l.video.review = {...review};
  return l;
}
test('video gate requires separate version-specific lesson and video decisions', () => {
  const l = approvedFixture();
  assert.equal(api.canEmbed(l), true);
  for (const mutate of [
    x=>{x.review.status='pending';}, x=>{x.video.review.status='pending';},
    x=>{x.video.review.reviewer='';}, x=>{x.review.evidenceUrl='javascript:alert(1)';},
    x=>{x.video.id='../unsafe';}, x=>{x.video.provider='arbitrary';},
    x=>{x.video.sourceUrl='https://example.org/wrong';},
    x=>{x.contentVersion++;}, x=>{x.video.verification.status='unverified';},
    x=>{x.reviewStatus='pending';}, x=>{x.video.reviewStatus='pending';}
  ]) {
    const changed = structuredClone(l); mutate(changed);
    assert.equal(api.canEmbed(changed), false);
  }
  assert.equal(api.canEmbed({video:{provider:'youtube',id:l.video.id,reviewStatus:'approved'}}), false);
});
test('subject aliases and class formatting return correct lesson sets', () => {
  assert.equal(api.filterLessons(data.lessons,'English','JSS1').length,2);
  assert.equal(api.filterLessons(data.lessons,'Agriculture Science','JSS 1').length,2);
  assert.equal(api.filterLessons(data.lessons,'Chemistry','SSS1').length,2);
  assert.equal(api.filterLessons(data.lessons,'Mathematics','Primary 4')[0].id,'p4-maths-naira-change');
  assert.equal(api.filterLessons(data.lessons,'Physics','Primary 2').length,0);
  assert.equal(api.safeUrl('javascript:alert(1)'),null);
  assert.equal(api.safeUrl('https://user:pass@example.org/'),null);
});
class Element {
  constructor(tag) { this.tag=tag; this.children=[]; this.events={}; this.textContent=''; }
  append(...items) { this.children.push(...items); }
  addEventListener(name, fn) { this.events[name]=fn; }
  replaceWith(item) { this.replacement=item; }
}
function render(l) {
  const nodes=[];
  context.document={createElement(tag){const e=new Element(tag);nodes.push(e);return e;}};
  const container=new Element('div');
  api.renderExtras(container,l);
  return {nodes,container};
}
test('pending media creates no iframe; approved media contacts YouTube only on click', () => {
  const draft=render(batch[0]);
  assert.equal(draft.nodes.filter(n=>n.tag==='iframe').length,0);
  assert.ok(draft.nodes.some(n=>n.textContent.includes('held for educator review')));
  assert.ok(draft.nodes.some(n=>n.textContent.includes('Compare your activity')));
  const approved=render(approvedFixture());
  assert.equal(approved.nodes.filter(n=>n.tag==='iframe').length,0);
  const load=approved.nodes.find(n=>n.tag==='button');
  load.events.click();
  assert.equal(load.replacement.src,'https://www.youtube-nocookie.com/embed/'+batch[0].video.id);
  assert.equal(load.replacement.title,batch[0].video.title);
});
test('markup-like lesson content is text and pending source URLs cannot inject scripts', () => {
  const l=structuredClone(batch[0]);
  l.activities[0].title='<img src=x onerror=alert(1)>';
  l.video.creatorUrl='javascript:alert(1)';
  const {nodes}=render(l);
  assert.ok(nodes.some(n=>n.textContent.includes('<img src=x onerror=alert(1)>')));
  assert.equal(nodes.filter(n=>n.tag==='img').length,0);
  assert.equal(nodes.find(n=>n.textContent.startsWith('Creator channel')).href,undefined);
});
test('native practice retains isolated draft sync and catalogue deep links', () => {
  const page=read('pages/academy-native-lessons.html');
  assert.ok(page.includes("kind:'unreviewed-draft-practice'"));
  assert.ok(page.includes("'academyDraftPractice'"));
  assert.ok(page.includes("profile.data().status==='approved'"));
  assert.ok(page.includes("answered!==l.questions.length"));
  assert.ok(page.includes('AcademyNativeContent.renderExtras(content,l)'));
  assert.ok(!page.includes("l.video.reviewStatus==='approved'"));
  const catalogue=read('pages/academy-subject-materials.html');
  assert.ok(catalogue.includes('AcademyNativeContent.filterLessons'));
  assert.ok(catalogue.includes("params.get('level')"));
  assert.ok(catalogue.includes('Native lesson catalogue is temporarily unavailable'));
  assert.ok(catalogue.includes('educator review pending'));
});
