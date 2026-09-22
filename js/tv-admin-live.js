(()=> {
  const url = document.getElementById("url");
  const previewBtn = document.getElementById("previewBtn");
  const frame = document.getElementById("previewFrame");
  const hint = document.getElementById("providerHint");
  const badge = document.getElementById("providerBadge");
  const format = document.getElementById("format");
  const title = document.getElementById("title");
  const image = document.getElementById("imageUrl");
  const summary = document.getElementById("publishSummary");

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

  function showDetection(result) {
    badge.textContent = result ? result.name+" detected" : "Unsupported link";
    badge.classList.toggle("detected", Boolean(result));
    hint.textContent = result ? "Preview is ready. Review the details below before publishing." : "Use a YouTube, YouTube Live, Vimeo or Twitch link.";
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
    summary.textContent = result.live ? "Ready to add this live broadcast?" : "Ready to publish this episode?";
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
  }

  async function prepare() {
    const result = preview();
    if (result) await enrichYouTube(result);
  }

  previewBtn?.addEventListener("click", prepare);
  url?.addEventListener("paste", () => setTimeout(prepare, 80));
  url?.addEventListener("change", prepare);
  url?.addEventListener("blur", () => { if (url.value.trim()) prepare(); });

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
})();