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
  const programmingDays = $("programmingDays");
  const placementPriority = $("placementPriority");
  const placementStart = $("placementStart");
  const placementEnd = $("placementEnd");
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
  const librarySearch = $("librarySearch");
  const libraryStatusFilter = $("libraryStatusFilter");
  const libraryFormatFilter = $("libraryFormatFilter");
  const libraryPlacementFilter = $("libraryPlacementFilter");
  const libraryQualityFilter = $("libraryQualityFilter");
  const libraryReset = $("libraryReset");
  const libraryVisibleCount = $("libraryVisibleCount");
  let lastDetection = null;
  let studioItems = [];
  let studioShows = [];
  let editingRecordId = null;

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

  function dateOnlyValid(value) {
    const raw = String(value || "").trim();
    return !raw || (/^\d{4}-\d{2}-\d{2}$/u.test(raw) && !Number.isNaN(Date.parse(raw+"T00:00:00Z")));
  }

  function scheduleInputState() {
    const days = String(programmingDays?.value || "all").toLowerCase();
    const priority = Number(placementPriority?.value || 100);
    const start = String(placementStart?.value || "").trim();
    const end = String(placementEnd?.value || "").trim();
    const daysOk = ["all","weekdays","weekend","mon","tue","wed","thu","fri","sat","sun"].includes(days);
    const priorityOk = Number.isInteger(priority) && priority >= 0 && priority <= 999;
    const datesOk = dateOnlyValid(start) && dateOnlyValid(end) && !(start && end && end < start);
    return {days,priority,start,end,valid:daysOk&&priorityOk&&datesOk};
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
    const placementScheduled = ["featured","daily"].includes(homePlacement?.value);
    const scheduleOk = !placementScheduled || scheduleInputState().valid;
    const pillarOk = Boolean(contentPillar?.value);
    const audienceOk = Boolean(audience?.value);
    const checks = {mediaOk,titleOk,descriptionOk,artworkOk,tagsOk,reviewOk,consentOk,placementOk,scheduleOk,pillarOk,audienceOk};
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
    setReadiness("schedule", state.scheduleOk, true);
    setReadiness("pillar", state.pillarOk, true);
    setReadiness("audience", state.audienceOk, true);
    setReadiness("review", state.reviewOk, true);
    setReadiness("consent", state.consentOk, true);

    const publishing = ["published","active"].includes(status?.value);
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
      readinessNote.textContent = "Published content needs a supported media link, clear title, useful description, artwork, at least two tags, valid programming placement and schedule, content pillar, audience, completed editorial review and any required consent.";
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
    if (!["published","active"].includes(status?.value)) return;
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

  const intelligencePillars = [
    {id:"general",label:"General wellbeing"},
    {id:"youth",label:"Youth voices"},
    {id:"school",label:"School & student life"},
    {id:"adhd",label:"ADHD & focus"},
    {id:"relationships",label:"Relationships"},
    {id:"motivation",label:"Confidence & motivation"},
    {id:"stories",label:"Real stories"},
    {id:"community",label:"Community"},
    {id:"advocacy",label:"Advocacy"}
  ];
  const dayMs = 24*60*60*1000;
  const intelligenceKey = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/gu," ").trim();
  const publicStatus = item => ["published","active"].includes(String(item?.status || "").toLowerCase());
  const regularVideo = item => publicStatus(item) && String(item?.format || "episode").toLowerCase() !== "live";
  const ageInDays = time => time ? Math.max(0,Math.floor((Date.now()-time)/dayMs)) : null;
  const ageLabel = time => {
    const days = ageInDays(time);
    if (days === null) return "no publish date";
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return days+" days ago";
  };
  const artworkKind = item => {
    if (!validArtwork(item?.imageUrl)) return "missing";
    try {
      const host = new URL(String(item.imageUrl)).hostname.replace(/^www\./u,"").toLowerCase();
      return host === "i.ytimg.com" || host === "img.youtube.com" || host.endsWith(".ytimg.com") ? "source" : "custom";
    } catch { return "missing"; }
  };
  const artworkKey = item => {
    if (!validArtwork(item?.imageUrl)) return "";
    try {
      const u = new URL(String(item.imageUrl).trim());
      return u.hostname.replace(/^www\./u,"").toLowerCase()+u.pathname.replace(/\/+$/u,"");
    } catch { return ""; }
  };

  function renderContentIntelligence(items = studioItems, shows = studioShows) {
    if (!$("contentIntelligence")) return;
    const published = items.filter(regularVideo);
    const now = Date.now();
    const fresh30 = published.filter(item => {
      const value = viewerDate(item);
      return value && now-value <= 30*dayMs;
    });
    const fresh90 = published.filter(item => {
      const value = viewerDate(item);
      return value && now-value <= 90*dayMs;
    });

    const coverage = intelligencePillars.map(pillar => {
      const all = published.filter(item => intelligenceKey(item.contentPillar) === pillar.id);
      const recent = fresh90.filter(item => intelligenceKey(item.contentPillar) === pillar.id);
      const latest = Math.max(0,...all.map(viewerDate));
      return {...pillar,total:all.length,recent:recent.length,latest,state:all.length===0?"empty":recent.length===0?"stale":"active"};
    });
    const coverageGaps = coverage.filter(entry => entry.recent === 0);
    const maxCoverage = Math.max(1,...coverage.map(entry => entry.total));

    $("fresh30Count").textContent = fresh30.length;
    $("coverageGapCount").textContent = coverageGaps.length;
    const coverageTarget = $("coverageMap");
    if (coverageTarget) {
      coverageTarget.innerHTML = coverage.map(entry => {
        const width = Math.max(entry.total ? 10 : 2,Math.round(entry.total/maxCoverage*100));
        const meta = entry.total
          ? entry.total+" published · "+entry.recent+" recent · latest "+ageLabel(entry.latest)
          : "No published regular video";
        return '<article class="coverage-row '+entry.state+'"><div class="coverage-copy"><strong>'+safe(entry.label)+'</strong><small>'+safe(meta)+'</small></div><div class="coverage-meter" aria-hidden="true"><i style="width:'+width+'%"></i></div><button type="button" data-intelligence-search="'+safe(entry.id)+'">View</button></article>';
      }).join("");
    }

    const publicShows = (Array.isArray(shows)?shows:[]).filter(show => {
      const state = String(show?.status || "published").toLowerCase();
      return !["draft","hidden"].includes(state);
    });
    const seriesNames = new Map();
    publicShows.forEach(show => {
      const title = String(show.title || "").trim();
      if (title) seriesNames.set(intelligenceKey(title),title);
    });
    published.forEach(item => {
      const title = String(item.show || "SpeakOut TV").trim() || "SpeakOut TV";
      seriesNames.set(intelligenceKey(title),title);
    });
    const seriesEntries = [...seriesNames.entries()].map(([key,label]) => {
      const all = published.filter(item => intelligenceKey(item.show || "SpeakOut TV") === key);
      const latest = Math.max(0,...all.map(viewerDate));
      const age = ageInDays(latest);
      return {key,label,count:all.length,latest,age,state:all.length===0?"empty":age===null||age>120?"stale":"active"};
    }).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
    const seriesGaps = seriesEntries.filter(entry => entry.state !== "active");
    $("seriesGapCount").textContent = seriesGaps.length;
    const topSeries = seriesEntries[0] || null;
    const topShare = topSeries && published.length ? topSeries.count/published.length : 0;
    const concentrated = Boolean(published.length >= 6 && topShare >= .5);

    const seriesTarget = $("seriesBalance");
    if (seriesTarget) {
      if (!seriesEntries.length) {
        seriesTarget.innerHTML = '<div class="intelligence-clear"><span>○</span><div><strong>No published series data yet</strong><small>Series balance will appear as episodes are published.</small></div></div>';
      } else {
        const maxSeries = Math.max(1,...seriesEntries.map(entry=>entry.count));
        seriesTarget.innerHTML = seriesEntries.slice(0,10).map(entry => {
          const share = published.length ? Math.round(entry.count/published.length*100) : 0;
          const width = Math.max(entry.count?10:2,Math.round(entry.count/maxSeries*100));
          const latest = entry.count ? " · latest "+ageLabel(entry.latest) : "";
          return '<article class="series-balance-row '+entry.state+'"><div><strong>'+safe(entry.label)+'</strong><small>'+entry.count+' published · '+share+'% of library'+safe(latest)+'</small></div><div class="series-balance-meter" aria-hidden="true"><i style="width:'+width+'%"></i></div><button type="button" data-intelligence-search="'+safe(entry.label)+'">View</button></article>';
        }).join("")+(concentrated?'<p class="intelligence-note"><span>Balance signal</span>'+safe(topSeries.label)+' currently represents '+Math.round(topShare*100)+'% of published regular video.</p>':"");
      }
    }

    const artGroups = new Map();
    published.forEach(item => {
      const key = artworkKey(item);
      if (!key) return;
      const group = artGroups.get(key) || [];
      group.push(item);
      artGroups.set(key,group);
    });
    const repeatedArtIds = new Set();
    artGroups.forEach(group => { if (group.length > 1) group.forEach(item => repeatedArtIds.add(item.id)); });
    const artSignals = new Map();
    published.forEach(item => {
      const signals = [];
      const kind = artworkKind(item);
      if (kind === "missing") signals.push("No artwork URL");
      if (kind === "source") signals.push("Source/YouTube thumbnail");
      if (repeatedArtIds.has(item.id)) signals.push("Exact artwork reused");
      if (signals.length) artSignals.set(item.id,{item,signals});
    });
    $("artworkSignalCount").textContent = artSignals.size;
    const artTarget = $("artworkWatch");
    if (artTarget) {
      const list = [...artSignals.values()];
      artTarget.innerHTML = list.length
        ? '<div class="artwork-signal-list">'+list.slice(0,8).map(({item,signals}) => '<article><div><strong>'+safe(item.title||"Untitled")+'</strong><small>'+safe(item.show||"SpeakOut TV")+'</small></div><span>'+safe(signals.join(" · "))+'</span><button type="button" data-intelligence-edit="'+safe(item.id)+'">Edit</button></article>').join("")+'</div>'+(list.length>8?'<p class="admin-muted editorial-more">+'+(list.length-8)+' more artwork signals.</p>':"")
        : '<div class="intelligence-clear"><span>✓</span><div><strong>No artwork reuse signals</strong><small>Published regular videos have distinct non-source artwork URLs.</small></div></div>';
    }

    const opportunities = [];
    coverageGaps.forEach(entry => {
      opportunities.push({
        type:entry.total?"Refresh topic":"Coverage gap",
        title:entry.label,
        detail:entry.total ? "No published video in this pillar during the last 90 days." : "No published regular video is assigned to this pillar.",
        action:"pillar",
        value:entry.id
      });
    });
    seriesGaps.forEach(entry => {
      const showSelect = $("show");
      const canStartEpisode = Boolean(showSelect && [...showSelect.options].some(option => option.value === entry.label));
      opportunities.push({
        type:entry.count?"Series refresh":"Empty series",
        title:entry.label,
        detail:entry.count ? "No episode published in the last 120 days." : "This published series has no regular video episode yet.",
        action:canStartEpisode?"show":"series",
        value:entry.label
      });
    });
    if (published.length && !fresh30.length) {
      opportunities.unshift({type:"Freshness",title:"Publish something current",detail:"No regular video has a publish date within the last 30 days.",action:"publish",value:""});
    }
    if (concentrated) {
      opportunities.push({type:"Balance",title:"Broaden the series mix",detail:topSeries.label+" represents "+Math.round(topShare*100)+"% of published regular video.",action:"series",value:""});
    }
    if (artSignals.size) {
      opportunities.push({type:"Presentation",title:"Upgrade artwork consistency",detail:artSignals.size+" published record"+(artSignals.size===1?" has":"s have")+" an objective artwork signal to review.",action:"artwork",value:""});
    }

    const opportunityTarget = $("contentOpportunities");
    if (opportunityTarget) {
      opportunityTarget.innerHTML = opportunities.length
        ? '<div class="opportunity-list">'+opportunities.slice(0,10).map(entry => {
            let action = "";
            if (entry.action === "pillar") action = '<button type="button" data-intelligence-plan-pillar="'+safe(entry.value)+'">Start draft</button>';
            else if (entry.action === "show") action = '<button type="button" data-intelligence-plan-show="'+safe(entry.value)+'">Start episode</button>';
            else if (entry.action === "publish") action = '<a href="#publish">New content</a>';
            else if (entry.action === "series") action = '<a href="admin-tv-series.html">Series Studio</a>';
            else if (entry.action === "artwork") action = '<button type="button" data-library-preset="attention">Review library</button>';
            return '<article><div><small>'+safe(entry.type)+'</small><strong>'+safe(entry.title)+'</strong><p>'+safe(entry.detail)+'</p></div>'+action+'</article>';
          }).join("")+'</div>'
        : '<div class="intelligence-clear"><span>✓</span><div><strong>No obvious content gaps from current metadata</strong><small>Keep using editorial judgment; this panel only measures the signals it can verify.</small></div></div>';
    }

    const signalCount = coverageGaps.length + seriesGaps.length + artSignals.size + (concentrated?1:0);
    const health = $("intelligenceHealth");
    if (health) {
      health.textContent = signalCount ? signalCount+" planning signal"+(signalCount===1?"":"s") : "Coverage balanced";
      health.classList.toggle("attention",Boolean(signalCount));
    }
  }


  const mediaKey = raw => {
    const result = parse(raw);
    if (!result) return "";
    if (result.id) return (result.name.startsWith("YouTube") ? "youtube:" : "media:")+result.id.toLowerCase();
    try {
      const u = new URL(String(raw || "").trim());
      return result.name.toLowerCase()+":"+u.hostname.replace(/^www\./u,"").toLowerCase()+u.pathname.replace(/\/+$/u,"");
    } catch { return ""; }
  };

  function qualityIssues(item) {
    const issues = [];
    if (String(item.title || "").trim().length < 8) issues.push("short title");
    if (!parse(item.url)) issues.push("unsupported media");
    if (String(item.description || "").trim().length < 50) issues.push("short description");
    if (!validArtwork(item.imageUrl)) issues.push("missing artwork");
    const itemTags = Array.isArray(item.tags) ? item.tags : String(item.tags || "").split(",");
    if (itemTags.map(value => String(value).trim()).filter(Boolean).length < 2) issues.push("few tags");
    if (!String(item.contentPillar || "").trim()) issues.push("missing pillar");
    if (!String(item.audience || "").trim()) issues.push("missing audience");
    const placement = placementOf(item);
    if (String(item.format || "").toLowerCase() === "live" && ["featured","daily"].includes(placement)) issues.push("live placement");
    if (["featured","daily"].includes(placement) && !scheduleState(item).valid) issues.push("invalid schedule");
    if (String(item.editorialReview || "").toLowerCase() !== "complete") issues.push("review pending");
    if (String(item.minorInvolved || "").toLowerCase() === "yes" && String(item.consentConfirmed || "").toLowerCase() !== "yes") issues.push("minor consent");
    return issues;
  }

  function duplicateIdSet(items = studioItems) {
    const byKey = new Map();
    items.forEach(item => {
      const key = mediaKey(item.url);
      if (!key) return;
      const list = byKey.get(key) || [];
      list.push(item.id);
      byKey.set(key,list);
    });
    const ids = new Set();
    byKey.forEach(list => { if (list.length > 1) list.forEach(id => ids.add(id)); });
    return ids;
  }

  const placementOf = item => String(item?.homePlacement || "auto").trim().toLowerCase().replace(/\s+/g,"_");
  const viewerDate = item => timestampValue(item?.publishedAt) || timestampValue(item?.publishDate) || timestampValue(item?.date);
  const localDateKey = date => String(date.getFullYear())+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
  const dayLabels = {all:"Every day",weekdays:"Weekdays",weekend:"Weekend",mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"};

  function scheduleState(item, date = new Date()) {
    const days = String(item?.programmingDays || "all").trim().toLowerCase();
    const priorityValue = Number(String(item?.placementPriority ?? "").trim() || 100);
    const priority = Number.isInteger(priorityValue) && priorityValue >= 0 && priorityValue <= 999 ? priorityValue : 100;
    const start = String(item?.placementStart || "").trim();
    const end = String(item?.placementEnd || "").trim();
    const validDays = Object.hasOwn(dayLabels, days);
    const validPriority = Number.isInteger(priorityValue) && priorityValue >= 0 && priorityValue <= 999;
    const validDates = dateOnlyValid(start) && dateOnlyValid(end) && !(start && end && end < start);
    const valid = validDays && validPriority && validDates;
    const today = localDateKey(date);
    const day = date.getDay();
    const dayMatches = days === "all" || (days === "weekdays" && day >= 1 && day <= 5) || (days === "weekend" && (day === 0 || day === 6)) || ["sun","mon","tue","wed","thu","fri","sat"][day] === days;
    const upcoming = Boolean(start && today < start);
    const expired = Boolean(end && today > end);
    return {days,priority,start,end,valid,active:valid&&dayMatches&&!upcoming&&!expired,upcoming,expired};
  }

  function scheduleLabel(item) {
    const state = scheduleState(item);
    const bits = [dayLabels[state.days] || "Schedule"];
    if (state.start) bits.push("from "+state.start);
    if (state.end) bits.push("through "+state.end);
    bits.push("priority "+state.priority);
    return bits.join(" · ");
  }

  const programmingSort = (a,b) => scheduleState(a).priority-scheduleState(b).priority || (Number(a.order)||999)-(Number(b.order)||999) || viewerDate(b)-viewerDate(a);

  function recordIssues(item) {
    const published = ["published","active"].includes(String(item.status || "").toLowerCase());
    return published ? qualityIssues(item) : [];
  }

  async function refreshEditorialDashboard() {
    try {
      const [snapshot,showSnapshot] = await Promise.all([
        getDocs(collection(db,"tvEpisodes")),
        getDocs(collection(db,"tvShows"))
      ]);
      const items = [];
      snapshot.forEach(doc => items.push({id:doc.id,...doc.data()}));
      studioShows = [];
      showSnapshot.forEach(doc => studioShows.push({id:doc.id,...doc.data()}));
      renderContentIntelligence(items,studioShows);
      const now = Date.now();
      const today = new Date();
      const published = items.filter(item => ["published","active"].includes(String(item.status || "").toLowerCase()));
      const drafts = items.filter(item => String(item.status || "").toLowerCase() === "draft");
      const live = items.filter(item => String(item.format || "").toLowerCase() === "live" && String(item.status || "").toLowerCase() !== "hidden");
      const regularPublished = published
        .filter(item => String(item.format || "episode").toLowerCase() !== "live")
        .sort((a,b) => viewerDate(b)-viewerDate(a) || (Number(a.order)||999)-(Number(b.order)||999));
      const featuredConfigured = regularPublished.filter(item => placementOf(item) === "featured" || (placementOf(item) === "auto" && String(item.featured).toLowerCase() === "true"));
      const featuredItems = featuredConfigured.filter(item => scheduleState(item,today).active).sort(programmingSort);
      const dailyConfigured = regularPublished.filter(item => placementOf(item) === "daily");
      const dailyItems = dailyConfigured.filter(item => scheduleState(item,today).active).sort(programmingSort);
      const libraryOnlyItems = regularPublished.filter(item => placementOf(item) === "library_only");
      const eligibleHome = regularPublished.filter(item => placementOf(item) !== "library_only");
      const mainStage = featuredItems[0] || eligibleHome[0] || null;
      const attention = items.map(item => ({item,issues:recordIssues(item)})).filter(entry => entry.issues.length);
      const ready = published.filter(item => recordIssues(item).length === 0);
      const scheduled = live.filter(item => timestampValue(item.scheduledAt) > now);
      const scheduledPlacements = [...featuredConfigured.filter(item => placementOf(item)==="featured"),...dailyConfigured];
      const invalidSchedules = scheduledPlacements.filter(item => !scheduleState(item,today).valid);
      const expiredPlacements = scheduledPlacements.filter(item => scheduleState(item,today).expired);
      const upcomingPlacements = scheduledPlacements.filter(item => scheduleState(item,today).upcoming).sort((a,b)=>String(a.placementStart||"").localeCompare(String(b.placementStart||"")));

      $("publishedCount").textContent = published.length;
      $("draftCount").textContent = drafts.length;
      $("liveCount").textContent = live.length;
      $("featuredCount").textContent = featuredItems.length;
      $("reviewCount").textContent = attention.length;
      $("readyEditorialCount").textContent = ready.length;
      $("attentionEditorialCount").textContent = attention.length;
      $("scheduledEditorialCount").textContent = scheduled.length;

      const programmingWarnings = [];
      if (featuredItems.length > 1) programmingWarnings.push(featuredItems.length+" Main Stage records are active today; priority "+scheduleState(featuredItems[0],today).priority+" will lead.");
      const invalidLivePlacement = live.filter(item => ["featured","daily"].includes(placementOf(item)));
      if (invalidLivePlacement.length) programmingWarnings.push(invalidLivePlacement.length+" live record(s) use a homepage placement reserved for regular episodes.");
      if (invalidSchedules.length) programmingWarnings.push(invalidSchedules.length+" homepage placement schedule"+(invalidSchedules.length===1?" is":"s are")+" invalid.");
      if (expiredPlacements.length) programmingWarnings.push(expiredPlacements.length+" homepage placement window"+(expiredPlacements.length===1?" has":"s have")+" ended and no longer affects Home.");
      if (!eligibleHome.length) programmingWarnings.push("No published regular episode is eligible for homepage discovery.");
      if (mainStage && recordIssues(mainStage).length) programmingWarnings.push("The current Main Stage selection still has editorial quality gaps.");

      if ($("programmingFeaturedTitle")) $("programmingFeaturedTitle").textContent = mainStage?.title || "Automatic selection";
      if ($("programmingFeaturedMeta")) $("programmingFeaturedMeta").textContent = mainStage
        ? (mainStage.show || "SpeakOut TV")+" · "+(featuredItems[0]===mainStage ? "Scheduled feature · "+scheduleLabel(mainStage) : "Automatic fallback")
        : "Publish an eligible episode to activate the Main Stage.";
      if ($("programmingDailyTitle")) $("programmingDailyTitle").textContent = dailyItems.length
        ? dailyItems.slice(0,3).map(item => item.title || "Untitled").join(" · ")
        : "Automatic mix";
      if ($("programmingDailyMeta")) $("programmingDailyMeta").textContent = dailyItems.length
        ? dailyItems.length+" scheduled priorit"+(dailyItems.length===1?"y":"ies")+" active today; lower priority numbers lead."
        : upcomingPlacements.length
          ? "No manual priority is active today. Next scheduled placement starts "+String(upcomingPlacements[0].placementStart||"soon")+"."
          : "No manual daily priority is active; the weekday content engine will build the mix automatically.";
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
          : '<div class="editorial-clear"><span>✓</span><div><strong>Homepage programming is aligned</strong><small>Main Stage and Today’s Focus schedules match the viewer content engine.</small></div></div>';
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

  function scheduledForOperations(item) {
    const liveStart = timestampValue(item.scheduledAt);
    return liveStart > Date.now() || scheduleState(item).upcoming;
  }

  function expiringSoon(item) {
    const end = String(item?.placementEnd || "").trim();
    if (!end || !["featured","daily"].includes(placementOf(item))) return false;
    const endTime = Date.parse(end+"T23:59:59");
    const diff = endTime-Date.now();
    return diff >= 0 && diff <= 7*24*60*60*1000;
  }

  function matchesLibraryFilter(item, duplicateIds) {
    const query = String(librarySearch?.value || "").trim().toLowerCase();
    const hay = [item.title,item.show,item.presenter,item.guest,item.guestRole,item.tags,item.contentPillar,item.audience].flat().join(" ").toLowerCase();
    if (query && !hay.includes(query)) return false;
    if (libraryStatusFilter?.value && libraryStatusFilter.value !== "all" && String(item.status || "").toLowerCase() !== libraryStatusFilter.value) return false;
    if (libraryFormatFilter?.value && libraryFormatFilter.value !== "all" && String(item.format || "episode").toLowerCase() !== libraryFormatFilter.value) return false;
    if (libraryPlacementFilter?.value && libraryPlacementFilter.value !== "all" && placementOf(item) !== libraryPlacementFilter.value) return false;
    const quality = libraryQualityFilter?.value || "all";
    if (quality === "ready" && qualityIssues(item).length) return false;
    if (quality === "attention" && !qualityIssues(item).length) return false;
    if (quality === "scheduled" && !scheduledForOperations(item)) return false;
    if (quality === "duplicate" && !duplicateIds.has(item.id)) return false;
    return true;
  }

  function applyLibraryFilters() {
    const duplicateIds = duplicateIdSet();
    let visible = 0;
    studioItems.forEach(item => {
      const row = document.querySelector('#rows tr[data-record-id="'+CSS.escape(item.id)+'"]');
      if (!row) return;
      const show = matchesLibraryFilter(item,duplicateIds);
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (libraryVisibleCount) libraryVisibleCount.textContent = visible+" of "+studioItems.length+" shown";
  }

  function decorateLibraryRows() {
    const duplicateIds = duplicateIdSet();
    studioItems.forEach(item => {
      const row = document.querySelector('#rows tr[data-record-id="'+CSS.escape(item.id)+'"]');
      if (!row) return;
      const sub = row.querySelector("[data-record-sub]");
      const issues = qualityIssues(item);
      if (sub) {
        const parts = [item.show || "SpeakOut TV"];
        if (issues.length) parts.push(issues.length+" check"+(issues.length===1?"":"s"));
        if (duplicateIds.has(item.id)) parts.push("duplicate media");
        sub.textContent = parts.join(" · ");
        sub.classList.toggle("attention",Boolean(issues.length||duplicateIds.has(item.id)));
      }
      const actions = row.querySelector(".actions");
      if (actions && !actions.querySelector("[data-public-view]")) {
        const link = document.createElement("a");
        link.className = "btn soft";
        link.dataset.publicView = item.id;
        link.target = "_blank";
        link.rel = "noopener";
        link.href = String(item.format || "").toLowerCase() === "live" ? "tv.html?live="+encodeURIComponent(item.id)+"#live" : "watch.html?id="+encodeURIComponent(item.id);
        link.textContent = "View";
        actions.prepend(link);
      }
    });
  }

  function openRecord(id) {
    const button = document.querySelector('[data-edit="'+CSS.escape(id)+'"]');
    if (button) button.click();
  }

  function renderOperationsQueue() {
    const drafts = studioItems.filter(item => String(item.status || "").toLowerCase() === "draft");
    const readyDrafts = drafts.filter(item => qualityIssues(item).length === 0);
    const blockedDrafts = drafts.filter(item => qualityIssues(item).length > 0);
    const duplicates = duplicateIdSet();
    const expiring = studioItems.filter(expiringSoon);
    $("readyDraftCount").textContent = readyDrafts.length;
    $("blockedDraftCount").textContent = blockedDrafts.length;
    $("expiringPlacementCount").textContent = expiring.length;
    $("duplicateMediaCount").textContent = duplicates.size;

    const publicAttention = studioItems.filter(item => recordIssues(item).length);
    const scheduled = studioItems.filter(scheduledForOperations);
    const queue = [
      ...readyDrafts.map(item => ({item,label:"Ready draft",detail:"Editorial checks complete — ready for final publishing decision.",tone:"ready"})),
      ...publicAttention.map(item => ({item,label:"Public issue",detail:qualityIssues(item).join(" · "),tone:"attention"})),
      ...expiring.map(item => ({item,label:"Placement ending",detail:"Homepage placement ends "+String(item.placementEnd||"soon")+".",tone:"schedule"})),
      ...[...duplicates].map(id => studioItems.find(item => item.id===id)).filter(Boolean).map(item => ({item,label:"Duplicate media",detail:"Another library record points to the same media source.",tone:"attention"})),
      ...scheduled.filter(item => !readyDrafts.includes(item)).slice(0,4).map(item => ({item,label:"Upcoming",detail:String(item.scheduledAt||item.placementStart||"Scheduled programming"),tone:"schedule"}))
    ];
    const unique = [];
    const seen = new Set();
    queue.forEach(entry => {
      const key = entry.item.id+":"+entry.label;
      if (!seen.has(key)) { seen.add(key); unique.push(entry); }
    });

    const target = $("operationsQueue");
    if (!target) return;
    if (!unique.length) {
      target.innerHTML = '<div class="editorial-clear"><span>✓</span><div><strong>No urgent editorial actions</strong><small>Drafts, public records and programming schedules are currently aligned.</small></div></div>';
      $("operationsHealth").textContent = "Queue clear";
      $("operationsHealth").classList.remove("attention");
      return;
    }
    $("operationsHealth").textContent = unique.length+" action"+(unique.length===1?"":"s");
    $("operationsHealth").classList.toggle("attention",Boolean(publicAttention.length||blockedDrafts.length||duplicates.size));
    target.innerHTML = '<div class="operations-list">'+unique.slice(0,12).map(({item,label,detail,tone}) =>
      '<article class="operation-item '+tone+'"><div><small>'+safe(label)+'</small><strong>'+safe(item.title||"Untitled")+'</strong><span>'+safe(item.show||"SpeakOut TV")+'</span></div><p>'+safe(detail)+'</p><button type="button" data-queue-edit="'+safe(item.id)+'">Edit</button></article>'
    ).join("")+'</div>'+(unique.length>12?'<p class="admin-muted editorial-more">+'+(unique.length-12)+' more actions are available through the filtered library.</p>':"");
  }

  function refreshOperations(items) {
    studioItems = Array.isArray(items) ? items.map(item => ({...item})) : [];
    renderOperationsQueue();
    decorateLibraryRows();
    applyLibraryFilters();
    renderContentIntelligence(studioItems,studioShows);
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

  [librarySearch,libraryStatusFilter,libraryFormatFilter,libraryPlacementFilter,libraryQualityFilter].filter(Boolean).forEach(control => {
    control.addEventListener(control.tagName === "INPUT" ? "input" : "change",applyLibraryFilters);
  });
  libraryReset?.addEventListener("click",() => {
    if (librarySearch) librarySearch.value = "";
    if (libraryStatusFilter) libraryStatusFilter.value = "all";
    if (libraryFormatFilter) libraryFormatFilter.value = "all";
    if (libraryPlacementFilter) libraryPlacementFilter.value = "all";
    if (libraryQualityFilter) libraryQualityFilter.value = "all";
    applyLibraryFilters();
  });
  document.addEventListener("click",event => {
    const intelligenceEdit = event.target.closest("[data-intelligence-edit]");
    if (intelligenceEdit) { openRecord(intelligenceEdit.dataset.intelligenceEdit); return; }

    const intelligenceSearch = event.target.closest("[data-intelligence-search]");
    if (intelligenceSearch) {
      if (librarySearch) librarySearch.value = intelligenceSearch.dataset.intelligenceSearch || "";
      if (libraryStatusFilter) libraryStatusFilter.value = "all";
      if (libraryFormatFilter) libraryFormatFilter.value = "all";
      if (libraryPlacementFilter) libraryPlacementFilter.value = "all";
      if (libraryQualityFilter) libraryQualityFilter.value = "all";
      applyLibraryFilters();
      $("library")?.scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }

    const planPillar = event.target.closest("[data-intelligence-plan-pillar]");
    const planShow = event.target.closest("[data-intelligence-plan-show]");
    if (planPillar || planShow) {
      if (editingRecordId) {
        if (statusBox) {
          statusBox.textContent = "Finish or cancel the record you are editing before starting a new content plan.";
          statusBox.className = "notice bad";
          statusBox.scrollIntoView({behavior:"smooth",block:"center"});
        }
        return;
      }
      form?.reset();
      if (status) status.value = "draft";
      if (editorialReview) editorialReview.value = "pending";
      if (homePlacement) homePlacement.value = "auto";
      if (featured) featured.value = "false";
      if (planPillar && contentPillar) contentPillar.value = planPillar.dataset.intelligencePlanPillar || "general";
      if (planShow) {
        const showSelect = $("show");
        if (showSelect && [...showSelect.options].some(option => option.value === planShow.dataset.intelligencePlanShow)) {
          showSelect.value = planShow.dataset.intelligencePlanShow;
        }
      }
      syncPlacement("placement");
      updateReadiness();
      $("publish")?.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>title?.focus(),250);
      return;
    }

    const edit = event.target.closest("[data-queue-edit]");
    if (edit) { openRecord(edit.dataset.queueEdit); return; }
    const preset = event.target.closest("[data-library-preset]");
    if (!preset) return;
    if (librarySearch) librarySearch.value = "";
    if (libraryStatusFilter) libraryStatusFilter.value = preset.dataset.libraryPreset === "draft" ? "draft" : "all";
    if (libraryFormatFilter) libraryFormatFilter.value = "all";
    if (libraryPlacementFilter) libraryPlacementFilter.value = "all";
    if (libraryQualityFilter) libraryQualityFilter.value = ({attention:"attention",scheduled:"scheduled",duplicate:"duplicate"})[preset.dataset.libraryPreset] || "all";
    applyLibraryFilters();
    $("library")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  document.addEventListener("cms:render",event => {
    if (event.detail?.collectionName === "tvEpisodes") refreshOperations(event.detail.items || []);
  });
  document.addEventListener("cms:edit-start",event => {
    if (event.detail?.collectionName !== "tvEpisodes") return;
    editingRecordId = event.detail.item?.id || null;
    setTimeout(() => {
      const result = parse(url?.value);
      if (result) preview(result);
      updateReadiness();
      syncPlacement("placement");
    },0);
  });
  document.addEventListener("cms:edit-reset",event => {
    if (event.detail?.collectionName !== "tvEpisodes") return;
    editingRecordId = null;
    setTimeout(updateReadiness,0);
  });

  const rows = document.getElementById("rows");
  if (rows) new MutationObserver(() => {
    clearTimeout(window.__tvEditorialRefresh);
    window.__tvEditorialRefresh = setTimeout(refreshEditorialDashboard, 220);
  }).observe(rows,{childList:true,subtree:true});
  refreshEditorialDashboard();
  updateReadiness();
})();