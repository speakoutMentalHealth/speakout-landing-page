import { db } from "../firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const form = $("cmsForm");
const url = $("url");
const previewBtn = $("previewBtn");
const frame = $("previewFrame");
const hint = $("providerHint");
const badge = $("providerBadge");
const format = $("format");
const title = $("title");
const description = $("description");
const image = $("imageUrl");
const tags = $("tags");
const status = $("status");
const featured = $("featured");
const publishDate = $("publishDate");
const scheduledAt = $("scheduledAt");
const consentConfirmed = $("consentConfirmed");
const minorInvolved = $("minorInvolved");
const editorialReview = $("editorialReview");
const contentPillar = $("contentPillar");
const programmingDay = $("programmingDay");
const summary = $("publishSummary");
const statusBox = $("statusBox");
let lastPreview = null;
let dashboardTimer = null;

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[char]));

function parse(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (h === "youtu.be") id = u.pathname.split("/").filter(Boolean)[0] || "";
    if (["youtube.com","m.youtube.com","music.youtube.com"].includes(h)) {
      id = u.searchParams.get("v") || (u.pathname.match(/\/(?:live|embed|shorts)\/([^/?#]+)/) || [])[1] || "";
    }
    if (id) {
      const live = /\/live\//.test(u.pathname);
      const short = /\/shorts\//.test(u.pathname);
      return {
        name: live ? "YouTube Live" : "YouTube",
        id, live, short,
        canonical:"https://www.youtube.com/watch?v="+encodeURIComponent(id),
        src:"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0"
      };
    }
    if (h === "player.vimeo.com") return {name:"Vimeo",src:u.href};
    if (h === "vimeo.com") {
      const vid = u.pathname.split("/").filter(Boolean)[0];
      if (vid) return {name:"Vimeo",src:"https://player.vimeo.com/video/"+encodeURIComponent(vid)};
    }
    if (h === "twitch.tv") {
      const channel = u.pathname.split("/").filter(Boolean)[0];
      if (channel) return {
        name:"Twitch",live:true,
        src:"https://player.twitch.tv/?channel="+encodeURIComponent(channel)+"&parent="+encodeURIComponent(location.hostname)
      };
    }
  } catch {}
  return null;
}

function validHttpUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    return ["http:","https:"].includes(u.protocol);
  } catch { return false; }
}

function showDetection(result) {
  badge.textContent = result ? result.name+" detected" : "Unsupported link";
  badge.classList.toggle("detected", Boolean(result));
  hint.textContent = result
    ? "Preview is ready. Review the editorial checks below before publishing."
    : "Use a YouTube, YouTube Live, Vimeo or Twitch link.";
}

function preview(result = parse(url.value)) {
  lastPreview = result;
  showDetection(result);
  if (!result) {
    frame.innerHTML = '<div class="preview-empty"><strong>Preview unavailable</strong><small>Check the link and try again.</small></div>';
    renderReadiness();
    return null;
  }
  frame.innerHTML = '<iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="'+esc(result.src)+'" title="Broadcast preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen></iframe>';
  if (result.live) format.value = "live";
  else if (result.short) format.value = "short";
  else format.value = "episode";
  renderReadiness();
  return result;
}

async function enrichYouTube(result) {
  if (!result?.id || !result.name.startsWith("YouTube")) return;
  if (!image.value) image.value = "https://i.ytimg.com/vi/"+result.id+"/hqdefault.jpg";
  try {
    const response = await fetch("https://www.youtube.com/oembed?format=json&url="+encodeURIComponent(result.canonical), {cache:"no-store"});
    if (!response.ok) return;
    const data = await response.json();
    if (!title.value) title.value = data.title || "";
    if (data.thumbnail_url) image.value = data.thumbnail_url;
  } catch {}
  renderReadiness();
}

async function prepare() {
  const result = preview();
  if (result) await enrichYouTube(result);
}

function currentChecks() {
  const publishing = status.value === "published";
  const featuring = featured.value === "true";
  const minor = minorInvolved.value === "yes";
  const tagList = tags.value.split(",").map(x => x.trim()).filter(Boolean);
  const descLength = description.value.trim().length;
  const media = parse(url.value);

  const checks = [
    {key:"media", level:media ? "ok" : "block", label:"Supported media link", detail:media ? media.name+" link recognized." : "Add a supported YouTube, Vimeo or Twitch link."},
    {key:"title", level:title.value.trim().length >= 8 ? "ok" : "block", label:"Clear title", detail:title.value.trim().length >= 8 ? "Title is ready." : "Use a clear title of at least 8 characters."},
    {key:"description", level:descLength >= 50 ? "ok" : (featuring ? "block" : "warn"), label:"Useful description", detail:descLength >= 50 ? "Description gives viewers enough context." : "Aim for at least 50 characters before promotion."},
    {key:"artwork", level:validHttpUrl(image.value) ? "ok" : (featuring ? "block" : "warn"), label:"Artwork / thumbnail", detail:validHttpUrl(image.value) ? "Artwork is set." : "Add a thumbnail so the content is easy to discover."},
    {key:"tags", level:tagList.length >= 2 ? "ok" : (featuring ? "block" : "warn"), label:"Discovery tags", detail:tagList.length >= 2 ? tagList.length+" tags added." : "Add at least two useful discovery tags."},
    {key:"pillar", level:contentPillar.value ? "ok" : "warn", label:"Content pillar", detail:contentPillar.value ? "Editorial pillar selected." : "Automatic topic matching will use tags instead."},
    {key:"publishDate", level:publishDate.value ? "ok" : "warn", label:"Publish date", detail:publishDate.value ? "Publish date is set." : "Add a publish date for better recent-content ordering."}
  ];

  if (format.value === "live") {
    checks.push({
      key:"schedule",
      level:scheduledAt.value ? "ok" : "warn",
      label:"Live schedule",
      detail:scheduledAt.value ? "Live date and time are set." : "Leave blank only when the broadcast is already live."
    });
  }

  if (featuring) {
    checks.push({
      key:"review",
      level:editorialReview.value === "complete" ? "ok" : "block",
      label:"Editorial review",
      detail:editorialReview.value === "complete" ? "Completed before Main Stage promotion." : "Main Stage content should complete editorial review first."
    });
  } else {
    checks.push({
      key:"review",
      level:editorialReview.value === "complete" ? "ok" : "warn",
      label:"Editorial review",
      detail:editorialReview.value === "complete" ? "Editorial review complete." : "Review is still pending."
    });
  }

  if (minor) {
    checks.push({
      key:"consent",
      level:consentConfirmed.value === "yes" ? "ok" : "block",
      label:"Minor consent",
      detail:consentConfirmed.value === "yes" ? "Consent confirmed." : "Publishing content involving a minor requires confirmed consent."
    });
    checks.push({
      key:"minorReview",
      level:editorialReview.value === "complete" ? "ok" : "block",
      label:"Minor editorial review",
      detail:editorialReview.value === "complete" ? "Editorial review complete." : "Complete editorial review before publishing content involving a minor."
    });
  }

  if (!publishing) {
    return checks.map(check => check.level === "block" && !["media","title"].includes(check.key)
      ? {...check,level:"warn"} : check);
  }
  return checks;
}

function renderReadiness() {
  if (!$("readinessList")) return;
  const checks = currentChecks();
  const blockers = checks.filter(x => x.level === "block");
  const warnings = checks.filter(x => x.level === "warn");
  $("readinessList").innerHTML = checks.map(check =>
    '<div class="readiness-item '+check.level+'"><span class="readiness-icon">'+
    (check.level === "ok" ? "✓" : check.level === "block" ? "!" : "•")+
    '</span><div><strong>'+esc(check.label)+'</strong><small>'+esc(check.detail)+'</small></div></div>'
  ).join("");

  const state = $("readinessState");
  if (blockers.length) {
    state.textContent = blockers.length+" blocker"+(blockers.length===1?"":"s");
    state.className = "readiness-state blocked";
  } else if (warnings.length) {
    state.textContent = "Ready with "+warnings.length+" note"+(warnings.length===1?"":"s");
    state.className = "readiness-state warning";
  } else {
    state.textContent = "Ready";
    state.className = "readiness-state ready";
  }

  const isDraft = status.value !== "published";
  summary.textContent = isDraft
    ? "Save this draft?"
    : blockers.length
      ? "Resolve the publishing blockers first."
      : featured.value === "true"
        ? "Ready for Main Stage?"
        : "Ready to publish to SpeakOut TV?";
  return {checks,blockers,warnings};
}

function timestampValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  return Date.parse(value) || 0;
}

