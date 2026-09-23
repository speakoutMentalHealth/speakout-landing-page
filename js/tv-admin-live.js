import { db } from "../firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

(()=> {
  const $ = id => document.getElementById(id);
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
  const editorialReview = $("editorialReview");
  const minorInvolved = $("minorInvolved");
  const consentConfirmed = $("consentConfirmed");
  const homePlacement = $("homePlacement");
  const contentPillar = $("contentPillar");
  const audience = $("audience");
  const featured = $("featured");
  const summary = $("publishSummary");
  const publishHint = $("publishHint");
  const readinessTitle = $("readinessTitle");
  const readinessBadge = $("readinessBadge");
  const readinessNote = $("readinessNote");
  const form = $("cmsForm");
  const statusBox = $("statusBox");
  const publishButton = form?.querySelector('button[type="submit"]');
  let lastDetection = null;

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
        return {name: live ? "YouTube Live" : "YouTube", id, live, short, canonical:"https://www.youtube.com/watch?v="+encodeURIComponent(id), src:"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0"};
      }
      if (h === "player.vimeo.com") return {name:"Vimeo",src:u.href};
      if (h === "vimeo.com") {
        const vid = u.pathname.split("/").filter(Boolean)[0];
        if (vid) return {name:"Vimeo",src:"https://player.vimeo.com/video/"+encodeURIComponent(vid)};
      }
      if (h === "twitch.tv") {
        const channel = u.pathname.split("/").filter(Boolean)[0];
        if (channel) return {name:"Twitch",live:true,src:"https://player.twitch.tv/?channel="+encodeURIComponent(channel)+"&parent="+encodeURIComponent(location.hostname)};
      }
    } catch {}
    return null;
  }

  function setReadiness(name, ok, warning = false) {
    const el = document.querySelector('[data-readiness="'+name+'"]');
    if (!el) return;
    el.classList.toggle("ok", Boolean(ok));
    el.classList.toggle("warn", !ok && warning);
  }

  function readinessState() {
    const mediaOk = Boolean(parse(url?.value));
    const titleOk = title?.value.trim().length >= 8;
    const descriptionOk = description?.value.trim().length >= 50;
    const artworkOk = /^https?:\/\//iu.test(image?.value.trim() || "");
    const tagCount = String(tags?.value || "").split(",").map(value => value.trim()).filter(Boolean).length;
    const tagsOk = tagCount >= 2;
    const reviewOk = editorialReview?.value === "complete";
    const consentOk = minorInvolved?.value !== "yes" || consentConfirmed?.value === "yes";
    const placementOk = Boolean(homePlacement?.value) && !(format?.value === "live" && ["featured","daily"].includes(homePlacement?.value));
    const pillarOk = Boolean(contentPillar?.value);
    const audienceOk = Boolean(audience?.value);
    const checks = {mediaOk,titleOk,descriptionOk,artworkOk,tagsOk,reviewOk,consentOk,placementOk,pillarOk,audienceOk};
    return {...checks,ready:Object.values(checks).every(Boolean)};
  }

  function updateReadiness() {
    const state = readinessState();
    setReadiness("media", state.mediaOk, true);
    setReadiness("title", state.titleOk, true);
    setReadiness("description", state.descriptionOk, true);
    setReadiness("artwork", state.artworkOk, true);
    setReadiness("tags", state.tagsOk, true);
    setReadiness("placement", state.placementOk, true);
    setReadiness("pillar", state.pillarOk, true);
    setReadiness("audience", state.audienceOk, true);
    setReadiness("review", state.reviewOk, true);
    setReadiness("consent", state.consentOk, true);

    const publishing = status?.value === "published";
    const hidden = status?.value === "hidden";
    if (publishing && state.ready) {
      readinessTitle.textContent = "Approved and ready to publish";
      readinessBadge.textContent = "Ready";
      readinessBadge.className = "readiness-badge ready";
      readinessNote.textContent = "The core editorial checks are complete. Publishing will make this item visible on SpeakOut TV.";
      summary.textContent = "Ready to publish";
      publishHint.textContent = "Editorial review and publishing checks are complete.";
      publishButton?.removeAttribute("data-blocked");
    } else if (publishing) {
      readinessTitle.textContent = "Complete the highlighted checks";
      readinessBadge.textContent = "Needs attention";
      readinessBadge.className = "readiness-badge blocked";
      readinessNote.textContent = "Published content needs a supported media link, clear title, useful description, artwork, at least two tags, valid programming placement, content pillar, audience, completed editorial review and any required consent.";
      summary.textContent = "Publishing is not ready yet";
      publishHint.textContent = "Complete the highlighted editorial checks or switch visibility back to Draft.";
      publishButton?.setAttribute("data-blocked","true");
    } else if (hidden) {
      readinessTitle.textContent = "Hidden content can be saved";
      readinessBadge.textContent = "Hidden";
      readinessBadge.className = "readiness-badge";
      readinessNote.textContent = "This item will remain unavailable to viewers until it is reviewed and published.";
      summary.textContent = "Save hidden content";
      publishHint.textContent = "Hidden items stay out of the public TV experience.";
      publishButton?.removeAttribute("data-blocked");
    } else {
      readinessTitle.textContent = state.ready ? "Editorial checks complete" : "Draft can be saved now";
      readinessBadge.textContent = state.ready ? "Draft ready" : "Draft mode";
      readinessBadge.className = state.ready ? "readiness-badge ready" : "readiness-badge";
      readinessNote.textContent = state.ready
        ? "The editorial checks are complete. You can keep this as a draft or switch visibility to Published."
        : "Drafts can be saved while details are still being prepared. Publishing remains gated until review is complete.";
      summary.textContent = "Draft-first publishing";
      publishHint.textContent = "Save as draft while you prepare it. Published content must complete editorial review.";
      publishButton?.removeAttribute("data-blocked");
    }
    return state;
  }

  function showDetection(result) {
    lastDetection = result;
    badge.textContent = result ? result.name+" detected" : "Unsupported link";
    badge.classList.toggle("detected", Boolean(result));
    hint.textContent = result ? "Preview is ready. Review the details below before publishing." : "Use a YouTube, YouTube Live, Vimeo or Twitch link.";
    updateReadiness();
  }

  function preview(result = parse(url.value)) {
    showDetection(result);
    if (!result) {
      frame.innerHTML = '<div class="preview-empty"><strong>Preview unavailable</strong><small>Check the link and try again.</small></div>';
      return null;
    }
    frame.innerHTML = '<iframe src="'+result.src+'" title="Broadcast preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen></iframe>';
    if (result.live) format.value = "live";
    else if (result.short) format.value = "short";
    else format.value = "episode";
    updateReadiness();
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
    updateReadiness();
  }

  async function prepare() {
    const result = preview();
    if (result) await enrichYouTube(result);
  }

  previewBtn?.addEventListener("click", prepare);
  url?.addEventListener("paste", () => setTimeout(prepare, 80));
  url?.addEventListener("change", prepare);
  url?.addEventListener("blur", () => { if (url.value.trim()) prepare(); });

  form?.addEventListener("input", updateReadiness);
  form?.addEventListener("change", updateReadiness);
  form?.addEventListener("reset", () => setTimeout(() => {
    lastDetection = null;
    updateReadiness();
  }, 0));

  form?.addEventListener("submit", event => {
    if (status?.value !== "published") return;
    const state = updateReadiness();
    if (state.ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (statusBox) {
      statusBox.textContent = "Publishing stopped: complete the highlighted editorial checks or save this item as a draft.";
      statusBox.className = "notice bad";
      statusBox.scrollIntoView({behavior:"smooth",block:"center"});
    }
  }, true);

  function timestampValue(value) {
    if (!value) return 0;
    if (typeof value?.toMillis === "function") return value.toMillis();
    return Date.parse(value) || 0;
  }

  function validArtwork(value) {
    try {
      const parsed = new URL(String(value || "").trim());
      return ["http:","https:"].includes(parsed.protocol);
    } catch { return false; }
  }

  const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));

  const placementOf = item => String(item?.homePlacement || "auto").trim().toLowerCase().replace(/\s+/g,"_");
  const viewerDate = item => timestampValue(item?.publishedAt) || timestampValue(item?.publishDate) || timestampValue(item?.date);

  function recordIssues(item) {
    const issues = [];
    const published = ["published","active"].includes(String(item.status || "").toLowerCase());
    if (!published) return issues;
    if (String(item.title || "").trim().length < 8) issues.push("short title");
    if (!parse(item.url)) issues.push("unsupported media");
    if (String(item.description || "").trim().length < 50) issues.push("short description");
    if (!validArtwork(item.imageUrl)) issues.push("missing artwork");
    const itemTags = Array.isArray(item.tags) ? item.tags : String(item.tags || "").split(",");
    if (itemTags.map(value => String(value).trim()).filter(Boolean).length < 2) issues.push("few tags");
    if (!String(item.contentPillar || "").trim()) issues.push("missing pillar");
    if (!String(item.audience || "").trim()) issues.push("missing audience");
    if (String(item.format || "").toLowerCase() === "live" && ["featured","daily"].includes(placementOf(item))) issues.push("live placement");
    if (String(item.editorialReview || "").toLowerCase() !== "complete") issues.push("review pending");
    if (String(item.minorInvolved || "").toLowerCase() === "yes" && String(item.consentConfirmed || "").toLowerCase() !== "yes") issues.push("minor consent");
    return issues;
  }

  async function refreshEditorialDashboard() {
    try {
      const snapshot = await getDocs(collection(db,"tvEpisodes"));
      const items = [];
      snapshot.forEach(doc => items.push({id:doc.id,...doc.data()}));
      const now = Date.now();
      const published = items.filter(item => ["published","active"].includes(String(item.status || "").toLowerCase()));
      const drafts = items.filter(item => String(item.status || "").toLowerCase() === "draft");
      const live = items.filter(item => String(item.format || "").toLowerCase() === "live" && String(item.status || "").toLowerCase() !== "hidden");
      const regularPublished = published
        .filter(item => String(item.format || "episode").toLowerCase() !== "live")
        .sort((a,b) => viewerDate(b)-viewerDate(a) || (Number(a.order)||999)-(Number(b.order)||999));
      const featuredItems = regularPublished.filter(item => placementOf(item) === "featured" || String(item.featured).toLowerCase() === "true");
      const dailyItems = regularPublished.filter(item => placementOf(item) === "daily");
      const libraryOnlyItems = regularPublished.filter(item => placementOf(item) === "library_only");
      const eligibleHome = regularPublished.filter(item => placementOf(item) !== "library_only");
      const mainStage = featuredItems[0] || eligibleHome[0] || null;
      const attention = items.map(item => ({item,issues:recordIssues(item)})).filter(entry => entry.issues.length);
      const ready = published.filter(item => recordIssues(item).length === 0);
      const scheduled = live.filter(item => timestampValue(item.scheduledAt) > now);

      $("publishedCount").textContent = published.length;
      $("draftCount").textContent = drafts.length;
      $("liveCount").textContent = live.length;
      $("featuredCount").textContent = featuredItems.length;
      $("reviewCount").textContent = attention.length;
      $("readyEditorialCount").textContent = ready.length;
      $("attentionEditorialCount").textContent = attention.length;
      $("scheduledEditorialCount").textContent = scheduled.length;

      const programmingWarnings = [];
      if (featuredItems.length > 1) programmingWarnings.push(featuredItems.length+" published records are marked for Main Stage; the newest/highest-priority eligible record will lead.");
      const invalidLivePlacement = live.filter(item => ["featured","daily"].includes(placementOf(item)));
      if (invalidLivePlacement.length) programmingWarnings.push(invalidLivePlacement.length+" live record(s) use a homepage placement reserved for regular episodes.");
      if (!eligibleHome.length) programmingWarnings.push("No published regular episode is eligible for homepage discovery.");
      if (mainStage && recordIssues(mainStage).length) programmingWarnings.push("The current Main Stage selection still has editorial quality gaps.");

      if ($("programmingFeaturedTitle")) $("programmingFeaturedTitle").textContent = mainStage?.title || "Automatic selection";
      if ($("programmingFeaturedMeta")) $("programmingFeaturedMeta").textContent = mainStage
        ? (mainStage.show || "SpeakOut TV")+" · "+(placementOf(mainStage)==="featured" ? "Editorially featured" : "Automatic fallback")
        : "Publish an eligible episode to activate the Main Stage.";
      if ($("programmingDailyTitle")) $("programmingDailyTitle").textContent = dailyItems.length
        ? dailyItems.slice(0,3).map(item => item.title || "Untitled").join(" · ")
        : "Automatic mix";
      if ($("programmingDailyMeta")) $("programmingDailyMeta").textContent = dailyItems.length
        ? dailyItems.length+" editorial priorit"+(dailyItems.length===1?"y":"ies")+" will lead Today’s Focus before automatic topic picks."
        : "No manual daily priority is set; the weekday content engine will build the mix automatically.";
      if ($("programmingLibraryCount")) $("programmingLibraryCount").textContent = libraryOnlyItems.length;
      const programmingHealth = $("programmingHealth");
      if (programmingHealth) {
        programmingHealth.textContent = programmingWarnings.length ? programmingWarnings.length+" programming warning"+(programmingWarnings.length===1?"":"s") : "Programming aligned";
        programmingHealth.classList.toggle("attention", Boolean(programmingWarnings.length));
      }
      const warningsTarget = $("programmingWarnings");
      if (warningsTarget) {
        warningsTarget.innerHTML = programmingWarnings.length
          ? '<div class="programming-warning-list">'+programmingWarnings.map(message => '<p><span>!</span>'+safe(message)+'</p>').join("")+'</div>'
          : '<div class="editorial-clear"><span>✓</span><div><strong>Homepage programming is aligned</strong><small>Main Stage and daily priorities match the viewer content engine.</small></div></div>';
      }

      const health = $("editorialHealth");
      health.textContent = attention.length ? attention.length+" need attention" : "Library healthy";
      health.classList.toggle("attention", Boolean(attention.length));

      const target = $("editorialAttention");
      if (!attention.length) {
        target.innerHTML = '<div class="editorial-clear"><span>✓</span><div><strong>No publishing gaps detected</strong><small>Published broadcasts have the core metadata needed for discovery.</small></div></div>';
      } else {
        target.innerHTML = '<div class="attention-list">'+attention.slice(0,8).map(({item,issues}) =>
          '<article><div><strong>'+safe(item.title || "Untitled")+'</strong><small>'+safe(item.show || "SpeakOut TV")+'</small></div><span>'+safe(issues.join(" · "))+'</span></article>'
        ).join("")+'</div>'+(attention.length > 8 ? '<p class="admin-muted editorial-more">+'+(attention.length-8)+' more records need attention.</p>' : "");
      }
    } catch (error) {
      console.error(error);
      if ($("editorialHealth")) $("editorialHealth").textContent = "Check unavailable";
      if ($("editorialAttention")) $("editorialAttention").innerHTML = '<p class="admin-muted">Could not load editorial checks. Try refreshing the Studio.</p>';
    }
  }

  function syncPlacement(source = "placement") {
    if (!homePlacement || !featured) return;
    if (source === "placement") {
      featured.value = homePlacement.value === "featured" ? "true" : "false";
      return;
    }
    if (featured.value === "true") homePlacement.value = "featured";
    else if (homePlacement.value === "featured") homePlacement.value = "auto";
  }
  homePlacement?.addEventListener("change", () => { syncPlacement("placement"); updateReadiness(); });
  featured?.addEventListener("change", () => { syncPlacement("featured"); updateReadiness(); });
  format?.addEventListener("change", updateReadiness);

  const rows = document.getElementById("rows");
  if (rows) new MutationObserver(() => {
    clearTimeout(window.__tvEditorialRefresh);
    window.__tvEditorialRefresh = setTimeout(refreshEditorialDashboard, 220);
  }).observe(rows,{childList:true,subtree:true});
  refreshEditorialDashboard();
  updateReadiness();
})();