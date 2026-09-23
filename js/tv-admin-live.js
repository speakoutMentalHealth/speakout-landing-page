(()=> {
  const $=id=>document.getElementById(id);
  const url=$("url"),previewBtn=$("previewBtn"),frame=$("previewFrame"),hint=$("providerHint"),badge=$("providerBadge");
  const format=$("format"),title=$("title"),image=$("imageUrl"),summary=$("publishSummary"),form=$("cmsForm");
  const status=$("status"),description=$("description"),show=$("show"),tags=$("tags"),topic=$("topic"),programmingDay=$("programmingDay");
  const featured=$("featured"),publishDate=$("publishDate"),scheduledAt=$("scheduledAt"),consent=$("consentConfirmed"),minor=$("minorInvolved"),review=$("editorialReview");
  const statusBox=$("statusBox"),readinessScore=$("readinessScore"),readinessTitle=$("readinessTitle"),readinessMessage=$("readinessMessage"),readinessChecks=$("readinessChecks");
  const queue=$("editorialQueue"),readyCount=$("readyCount");
  let latestItems=[],filter="all";

  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const asBool=value=>value===true||String(value).toLowerCase()==="true";
  const validHttp=raw=>{try{const u=new URL(String(raw||"").trim());return ["http:","https:"].includes(u.protocol)}catch{return false}};

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
        const live = /\/live\//.test(u.pathname), short = /\/shorts\//.test(u.pathname);
        return {name:live?"YouTube Live":"YouTube",id,live,short,canonical:"https://www.youtube.com/watch?v="+encodeURIComponent(id),src:"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0"};
      }
      if (h === "player.vimeo.com") return {name:"Vimeo",src:u.href};
      if (h === "vimeo.com") {
        const vid=u.pathname.split("/").filter(Boolean)[0];
        if(vid)return {name:"Vimeo",src:"https://player.vimeo.com/video/"+encodeURIComponent(vid)};
      }
      if (h === "twitch.tv") {
        const channel=u.pathname.split("/").filter(Boolean)[0];
        if(channel)return {name:"Twitch",live:true,src:"https://player.twitch.tv/?channel="+encodeURIComponent(channel)+"&parent="+encodeURIComponent(location.hostname)};
      }
    } catch {}
    return null;
  }

  function showDetection(result) {
    badge.textContent=result?result.name+" detected":"Unsupported link";
    badge.classList.toggle("detected",Boolean(result));
    hint.textContent=result?"Preview is ready. Finish the editorial checks before publishing.":"Use a YouTube, YouTube Live, Vimeo or Twitch link.";
  }

  function preview(result=parse(url.value)) {
    showDetection(result);
    if(!result){
      frame.innerHTML='<div class="preview-empty"><strong>Preview unavailable</strong><small>Check the link and try again.</small></div>';
      updateReadiness(); return null;
    }
    frame.innerHTML='<iframe src="'+esc(result.src)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Broadcast preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen></iframe>';
    format.value=result.live?"live":result.short?"short":"episode";
    updateReadiness();
    return result;
  }

  async function enrichYouTube(result) {
    if(!result?.id||!result.name.startsWith("YouTube"))return;
    if(!image.value)image.value="https://i.ytimg.com/vi/"+result.id+"/hqdefault.jpg";
    try{
      const response=await fetch("https://www.youtube.com/oembed?format=json&url="+encodeURIComponent(result.canonical),{cache:"no-store"});
      if(!response.ok)return;
      const data=await response.json();
      if(!title.value)title.value=data.title||"";
      if(data.thumbnail_url)image.value=data.thumbnail_url;
    }catch{}
    updateReadiness();
  }

  async function prepare(){const result=preview();if(result)await enrichYouTube(result)}
  previewBtn?.addEventListener("click",prepare);
  url?.addEventListener("paste",()=>setTimeout(prepare,80));
  url?.addEventListener("change",prepare);
  url?.addEventListener("blur",()=>{if(url.value.trim())prepare()});

  function qualityFor(item={}) {
    const media=Boolean(parse(item.url));
    const titleOk=String(item.title||"").trim().length>=5;
    const seriesOk=Boolean(String(item.show||"").trim());
    const descLen=String(item.description||"").trim().length;
    const descriptionOk=descLen>=50;
    const imageOk=validHttp(item.imageUrl);
    const tagsOk=String(item.tags||"").split(",").map(x=>x.trim()).filter(Boolean).length>=1;
    const topicOk=["stress","adhd","school","relationships","motivation","stories","youth"].includes(String(item.topic||"").toLowerCase());
    const reviewOk=String(item.editorialReview||"").toLowerCase()==="complete";
    const minorOk=String(item.minorInvolved||"").toLowerCase()!=="yes"||(String(item.consentConfirmed||"").toLowerCase()==="yes"&&reviewOk);
    const featuredOk=!asBool(item.featured)||(imageOk&&descLen>=80);
    const checks=[
      ["Media link",media,16],["Title",titleOk,12],["Series",seriesOk,10],["Description",descriptionOk,14],
      ["Artwork",imageOk,12],["Tags",tagsOk,10],["Primary topic",topicOk,10],["Editorial review",reviewOk,10],["Consent",minorOk,6]
    ];
    const max=checks.reduce((n,x)=>n+x[2],0),earned=checks.reduce((n,x)=>n+(x[1]?x[2]:0),0);
    const score=Math.round(earned/max*100);
    const missing=checks.filter(x=>!x[1]).map(x=>x[0]);
    if(!featuredOk)missing.push("Featured description/artwork");
    const ready=media&&titleOk&&seriesOk&&descriptionOk&&imageOk&&tagsOk&&topicOk&&reviewOk&&minorOk&&featuredOk;
    return {score,ready,missing,checks};
  }

  function formRecord(){
    return {
      url:url.value,title:title.value,show:show.value,description:description.value,imageUrl:image.value,tags:tags.value,
      topic:topic.value,programmingDay:programmingDay.value,format:format.value,status:status.value,featured:featured.value,
      publishDate:publishDate.value,scheduledAt:scheduledAt.value,consentConfirmed:consent.value,minorInvolved:minor.value,editorialReview:review.value
    };
  }

  function updateReadiness(){
    const q=qualityFor(formRecord());
    readinessScore.textContent=q.score+"%";
    readinessTitle.textContent=q.ready?"Ready for publication":q.score>=70?"Almost ready":"Complete the essentials";
    readinessMessage.textContent=q.ready
      ? "Core editorial checks are complete. You can publish when the timing is right."
      : "Still needs: "+(q.missing.join(", ")||"editorial review")+".";
    readinessChecks.innerHTML=q.checks.map(([label,ok])=>'<span class="'+(ok?"ok":"missing")+'">'+(ok?"✓":"•")+" "+esc(label)+"</span>").join("");
    summary.textContent=status.value==="published"?(q.ready?"Ready to publish to SpeakOut TV.":"Publishing is blocked until the missing checks are fixed."):"Save as draft and continue editing.";
    form.dataset.editorialReady=String(q.ready);
    return q;
  }

  function queueCard(item){
    const q=qualityFor(item),featuredItem=asBool(item.featured),day=String(item.programmingDay||"").trim();
    const meta=[item.show,item.topic,day?day.toUpperCase():"",featuredItem?"MAIN STAGE":""].filter(Boolean);
    return '<article class="editorial-item" data-editorial-state="'+(q.ready?"ready":"needs")+'" data-editorial-featured="'+featuredItem+'">'+
      '<div class="editorial-item-score '+(q.ready?"ready":"needs")+'"><strong>'+q.score+'%</strong><span>'+(q.ready?"Ready":"Needs work")+'</span></div>'+
      '<div class="editorial-item-copy"><small>'+esc(meta.join(" · ")||"UNASSIGNED")+'</small><strong>'+esc(item.title||"Untitled")+'</strong>'+
      '<p>'+(q.ready?"Editorial essentials are complete.":"Missing: "+esc(q.missing.slice(0,4).join(", ")))+'</p></div>'+
      '<button type="button" class="editorial-edit" data-jump-edit="'+esc(item.id)+'">Edit</button></article>';
  }

  function renderQueue(){
    const visible=latestItems.filter(item=>{
      const q=qualityFor(item);
      if(filter==="needs")return !q.ready;
      if(filter==="ready")return q.ready;
      if(filter==="featured")return asBool(item.featured);
      return true;
    });
    queue.innerHTML=visible.length?visible.map(queueCard).join(""):'<div class="editorial-empty">Nothing in this view.</div>';
    queue.querySelectorAll("[data-jump-edit]").forEach(button=>{
      button.onclick=()=>{
        document.querySelector('[data-edit="'+CSS.escape(button.dataset.jumpEdit)+'"]')?.click();
        document.getElementById("publish")?.scrollIntoView({behavior:"smooth",block:"start"});
      };
    });
  }

  function refreshMetrics(items=latestItems) {
    const published=items.filter(x=>["published","active"].includes(String(x.status||"").toLowerCase())).length;
    const drafts=items.filter(x=>String(x.status||"").toLowerCase()==="draft").length;
    const live=items.filter(x=>String(x.format||x.type||"").toLowerCase()==="live"||String(x.scheduledAt||"").trim()).length;
    const ready=items.filter(x=>qualityFor(x).ready).length;
    if($("publishedCount"))$("publishedCount").textContent=published;
    if($("draftCount"))$("draftCount").textContent=drafts;
    if($("liveCount"))$("liveCount").textContent=live;
    if(readyCount)readyCount.textContent=ready;
  }

  document.addEventListener("cms:render",event=>{
    if(event.detail?.collectionName!=="tvEpisodes")return;
    latestItems=Array.isArray(event.detail.items)?event.detail.items:[];
    refreshMetrics();renderQueue();
  });

  document.querySelectorAll("[data-editorial-filter]").forEach(button=>{
    button.addEventListener("click",()=>{
      filter=button.dataset.editorialFilter||"all";
      document.querySelectorAll("[data-editorial-filter]").forEach(x=>x.classList.toggle("active",x===button));
      renderQueue();
    });
  });

  form?.addEventListener("input",updateReadiness);
  form?.addEventListener("change",updateReadiness);
  form?.addEventListener("submit",event=>{
    const q=updateReadiness();
    if(status.value==="published"&&!q.ready){
      event.preventDefault();event.stopImmediatePropagation();
      statusBox.textContent="Publishing blocked: complete the editorial readiness checks first. You can save this item as a draft.";
      statusBox.className="notice bad";
      document.getElementById("editorialReadiness")?.scrollIntoView({behavior:"smooth",block:"center"});
    }
  },true);

  updateReadiness();
})();