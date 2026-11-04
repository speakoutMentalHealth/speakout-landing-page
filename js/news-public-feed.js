import { db } from '../firebase-config.js';
import {
  collection, getDocs, query, where
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const list = document.getElementById('news-live-grid');
const message = document.getElementById('news-live-status');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) &&
  !Number.isNaN(Date.parse(value + 'T00:00:00Z'));

function safeUrl(value, image = false) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value, document.baseURI);
    if (url.username || url.password || url.protocol !== 'https:') return null;
    if (!image && url.origin !== location.origin &&
        url.hostname.endsWith('.invalid')) return null;
    return url.href;
  } catch { return null; }
}
function renderArticle(item) {
  const article = document.createElement('article');
  article.className = 'event-card news-live-card';
  if (item.imageUrl) {
    const imageUrl = safeUrl(item.imageUrl, true);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = item.title || 'SpeakOut event image';
      image.loading = 'lazy';
      article.append(image);
    }
  }
  const info = document.createElement('div');
  const category = document.createElement('span');
  category.textContent = String(item.category || 'News').slice(0, 40);
  const title = document.createElement('h3');
  title.textContent = String(item.title || '').slice(0, 150);
  const description = document.createElement('p');
  description.textContent = String(item.description || '').slice(0, 1400);
  info.append(category, title);
  if (validDate(item.date)) {
    const date = document.createElement('p');
    const time = document.createElement('time');
    time.dateTime = item.date;
    time.textContent = new Date(item.date + 'T12:00:00Z').toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
    });
    date.append(time);
    if (item.location) date.append(' · ' + String(item.location).slice(0, 80));
    info.append(date);
  }
  info.append(description);
  const fullStory = typeof item.body === 'string' && item.body.trim().length > 0 &&
    /^[A-Za-z0-9_-]{1,180}$/.test(String(item.id || ''));
  const linkUrl = fullStory
    ? new URL('article.html?id=' + encodeURIComponent(item.id), document.baseURI).href
    : safeUrl(item.url);
  if (linkUrl) {
    const link = document.createElement('a');
    link.href = linkUrl;
    link.textContent = fullStory ? 'Read full story' : 'Read more';
    link.className = 'btn primary';
    if (new URL(linkUrl).origin !== location.origin) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    info.append(link);
  }
  article.append(info);
  return article;
}

async function loadPublishedNews() {
  if (!list || !message) return;
  try {
    // Query excludes hidden/draft records in Firestore and in the UI.
    const snap = await getDocs(query(
      collection(db, 'newsEvents'),
      where('status', 'in', ['active', 'published'])
    ));
    const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item.title && item.description && validDate(item.date))
      .sort((a,b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 12);
    list.replaceChildren(...records.map(renderArticle));
    message.textContent = records.length
      ? `${records.length} published update${records.length === 1 ? '' : 's'}`
      : 'New updates will appear here as they are published. Explore our recent activities below.';
  } catch (error) {
    console.error('News feed could not load', error);
    message.textContent = 'Latest updates are temporarily unavailable. Browse our recent activities below.';
  }
}
loadPublishedNews();
