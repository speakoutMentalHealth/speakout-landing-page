import { db } from '../firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const id = new URLSearchParams(location.search).get('id');
const heading = document.getElementById('story-heading');
const status = document.getElementById('story-status');
const category = document.getElementById('story-category');
const meta = document.getElementById('story-meta');
const image = document.getElementById('story-image');
const intro = document.getElementById('story-intro');
const body = document.getElementById('story-body');
const external = document.getElementById('story-external');

function safeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const url = new URL(raw, document.baseURI);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch { return null; }
}
async function loadArticle() {
  if (!id || !/^[A-Za-z0-9_-]{1,180}$/.test(id)) {
    heading.textContent = 'Story unavailable';
    status.textContent = 'This story link is invalid. Browse News & Events for current updates.';
    return;
  }
  try {
    const snap = await getDoc(doc(db, 'newsEvents', id));
    const item = snap.exists() ? snap.data() : null;
    if (!item || !['active', 'published'].includes(item.status) ||
        typeof item.title !== 'string' || !item.title.trim()) {
      heading.textContent = 'Story unavailable';
      status.textContent = 'This story is not available for public viewing.';
      return;
    }
    heading.textContent = item.title.slice(0, 150);
    document.title = item.title.slice(0, 100) + ' | SpeakOut News';
    category.textContent = String(item.category || 'News').slice(0, 40);
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) {
      const date = document.createElement('time');
      date.dateTime = item.date;
      date.textContent = new Date(item.date + 'T12:00:00Z').toLocaleDateString('en-NG', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
      });
      meta.append(date);
    }
    if (item.location) meta.append(' · ' + String(item.location).slice(0, 80));
    const photo = safeUrl(item.imageUrl);
    if (photo) {
      image.src = photo.href;
      image.alt = 'Illustration for ' + item.title;
      image.hidden = false;
    }
    intro.textContent = String(item.description || '').slice(0, 1400);
    const article = String(item.body || '').slice(0, 12000);
    for (const paragraph of article.split(/\n\s*\n/g).map(p => p.trim()).filter(Boolean)) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      body.append(p);
    }
    const more = safeUrl(item.url);
    if (more) {
      const a = document.createElement('a');
      a.textContent = 'Additional information ↗';
      a.href = more.href;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      external.append(a);
    }
    status.textContent = '';
  } catch {
    heading.textContent = 'Story temporarily unavailable';
    status.textContent = 'We could not load this story. Please try again or browse News & Events.';
  }
}
loadArticle();
