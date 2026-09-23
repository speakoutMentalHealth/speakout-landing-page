(()=> {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[character]));
  const normalize = value => String(value || "").trim().toLowerCase();

  const url = $("#url");
  const previewBtn = $("#previewBtn");
  const frame = $("#previewFrame");
  const hint = $("#providerHint");
  const badge = $("#providerBadge");
  const format = $("#format");
  const title = $("#title");
  const description = $("#description");
  const tags = $("#tags");
  const image = $("#imageUrl");
  const show = $("#show");
  const status = $("#status");
  const featured = $("#featured");
  const scheduledAt = $("#scheduledAt");
  const minorInvolved = $("#minorInvolved");
  const consentConfirmed = $("#consentConfirmed");
  const editorialReview = $("#editorialReview");
  const summary = $("#publishSummary");
  const readinessScore = $("#readinessScore");
  const readinessBar = $("#readinessBar");
  const readinessNote = $("#readinessNote");
  const previewArt = $("#editorialPreviewArt");
  const previewShow = $("#editorialPreviewShow");
  const previewTitle = $("#editorialPreviewTitle");
  const previewDescription = $("#editorialPreviewDescription");
  const queue = $("#editorialQueue");
  const queueSummary = $("#editorialSummary");
  const librarySearch = $("#librarySearch");
  const libraryStatus = $("#libraryStatus");
  const libraryFormat = $("#libraryFormat");
  const libraryShow = $("#libraryShow");
  const libraryFilterStatus = $("#libraryFilterStatus");
  const statusBox = $("#statusBox");

  let items = [];
  let editingId = null;

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

  function showDetection(result) {
    badge.textContent = result ? result.name+" detected" : "Unsupported link";
    badge.classList.toggle("detected", Boolean(result));
    hint.textContent = result
      ? "Preview is ready. Review the editorial checks below before publishing."
      : "Use a YouTube, YouTube Live, Vimeo or Twitch link.";
  }

  function preview(result = parse(url.value)) {
    showDetection(result);
    if (!result) {
      frame.innerHTML = '<div class="preview-empty"><strong>Preview unavailable</strong><small>Check the link and try again.</small></div>';
      refreshReadiness();
      return null;
    }
    frame.innerHTML = '<iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="'+esc(result.src)+'" title="Broadcast preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen></iframe>';
    if (result.live) format.value = "live";
    else if (result.short) format.value = "short";
    else format.value = "episode";
    summary.textContent = result.live ? "Review this live broadcast before publishing." : "Review this content before publishing.";
    refreshReadiness();
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
    refreshReadiness();
  }

  async function prepare() {
    const result = preview();
    if (result) await enrichYouTube(result);
  }

  function qualityFlags(item) {
    const flags = [];
    if (!parse(item.url)) flags.push("Media link");
    if (!String(item.title || "").trim()) flags.push("Title");
    if (String(item.description || "").trim().length < 40) flags.push("Description");
    if (!String(item.tags || "").trim()) flags.push("Discovery tags");
    if (!String(item.imageUrl || "").trim()) flags.push("Artwork");
    if (normalize(item.editorialReview) !== "complete") flags.push("Editorial review");
    if (normalize(item.featured) === "true" && !String(item.imageUrl || "").trim()) flags.push("Featured artwork");
    if (normalize(item.format) === "live" && !String(item.scheduledAt || "").trim()) flags.push("Live schedule");
    if (normalize(item.minorInvolved) === "yes") {
      if (normalize(item.consentConfirmed) !== "yes") flags.push("Minor consent");
      if (normalize(item.editorialReview) !== "complete" && !flags.includes("Editorial review")) flags.push("Editorial review");
    }
    return [...new Set(flags)];
  }

  function currentChecks() {
    return {
      link:Boolean(parse(url.value)),
      title:Boolean(title.value.trim()),
      description:description.value.trim().length >= 40,
      tags:Boolean(tags.value.trim()),
      artwork:Boolean(image.value.trim()),
      review:editorialReview.value === "complete"
    };
  }

  function refreshEditorialPreview() {
    previewShow.textContent = (show.value || "SpeakOut Special").toUpperCase();
    previewTitle.textContent = title.value.trim() || "Your title will appear here";
    previewDescription.textContent = description.value.trim() || "Add a concise description so viewers understand why this content matters.";
    const src = image.value.trim();
    previewArt.style.backgroundImage = src ? 'url("'+src.replace(/"/g,"%22")+'")' : "";
    previewArt.classList.toggle("has-image", Boolean(src));
  }

  function refreshReadiness() {
    const checks = currentChecks();
    const values = Object.values(checks);
    const passed = values.filter(Boolean).length;
    const score = Math.round((passed / values.length) * 100);
    readinessScore.textContent = score+"%";
    readinessBar.style.width = score+"%";
    $$("#readinessGrid [data-check]").forEach(node => {
      const ok = Boolean(checks[node.dataset.check]);
      node.classList.toggle("complete", ok);
      node.classList.toggle("missing", !ok);
      node.setAttribute("aria-label", node.textContent+" — "+(ok ? "complete" : "needs attention"));
    });

    const missing = Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>({
      link:"media link",title:"title",description:"description",tags:"discovery tags",artwork:"artwork",review:"editorial review"
    }[key]));
    const isPublishing = status.value === "published";
    const isFeatured = featured.value === "true";
    const involvesMinor = minorInvolved.value === "yes";
    const minorReady = !involvesMinor || (consentConfirmed.value === "yes" && editorialReview.value === "complete");

    if (!minorReady && isPublishing) {
      readinessNote.textContent = "Publishing is blocked: content involving a minor requires confirmed consent and completed editorial review.";
      readinessNote.className = "readiness-note critical";
    } else if (isFeatured && missing.length) {
      readinessNote.textContent = "Main Stage content still needs: "+missing.join(", ")+".";
      readinessNote.className = "readiness-note warning";
    } else if (isPublishing && missing.length) {
      readinessNote.textContent = "Published content can go live, but these quality items still need attention: "+missing.join(", ")+".";
      readinessNote.className = "readiness-note warning";
    } else if (!missing.length) {
      readinessNote.textContent = "Editorial checks are complete. This content is ready for a final human review.";
      readinessNote.className = "readiness-note ready";
    } else {
      readinessNote.textContent = "Drafts can be saved while work is still in progress. Missing: "+missing.join(", ")+".";
      readinessNote.className = "readiness-note";
    }

    if (format.value === "live" && !scheduledAt.value) {
      readinessNote.textContent += " Add a schedule if this is an upcoming live session.";
    }
    refreshEditorialPreview();
  }

  function updateMetrics() {
    const published = items.filter(item => ["published","active"].includes(normalize(item.status))).length;
    const drafts = items.filter(item => normalize(item.status) === "draft").length;
    const live = items.filter(item => normalize(item.format) === "live").length;
    const review = items.filter(item => qualityFlags(item).length > 0).length;
    const artwork = items.filter(item => !String(item.imageUrl || "").trim()).length;
    $("#publishedCount").textContent = published;
    $("#draftCount").textContent = drafts;
    $("#liveCount").textContent = live;
    $("#reviewCount").textContent = review;
    $("#artworkCount").textContent = artwork;
  }

  function renderQueue() {
    const flagged = items
      .map(item => ({item,flags:qualityFlags(item)}))
      .filter(entry => entry.flags.length)
      .sort((a,b) => {
        const aPublished = ["published","active"].includes(normalize(a.item.status)) ? 0 : 1;
        const bPublished = ["published","active"].includes(normalize(b.item.status)) ? 0 : 1;
        return aPublished-bPublished || b.flags.length-a.flags.length;
      });

    if (!flagged.length) {
      queueSummary.innerHTML = "<strong>Editorial queue clear.</strong><span>No obvious completeness issues were found in the current TV library.</span>";
      queue.innerHTML = '<div class="editorial-empty">Nothing needs attention right now.</div>';
      return;
    }
    queueSummary.innerHTML = "<strong>"+flagged.length+" item"+(flagged.length===1?"":"s")+" need attention.</strong><span>Published content is shown first.</span>";
    queue.innerHTML = flagged.slice(0,12).map(({item,flags}) =>
      '<article class="editorial-queue-item">'+
      '<div><small>'+esc(item.show || "SpeakOut TV")+' · '+esc(item.status || "active")+'</small>'+
      '<strong>'+esc(item.title || "Untitled")+'</strong>'+
      '<p>'+flags.map(flag=>'<span>'+esc(flag)+'</span>').join("")+'</p></div>'+
      '<button type="button" data-editorial-edit="'+esc(item.id)+'">Review</button></article>'
    ).join("");
  }

  function populateSeriesFilter() {
    const selected = libraryShow.value || "all";
    const shows = [...new Set(items.map(item => String(item.show || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    libraryShow.innerHTML = '<option value="all">All series</option>'+shows.map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join("");
    libraryShow.value = shows.includes(selected) ? selected : "all";
  }

  function applyLibraryFilters() {
    const q = normalize(librarySearch.value);
    const wantedStatus = normalize(libraryStatus.value);
    const wantedFormat = normalize(libraryFormat.value);
    const wantedShow = normalize(libraryShow.value);
    let visible = 0;

    $$("#rows tr").forEach(row => {
      const edit = row.querySelector("[data-edit]");
      if (!edit) return;
      const item = items.find(candidate => candidate.id === edit.dataset.edit);
      if (!item) return;
      const haystack = normalize([item.title,item.show,item.tags,item.description].join(" "));
      const match = (!q || haystack.includes(q)) &&
        (wantedStatus === "all" || normalize(item.status) === wantedStatus) &&
        (wantedFormat === "all" || normalize(item.format) === wantedFormat) &&
        (wantedShow === "all" || normalize(item.show) === wantedShow);
      row.hidden = !match;
      if (match) visible += 1;

      const titleCell = row.querySelector('td[data-label="Title"]');
      if (titleCell && !titleCell.querySelector(".library-meta")) {
        const meta = document.createElement("small");
        meta.className = "library-meta";
        meta.textContent = [item.show,item.format,normalize(item.featured)==="true"?"Main Stage":""].filter(Boolean).join(" · ");
        titleCell.appendChild(meta);
      }
    });
    libraryFilterStatus.textContent = visible+" of "+items.length+" item"+(items.length===1?"":"s")+" shown";
  }

  function focusEditorialItem(id) {
    const button = document.querySelector('[data-edit="'+CSS.escape(id)+'"]');
    if (button) button.click();
  }

  function duplicateUrl(payload, id) {
    const candidate = normalize(payload.url);
    if (!candidate) return null;
    return items.find(item => item.id !== id && normalize(item.url) === candidate) || null;
  }

  function showStudioMessage(message, tone="bad") {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = "notice "+tone;
    statusBox.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  previewBtn?.addEventListener("click", prepare);
  url?.addEventListener("paste", () => setTimeout(prepare, 80));
  url?.addEventListener("change", prepare);
  url?.addEventListener("blur", () => { if (url.value.trim()) prepare(); });

  $("#tagSuggestions")?.addEventListener("click", event => {
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    const values = tags.value.split(",").map(value=>value.trim()).filter(Boolean);
    if (!values.some(value=>normalize(value)===normalize(button.dataset.tag))) values.push(button.dataset.tag);
    tags.value = values.join(", ");
    tags.dispatchEvent(new Event("input",{bubbles:true}));
  });

  $("#editorialQueue")?.addEventListener("click", event => {
    const button = event.target.closest("[data-editorial-edit]");
    if (button) focusEditorialItem(button.dataset.editorialEdit);
  });

  [librarySearch,libraryStatus,libraryFormat,libraryShow].forEach(control => {
    control?.addEventListener(control === librarySearch ? "input" : "change", applyLibraryFilters);
  });

  ["url","title","description","tags","imageUrl","show","status","featured","format","scheduledAt","minorInvolved","consentConfirmed","editorialReview"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", refreshReadiness);
    document.getElementById(id)?.addEventListener("change", refreshReadiness);
  });

  window.addEventListener("cms:items", event => {
    if (event.detail?.collectionName !== "tvEpisodes") return;
    items = Array.isArray(event.detail.items) ? event.detail.items : [];
    updateMetrics();
    renderQueue();
    populateSeriesFilter();
    applyLibraryFilters();
  });

  window.addEventListener("cms:editing", event => {
    if (event.detail?.collectionName !== "tvEpisodes") return;
    editingId = event.detail.item?.id || null;
    setTimeout(()=>{refreshReadiness();if(url.value.trim())preview(parse(url.value));},0);
  });

  window.addEventListener("cms:edit-cancelled", event => {
    if (event.detail?.collectionName !== "tvEpisodes") return;
    editingId = null;
    setTimeout(refreshReadiness,0);
  });

  window.addEventListener("cms:before-submit", event => {
    if (event.detail?.collectionName !== "tvEpisodes") return;
    const payload = event.detail.payload || {};
    const existing = duplicateUrl(payload,event.detail.editingId);
    if (existing) {
      event.preventDefault();
      showStudioMessage('This media link is already in the TV library as “'+(existing.title || "Untitled")+'”.');
      return;
    }
    if (normalize(payload.status) === "published" && normalize(payload.minorInvolved) === "yes" &&
        (normalize(payload.consentConfirmed) !== "yes" || normalize(payload.editorialReview) !== "complete")) {
      event.preventDefault();
      showStudioMessage("Publishing blocked: content involving a minor requires confirmed consent and completed editorial review.");
      return;
    }
    const missing = qualityFlags(payload).filter(flag => !["Live schedule"].includes(flag));
    if (normalize(payload.status) === "published" && missing.length) {
      summary.textContent = "Publishing with quality items still needing attention: "+missing.join(", ")+".";
    }
  });

  refreshReadiness();
})();