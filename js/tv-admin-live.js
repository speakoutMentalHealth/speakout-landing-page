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
    const titleOk = Boolean(title?.value.trim());
    const descriptionOk = Boolean(description?.value.trim());
    const artworkOk = Boolean(image?.value.trim());
    const tagsOk = Boolean(tags?.value.trim());
    const reviewOk = editorialReview?.value === "complete";
    const consentOk = minorInvolved?.value !== "yes" || consentConfirmed?.value === "yes";
    const checks = {mediaOk,titleOk,descriptionOk,artworkOk,tagsOk,reviewOk,consentOk};
    return {...checks,ready:Object.values(checks).every(Boolean)};
  }

  function updateReadiness() {
    const state = readinessState();
    setReadiness("media", state.mediaOk, true);
    setReadiness("title", state.titleOk, true);
    setReadiness("description", state.descriptionOk, true);
    setReadiness("artwork", state.artworkOk, true);
    setReadiness("tags", state.tagsOk, true);
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
      readinessNote.textContent = "Published content needs a valid media link, title, description, artwork, tags, completed editorial review and any required consent.";
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

  function refreshMetrics() {
    const rows = [...document.querySelectorAll("#rows tr")];
    const text = rows.map(row => row.textContent.toLowerCase());
    const published = text.filter(x => x.includes("published") || x.includes("active")).length;
    const drafts = text.filter(x => x.includes("draft")).length;
    document.getElementById("publishedCount").textContent = published;
    document.getElementById("draftCount").textContent = drafts;
    document.getElementById("liveCount").textContent = text.filter(x => x.includes("live") || x.includes("scheduled")).length;
  }
  const rows = document.getElementById("rows");
  if (rows) new MutationObserver(refreshMetrics).observe(rows,{childList:true,subtree:true});
  refreshMetrics();
  updateReadiness();
})();