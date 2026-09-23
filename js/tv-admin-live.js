(()=> {
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const normalize=value=>String(value||"").trim().toLowerCase();

  const form=$("#cmsForm");
  const url=$("#url"),previewBtn=$("#previewBtn"),frame=$("#previewFrame"),hint=$("#providerHint"),badge=$("#providerBadge");
  const title=$("#title"),show=$("#show"),description=$("#description"),format=$("#format"),status=$("#status");
  const homePlacement=$("#homePlacement"),contentPillar=$("#contentPillar"),audience=$("#audience"),featured=$("#featured");
  const publishDate=$("#publishDate"),scheduledAt=$("#scheduledAt"),presenter=$("#presenter"),guest=$("#guest"),guestRole=$("#guestRole");
  const tags=$("#tags"),image=$("#imageUrl"),sponsor=$("#sponsor"),minorInvolved=$("#minorInvolved"),consentConfirmed=$("#consentConfirmed"),editorialReview=$("#editorialReview");
  const summary=$("#publishSummary"),readinessTitle=$("#readinessTitle"),readinessBadge=$("#readinessBadge"),readinessNote=$("#readinessNote");
  const queue=$("#editorialQueue"),editorialHealth=$("#editorialHealth");
  const librarySearch=$("#librarySearch"),libraryStatus=$("#libraryStatus"),libraryFormat=$("#libraryFormat"),libraryShow=$("#libraryShow"),libraryFilterStatus=$("#libraryFilterStatus");
  const statusBox=$("#statusBox");

  let items=[],editingId=null,editorialFilter="all";

  function parse(raw){
    try{
      const u=new URL(String(raw||"").trim()),host=u.hostname.replace(/^www\./,"").toLowerCase();
      let id="";
      if(host==="youtu.be")id=u.pathname.split("/").filter(Boolean)[0]||"";
      if(["youtube.com","m.youtube.com","music.youtube.com"].includes(host)){
        id=u.searchParams.get("v")||(u.pathname.match(/\/(?:live|embed|shorts)\/([^/?#]+)/)||[])[1]||"";
      }
      if(id){
        const live=/\/live\//.test(u.pathname),short=/\/shorts\//.test(u.pathname);
        return {name:live?"YouTube Live":"YouTube",id,live,short,canonical:"https://www.youtube.com/watch?v="+encodeURIComponent(id),src:"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0"};
      }
      if(host==="player.vimeo.com")return {name:"Vimeo",src:u.href};
      if(host==="vimeo.com"){
        const id=u.pathname.split("/").filter(Boolean)[0];
        if(id)return {name:"Vimeo",src:"https://player.vimeo.com/video/"+encodeURIComponent(id)};
      }
      if(host==="twitch.tv"){
        const channel=u.pathname.split("/").filter(Boolean)[0];
        if(channel)return {name:"Twitch",live:true,src:"https://player.twitch.tv/?channel="+encodeURIComponent(channel)+"&parent="+encodeURIComponent(location.hostname)};
      }
    }catch{}
    return null;
  }

  function syncPlacement(){
    featured.value=homePlacement.value==="featured"?"true":"false";
  }

  function showDetection(result){
    badge.textContent=result?result.name+" detected":"Unsupported link";
    badge.classList.toggle("detected",Boolean(result));
    hint.textContent=result?"Preview is ready. Complete the editorial checks before publishing.":"Use a YouTube, YouTube Live, Vimeo or Twitch link.";
  }

  function preview(result=parse(url.value)){
    showDetection(result);
    if(!result){
      frame.innerHTML='<div class="preview-empty"><strong>Preview unavailable</strong><small>Check the link and try again.</small></div>';
      refreshReadiness();
      return null;
    }
    frame.innerHTML='<iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="'+esc(result.src)+'" title="Broadcast preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen></iframe>';
    format.value=result.live?"live":result.short?"short":"episode";
    summary.textContent=result.live?"Review this live broadcast before publishing.":"Review this content before publishing.";
    refreshReadiness();
    return result;
  }

  async function enrichYouTube(result){
    if(!result?.id||!result.name.startsWith("YouTube"))return;
    if(!image.value)image.value="https://i.ytimg.com/vi/"+result.id+"/hqdefault.jpg";
    try{
      const response=await fetch("https://www.youtube.com/oembed?format=json&url="+encodeURIComponent(result.canonical),{cache:"no-store"});
      if(response.ok){
        const data=await response.json();
        if(!title.value)title.value=data.title||"";
        if(data.thumbnail_url)image.value=data.thumbnail_url;
      }
    }catch{}
    refreshReadiness();
  }

  async function prepare(){
    const result=preview();
    if(result)await enrichYouTube(result);
  }

  function checksFor(item){
    const placement=normalize(item.homePlacement||"auto");
    const minor=normalize(item.minorInvolved)==="yes";
    return {
      media:Boolean(parse(item.url)),
      title:Boolean(String(item.title||"").trim()),
      description:String(item.description||"").trim().length>=40,
      artwork:Boolean(String(item.imageUrl||"").trim()),
      tags:Boolean(String(item.tags||"").trim()),
      review:normalize(item.editorialReview)==="complete",
      consent:!minor||normalize(item.consentConfirmed)==="yes",
      promotedReady:!["featured","daily"].includes(placement)||(
        String(item.description||"").trim().length>=40&&Boolean(String(item.imageUrl||"").trim())&&Boolean(String(item.tags||"").trim())
      )
    };
  }

  function qualityFlags(item){
    const c=checksFor(item),flags=[];
    if(!c.media)flags.push("Media link");
    if(!c.title)flags.push("Title");
    if(!c.description)flags.push("Description");
    if(!c.artwork)flags.push("Artwork");
    if(!c.tags)flags.push("Discovery tags");
    if(!c.review)flags.push("Editorial review");
    if(!c.consent)flags.push("Minor consent");
    if(!c.promotedReady)flags.push("Promoted metadata");
    if(normalize(item.format)==="live"&&String(item.scheduledAt||"").trim()&&!Number.isFinite(Date.parse(item.scheduledAt)))flags.push("Live schedule");
    return [...new Set(flags)];
  }

  function currentRecord(){
    return {
      id:editingId,title:title.value,show:show.value,description:description.value,format:format.value,status:status.value,
      homePlacement:homePlacement.value,contentPillar:contentPillar.value,audience:audience.value,featured:featured.value,
      publishDate:publishDate.value,scheduledAt:scheduledAt.value,presenter:presenter.value,guest:guest.value,guestRole:guestRole.value,
      tags:tags.value,imageUrl:image.value,sponsor:sponsor.value,url:url.value,minorInvolved:minorInvolved.value,
      consentConfirmed:consentConfirmed.value,editorialReview:editorialReview.value
    };
  }

  function publishingBlockers(item){
    if(normalize(item.status)!=="published")return [];
    const blockers=[];
    if(normalize(item.editorialReview)!=="complete")blockers.push("complete editorial review");
    if(normalize(item.minorInvolved)==="yes"&&normalize(item.consentConfirmed)!=="yes")blockers.push("confirm consent for the minor");
    const placement=normalize(item.homePlacement||"auto");
    if(["featured","daily"].includes(placement)){
      if(String(item.description||"").trim().length<40)blockers.push("add a fuller description");
      if(!String(item.imageUrl||"").trim())blockers.push("add artwork");
      if(!String(item.tags||"").trim())blockers.push("add discovery tags");
    }
    return [...new Set(blockers)];
  }

  function refreshReadiness(){
    syncPlacement();
    const item=currentRecord(),checks=checksFor(item);
    const mapping={media:checks.media,title:checks.title,description:checks.description,artwork:checks.artwork,tags:checks.tags,review:checks.review,consent:checks.consent};
    $$("[data-readiness]").forEach(node=>{
      const ok=Boolean(mapping[node.dataset.readiness]);
      node.classList.toggle("ok",ok);node.classList.toggle("warn",!ok);
      node.setAttribute("aria-label",node.textContent+" — "+(ok?"complete":"needs attention"));
    });

    const blockers=publishingBlockers(item);
    const missing=Object.entries(mapping).filter(([,ok])=>!ok).map(([key])=>({
      media:"media link",title:"title",description:"description",artwork:"artwork",tags:"tags",review:"editorial review",consent:"consent"
    }[key]));

    if(status.value==="published"&&blockers.length){
      readinessTitle.textContent="Not ready to publish";
      readinessBadge.textContent="Publishing blocked";readinessBadge.className="readiness-badge blocked";
      readinessNote.textContent="Before publishing: "+blockers.join(", ")+".";
      summary.textContent="Complete the publishing requirements first.";
      form.querySelector('.publish-btn')?.setAttribute("data-blocked","true");
    }else if(status.value==="published"){
      readinessTitle.textContent="Ready for publishing";
      readinessBadge.textContent="Editorially ready";readinessBadge.className="readiness-badge ready";
      readinessNote.textContent=missing.length?"Publishing essentials are complete. Optional quality items still worth improving: "+missing.join(", ")+".":"Publishing essentials and quality checks are complete.";
      summary.textContent="Ready to publish to SpeakOut TV.";
      form.querySelector('.publish-btn')?.removeAttribute("data-blocked");
    }else{
      readinessTitle.textContent=missing.length?"Draft can be saved now":"Draft is editorially ready";
      readinessBadge.textContent=status.value==="hidden"?"Hidden":"Draft mode";readinessBadge.className="readiness-badge";
      readinessNote.textContent=missing.length?"Drafts can be saved while you finish: "+missing.join(", ")+".":"All editorial checks are complete. Switch visibility to Published when approved.";
      summary.textContent=editingId?"Update this content draft.":"Save content to the editorial library.";
      form.querySelector('.publish-btn')?.removeAttribute("data-blocked");
    }
  }

  function isFutureSchedule(item){
    const time=Date.parse(item.scheduledAt||"");
    return normalize(item.format)==="live"&&Number.isFinite(time)&&time>Date.now();
  }

  function updateMetrics(){
    const published=items.filter(item=>["published","active"].includes(normalize(item.status))).length;
    const drafts=items.filter(item=>normalize(item.status)==="draft").length;
    const live=items.filter(item=>normalize(item.format)==="live"||isFutureSchedule(item)).length;
    const featuredCount=items.filter(item=>normalize(item.homePlacement)==="featured"||normalize(item.featured)==="true").length;
    const attention=items.filter(item=>qualityFlags(item).length>0).length;
    const ready=items.length-attention;
    $("#publishedCount").textContent=published;
    $("#draftCount").textContent=drafts;
    $("#liveCount").textContent=live;
    $("#featuredCount").textContent=featuredCount;
    $("#reviewCount").textContent=attention;
    $("#readyCount").textContent=ready;
    $("#readyEditorialCount").textContent=ready;
    $("#attentionEditorialCount").textContent=attention;
    $("#scheduledEditorialCount").textContent=items.filter(isFutureSchedule).length;
    editorialHealth.textContent=attention?attention+" need attention":"Queue clear";
    editorialHealth.classList.toggle("attention",attention>0);
  }

  function editorialMatches(item,flags){
    const placement=normalize(item.homePlacement||"auto");
    if(editorialFilter==="needs")return flags.length>0;
    if(editorialFilter==="ready")return flags.length===0;
    if(editorialFilter==="featured")return placement==="featured"||normalize(item.featured)==="true";
    if(editorialFilter==="daily")return placement==="daily";
    return true;
  }

  function renderQueue(){
    const entries=items.map(item=>({item,flags:qualityFlags(item)}))
      .filter(({item,flags})=>editorialMatches(item,flags))
      .sort((a,b)=>{
        const aAttention=a.flags.length?0:1,bAttention=b.flags.length?0:1;
        const aPublished=["published","active"].includes(normalize(a.item.status))?0:1;
        const bPublished=["published","active"].includes(normalize(b.item.status))?0:1;
        return aAttention-bAttention||aPublished-bPublished||b.flags.length-a.flags.length;
      });
    if(!entries.length){
      queue.innerHTML='<div class="editorial-empty">No content matches this editorial filter.</div>';
      return;
    }
    queue.innerHTML=entries.slice(0,24).map(({item,flags})=>{
      const placement=normalize(item.homePlacement||"auto");
      const badges=[
        placement==="featured"?"Main Stage":"",
        placement==="daily"?"Today’s Focus":"",
        normalize(item.contentPillar)!=="general"?item.contentPillar:"",
        ...flags
      ].filter(Boolean);
      return '<article class="editorial-queue-item">'+
        '<div><small>'+esc(item.show||"SpeakOut TV")+' · '+esc(item.status||"active")+'</small>'+
        '<strong>'+esc(item.title||"Untitled")+'</strong>'+
        '<p>'+badges.map(flag=>'<span>'+esc(flag)+'</span>').join("")+'</p></div>'+
        '<button type="button" data-editorial-edit="'+esc(item.id)+'">'+(flags.length?"Review":"Edit")+'</button></article>';
    }).join("");
  }

  function populateSeriesFilter(){
    const selected=libraryShow.value||"all";
    const shows=[...new Set(items.map(item=>String(item.show||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    libraryShow.innerHTML='<option value="all">All series</option>'+shows.map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join("");
    libraryShow.value=shows.includes(selected)?selected:"all";
  }

  function applyLibraryFilters(){
    const q=normalize(librarySearch.value),wantedStatus=normalize(libraryStatus.value),wantedFormat=normalize(libraryFormat.value),wantedShow=normalize(libraryShow.value);
    let visible=0;
    $$("#rows tr").forEach(row=>{
      const edit=row.querySelector("[data-edit]");if(!edit)return;
      const item=items.find(candidate=>candidate.id===edit.dataset.edit);if(!item)return;
      const hay=normalize([item.title,item.show,item.tags,item.description,item.contentPillar,item.audience].join(" "));
      const match=(!q||hay.includes(q))&&(wantedStatus==="all"||normalize(item.status)===wantedStatus)&&(wantedFormat==="all"||normalize(item.format)===wantedFormat)&&(wantedShow==="all"||normalize(item.show)===wantedShow);
      row.hidden=!match;if(match)visible++;
      const titleCell=row.querySelector('td[data-label="Title"]');
      let meta=titleCell?.querySelector(".library-meta");
      if(titleCell&&!meta){meta=document.createElement("small");meta.className="library-meta";titleCell.appendChild(meta)}
      if(meta)meta.textContent=[item.show,item.format,item.homePlacement&&item.homePlacement!=="auto"?item.homePlacement:"",item.contentPillar&&item.contentPillar!=="general"?item.contentPillar:""].filter(Boolean).join(" · ");
    });
    libraryFilterStatus.textContent=visible+" of "+items.length+" item"+(items.length===1?"":"s")+" shown";
  }

  function focusEditorialItem(id){
    const button=$$("[data-edit]").find(candidate=>candidate.dataset.edit===id);
    button?.click();
  }

  function duplicateUrl(payload,id){
    const candidate=normalize(payload.url);if(!candidate)return null;
    return items.find(item=>item.id!==id&&normalize(item.url)===candidate)||null;
  }

  function showStudioMessage(message,tone="bad"){
    if(!statusBox)return;
    statusBox.textContent=message;statusBox.className="notice "+tone;
    statusBox.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function normalizeEditorDefaults(item={}){
    if(!homePlacement.value)homePlacement.value=normalize(item.featured)==="true"?"featured":"auto";
    if(!contentPillar.value)contentPillar.value="general";
    if(!audience.value)audience.value="youth";
    if(!editorialReview.value)editorialReview.value="pending";
    if(!minorInvolved.value)minorInvolved.value="no";
    if(!consentConfirmed.value)consentConfirmed.value="not_applicable";
    syncPlacement();
  }

  previewBtn?.addEventListener("click",prepare);
  url?.addEventListener("paste",()=>setTimeout(prepare,80));
  url?.addEventListener("change",prepare);
  url?.addEventListener("blur",()=>{if(url.value.trim())prepare()});

  $("#tagSuggestions")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-tag]");if(!button)return;
    const values=tags.value.split(",").map(value=>value.trim()).filter(Boolean);
    if(!values.some(value=>normalize(value)===normalize(button.dataset.tag)))values.push(button.dataset.tag);
    tags.value=values.join(", ");tags.dispatchEvent(new Event("input",{bubbles:true}));
  });

  $(".editorial-toolbar")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-editorial-filter]");if(!button)return;
    editorialFilter=button.dataset.editorialFilter||"all";
    $$("[data-editorial-filter]").forEach(candidate=>candidate.classList.toggle("active",candidate===button));
    renderQueue();
  });

  queue?.addEventListener("click",event=>{
    const button=event.target.closest("[data-editorial-edit]");
    if(button)focusEditorialItem(button.dataset.editorialEdit);
  });

  [librarySearch,libraryStatus,libraryFormat,libraryShow].forEach(control=>control?.addEventListener(control===librarySearch?"input":"change",applyLibraryFilters));

  ["url","title","description","tags","imageUrl","show","status","homePlacement","contentPillar","audience","format","scheduledAt","minorInvolved","consentConfirmed","editorialReview"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input",refreshReadiness);
    document.getElementById(id)?.addEventListener("change",refreshReadiness);
  });

  form?.addEventListener("reset",()=>setTimeout(()=>{normalizeEditorDefaults();refreshReadiness()},0));

  window.addEventListener("cms:items",event=>{
    if(event.detail?.collectionName!=="tvEpisodes")return;
    items=Array.isArray(event.detail.items)?event.detail.items:[];
    updateMetrics();renderQueue();populateSeriesFilter();applyLibraryFilters();
  });

  window.addEventListener("cms:editing",event=>{
    if(event.detail?.collectionName!=="tvEpisodes")return;
    editingId=event.detail.item?.id||null;
    setTimeout(()=>{
      normalizeEditorDefaults(event.detail.item||{});
      refreshReadiness();
      if(url.value.trim())preview(parse(url.value));
    },0);
  });

  window.addEventListener("cms:edit-cancelled",event=>{
    if(event.detail?.collectionName!=="tvEpisodes")return;
    editingId=null;setTimeout(()=>{normalizeEditorDefaults();refreshReadiness()},0);
  });

  window.addEventListener("cms:before-submit",event=>{
    if(event.detail?.collectionName!=="tvEpisodes")return;
    const payload=event.detail.payload||{};
    const duplicate=duplicateUrl(payload,event.detail.editingId);
    if(duplicate){
      event.preventDefault();showStudioMessage('This media link is already in the TV library as “'+(duplicate.title||"Untitled")+'”.');return;
    }
    const blockers=publishingBlockers(payload);
    if(blockers.length){
      event.preventDefault();showStudioMessage("Publishing blocked. Please "+blockers.join(", ")+".");return;
    }
  });

  normalizeEditorDefaults();
  refreshReadiness();
})();