function recordIssues(item) {
  const issues = [];
  const published = ["published","active"].includes(String(item.status || "").toLowerCase());
  if (!published) return issues;
  if (String(item.description || "").trim().length < 50) issues.push("short description");
  if (!validHttpUrl(item.imageUrl)) issues.push("missing artwork");
  const itemTags = Array.isArray(item.tags) ? item.tags : String(item.tags || "").split(",");
  if (itemTags.map(x => String(x).trim()).filter(Boolean).length < 2) issues.push("few tags");
  if (String(item.featured).toLowerCase() === "true" && String(item.editorialReview).toLowerCase() !== "complete") issues.push("featured review pending");
  if (String(item.minorInvolved).toLowerCase() === "yes" &&
      (String(item.consentConfirmed).toLowerCase() !== "yes" || String(item.editorialReview).toLowerCase() !== "complete")) {
    issues.push("minor consent/review");
  }
  return issues;
}

async function refreshEditorialDashboard() {
  try {
    const snap = await getDocs(collection(db,"tvEpisodes"));
    const items = [];
    snap.forEach(doc => items.push({id:doc.id,...doc.data()}));
    const now = Date.now();
    const published = items.filter(x => ["published","active"].includes(String(x.status || "").toLowerCase()));
    const drafts = items.filter(x => String(x.status || "").toLowerCase() === "draft");
    const live = items.filter(x => String(x.format || "").toLowerCase() === "live" && String(x.status || "").toLowerCase() !== "hidden");
    const featuredItems = published.filter(x => String(x.featured).toLowerCase() === "true");
    const attention = items.map(item => ({item,issues:recordIssues(item)})).filter(x => x.issues.length);
    const ready = published.filter(item => recordIssues(item).length === 0);
    const scheduled = live.filter(x => timestampValue(x.scheduledAt) > now);

    $("publishedCount").textContent = published.length;
    $("draftCount").textContent = drafts.length;
    $("liveCount").textContent = live.length;
    $("featuredCount").textContent = featuredItems.length;
    $("reviewCount").textContent = attention.length;
    $("readyEditorialCount").textContent = ready.length;
    $("attentionEditorialCount").textContent = attention.length;
    $("scheduledEditorialCount").textContent = scheduled.length;

    const health = $("editorialHealth");
    health.textContent = attention.length ? attention.length+" need attention" : "Library healthy";
    health.classList.toggle("attention", Boolean(attention.length));

    const target = $("editorialAttention");
    if (!attention.length) {
      target.innerHTML = '<div class="editorial-clear"><span>✓</span><div><strong>No publishing gaps detected</strong><small>Published broadcasts have the core metadata needed for discovery.</small></div></div>';
    } else {
      target.innerHTML = '<div class="attention-list">'+attention.slice(0,8).map(({item,issues}) =>
        '<article><div><strong>'+esc(item.title || "Untitled")+'</strong><small>'+esc(item.show || "SpeakOut TV")+'</small></div><span>'+esc(issues.join(" · "))+'</span></article>'
      ).join("")+'</div>'+(attention.length > 8 ? '<p class="admin-muted editorial-more">+'+(attention.length-8)+' more record'+(attention.length-8===1?"":"s")+' need attention.</p>' : "");
    }
  } catch (error) {
    console.error(error);
    $("editorialHealth").textContent = "Check unavailable";
    $("editorialAttention").innerHTML = '<p class="admin-muted">Could not load editorial checks. Try refreshing the Studio.</p>';
  }
}

function scheduleDashboardRefresh() {
  clearTimeout(dashboardTimer);
  dashboardTimer = setTimeout(refreshEditorialDashboard, 220);
}

previewBtn?.addEventListener("click", prepare);
url?.addEventListener("paste", () => setTimeout(prepare, 80));
url?.addEventListener("change", prepare);
url?.addEventListener("blur", () => { if (url.value.trim()) prepare(); });

form?.addEventListener("input", renderReadiness);
form?.addEventListener("change", renderReadiness);

form?.addEventListener("submit", event => {
  const {blockers} = renderReadiness();
  if (status.value === "published" && blockers.length) {
    event.preventDefault();
    event.stopImmediatePropagation();
    statusBox.textContent = "Publishing paused: resolve the editorial blockers shown below.";
    statusBox.className = "notice bad";
    $("readinessState")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
}, true);

const rows = $("rows");
if (rows) new MutationObserver(scheduleDashboardRefresh).observe(rows,{childList:true,subtree:true});

renderReadiness();
refreshEditorialDashboard();
