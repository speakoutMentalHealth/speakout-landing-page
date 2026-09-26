import { requireRoles } from "../launch-role-guard.js";
import { adminApi } from "./platform-api.js";

const $=id=>document.getElementById(id);
const safe=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
const fmt=value=>{
  if(!value)return "Never";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(date);
};

let sources=[],discoveries=[],candidates=[],busy=false;

function status(message,type=""){
  const box=$("curatorStatus");
  box.textContent=message;
  box.className="notice"+(type?" "+type:"");
}
function sourceById(id){return sources.find(item=>item.id===id)||null}
function discoveryById(id){return discoveries.find(item=>item.id===id)||null}
function setBusy(value){
  busy=Boolean(value);
  for(const button of document.querySelectorAll("button"))button.disabled=busy;
}

function renderMetrics(configured){
  $("curatorConfigured").textContent=configured?"API configured":"Needs API key";
  $("curatorConfigured").classList.toggle("attention",!configured);
  $("sourceCount").textContent=sources.length;
  $("discoveryCount").textContent=discoveries.length;
  $("activeSourceCount").textContent=sources.filter(x=>String(x.status||"active")==="active").length;
  $("pendingCount").textContent=candidates.filter(x=>x.status==="pending").length;
  $("draftedCount").textContent=candidates.filter(x=>x.status==="drafted").length;
  $("rejectedCount").textContent=candidates.filter(x=>x.status==="rejected").length;
}

function renderSources(){
  const host=$("sourceList");
  if(!sources.length){
    host.innerHTML='<div class="curator-empty"><strong>No trusted sources yet.</strong><span>Add the first approved YouTube channel above.</span></div>';
    return;
  }
  host.innerHTML=sources.map(source=>{
    const active=String(source.status||"active")==="active";
    const mode=source.mode==="draft"?"Auto-draft":"Review inbox";
    const keywords=Array.isArray(source.includeKeywords)&&source.includeKeywords.length?source.includeKeywords.join(", "):"All uploads";
    return '<article class="curator-source-card">'+
      '<div class="curator-source-avatar">'+(source.channelThumbnailUrl?'<img src="'+safe(source.channelThumbnailUrl)+'" alt="" loading="lazy">':'YT')+'</div>'+
      '<div class="curator-source-copy"><small>'+safe(source.label||source.channelTitle||"YouTube source")+'</small><strong>'+safe(source.channelTitle||source.channelRef)+'</strong>'+
      '<span>'+safe(mode)+' · '+(active?"Active":"Paused")+' · '+safe(keywords)+'</span>'+
      '<em>Last sync: '+safe(fmt(source.lastSyncedAt))+(source.lastSyncError?' · '+safe(source.lastSyncError):'')+'</em></div>'+
      '<div class="curator-source-actions">'+
      '<button class="btn soft" type="button" data-source-sync="'+safe(source.id)+'">Sync</button>'+
      '<button class="btn soft" type="button" data-source-edit="'+safe(source.id)+'">Edit</button>'+
      '<button class="btn dark" type="button" data-source-delete="'+safe(source.id)+'">Remove</button>'+
      '</div></article>';
  }).join("");
}

function renderDiscoveries(){
  const host=$("discoveryList");
  if(!discoveries.length){
    host.innerHTML='<div class="curator-empty"><strong>No global discovery rules yet.</strong><span>Create a search such as “youth mental health” or “ADHD students”.</span></div>';
    return;
  }
  host.innerHTML=discoveries.map(rule=>{
    const active=String(rule.status||"active")==="active";
    const filters=Array.isArray(rule.includeKeywords)&&rule.includeKeywords.length?rule.includeKeywords.join(", "):"Query match";
    return '<article class="curator-source-card discovery-card">'+
      '<div class="curator-source-avatar discovery-avatar">⌕</div>'+
      '<div class="curator-source-copy"><small>'+safe(rule.label||"Global discovery")+'</small><strong>'+safe(rule.query||"YouTube search")+'</strong>'+
      '<span>Review only · '+(active?"Active":"Paused")+' · '+safe(filters)+' · '+safe(rule.lookbackDays||14)+' day lookback</span>'+
      '<em>Last scan: '+safe(fmt(rule.lastSyncedAt))+(rule.lastSyncError?' · '+safe(rule.lastSyncError):'')+'</em></div>'+
      '<div class="curator-source-actions">'+
      '<button class="btn soft" type="button" data-discovery-sync="'+safe(rule.id)+'">Scan</button>'+
      '<button class="btn soft" type="button" data-discovery-edit="'+safe(rule.id)+'">Edit</button>'+
      '<button class="btn dark" type="button" data-discovery-delete="'+safe(rule.id)+'">Remove</button>'+
      '</div></article>';
  }).join("");
}

function candidateMatches(item){
  const state=$("candidateState").value;
  const source=$("candidateSource").value;
  const query=$("candidateSearch").value.trim().toLowerCase();
  if(state!=="all"&&item.status!==state)return false;
  if(source!=="all"&&item.sourceId!==source)return false;
  if(query){
    const hay=[item.title,item.channelTitle,item.sourceLabel,item.discoveryQuery,item.description,item.contentPillar,item.show].join(" ").toLowerCase();
    if(!hay.includes(query))return false;
  }
  return true;
}

function renderCandidates(){
  const sourceSelect=$("candidateSource");
  const current=sourceSelect.value||"all";
  const trusted=sources.map(source=>'<option value="'+safe(source.id)+'">'+safe(source.label||source.channelTitle)+'</option>').join("");
  const global=discoveries.map(rule=>'<option value="'+safe(rule.id)+'">⌕ '+safe(rule.label||rule.query)+'</option>').join("");
  sourceSelect.innerHTML='<option value="all">All sources</option>'+trusted+global;
  if([...sourceSelect.options].some(option=>option.value===current))sourceSelect.value=current;

  const visible=candidates.filter(candidateMatches);
  $("visibleCandidateCount").textContent=visible.length+" of "+candidates.length;
  const host=$("candidateInbox");
  if(!visible.length){
    host.innerHTML='<div class="curator-empty"><strong>No matching candidates.</strong><span>Sync trusted sources, run global discovery, or change the filters.</span></div>';
    return;
  }
  host.innerHTML=visible.map(item=>{
    const pending=item.status==="pending";
    const drafted=item.status==="drafted";
    const description=String(item.description||"").trim().slice(0,240);
    const discovery=item.sourceKind==="discovery";
    return '<article class="candidate-card">'+
      '<div class="candidate-art">'+(item.thumbnailUrl?'<img src="'+safe(item.thumbnailUrl)+'" alt="" loading="lazy">':'<div class="candidate-fallback">YOUTUBE</div>')+
      '<span>YouTube · '+safe(item.channelTitle||"Creator")+'</span></div>'+
      '<div class="candidate-copy"><small>'+(discovery?'⌕ GLOBAL · ':'')+safe(item.sourceLabel||"Curated source")+' · '+safe(fmt(item.publishedAt))+'</small>'+
      '<h3>'+safe(item.title||"Untitled video")+'</h3><p>'+safe(description||"No description supplied by the creator.")+'</p>'+
      '<div class="candidate-meta"><span>'+safe(item.contentPillar||"general")+'</span><span>'+safe(item.show||"SpeakOut Picks")+'</span><span class="candidate-state '+safe(item.status||"pending")+'">'+safe(item.status||"pending")+'</span></div>'+
      '<div class="candidate-actions"><a class="btn soft" href="'+safe(item.url)+'" target="_blank" rel="noopener">Source ↗</a>'+
      (pending?'<button class="btn gold" type="button" data-candidate-draft="'+safe(item.id)+'">Send to drafts</button><button class="btn dark" type="button" data-candidate-reject="'+safe(item.id)+'">Reject</button>':"")+
      (drafted&&item.draftEpisodeId?'<a class="btn gold" href="admin-tv.html#library">Open TV Studio</a>':"")+
      '</div></div></article>';
  }).join("");
}

function fillSource(source){
  $("sourceId").value=source?.id||"";
  $("channelRef").value=source?.channelRef||source?.channelId||"";
  $("sourceLabel").value=source?.label||"";
  $("sourceShow").value=source?.show||"SpeakOut Picks";
  $("includeKeywords").value=(source?.includeKeywords||[]).join(", ");
  $("excludeKeywords").value=(source?.excludeKeywords||[]).join(", ");
  $("sourceMode").value=source?.mode||"review";
  $("sourceStatus").value=source?.status||"active";
  $("sourcePillar").value=source?.contentPillar||"motivation";
  $("sourceAudience").value=source?.audience||"youth";
  $("cancelSource").hidden=!source;
  if(source)$("channelRef").scrollIntoView({behavior:"smooth",block:"center"});
}
function sourcePayload(){
  return {
    channelRef:$("channelRef").value.trim(),
    label:$("sourceLabel").value.trim(),
    show:$("sourceShow").value.trim()||"SpeakOut Picks",
    includeKeywords:$("includeKeywords").value,
    excludeKeywords:$("excludeKeywords").value,
    mode:$("sourceMode").value,
    status:$("sourceStatus").value,
    contentPillar:$("sourcePillar").value,
    audience:$("sourceAudience").value
  };
}

function fillDiscovery(rule){
  $("discoveryId").value=rule?.id||"";
  $("discoveryQuery").value=rule?.query||"";
  $("discoveryLabel").value=rule?.label||"";
  $("discoveryShow").value=rule?.show||"SpeakOut Picks";
  $("discoveryIncludeKeywords").value=(rule?.includeKeywords||[]).join(", ");
  $("discoveryExcludeKeywords").value=(rule?.excludeKeywords||[]).join(", ");
  $("discoveryLookback").value=String(rule?.lookbackDays||14);
  $("discoveryMaxResults").value=String(rule?.maxResults||15);
  $("discoveryStatus").value=rule?.status||"active";
  $("discoveryPillar").value=rule?.contentPillar||"motivation";
  $("discoveryAudience").value=rule?.audience||"youth";
  $("cancelDiscovery").hidden=!rule;
  if(rule)$("discoveryQuery").scrollIntoView({behavior:"smooth",block:"center"});
}
function discoveryPayload(){
  return {
    query:$("discoveryQuery").value.trim(),
    label:$("discoveryLabel").value.trim(),
    show:$("discoveryShow").value.trim()||"SpeakOut Picks",
    includeKeywords:$("discoveryIncludeKeywords").value,
    excludeKeywords:$("discoveryExcludeKeywords").value,
    lookbackDays:Number($("discoveryLookback").value||14),
    maxResults:Number($("discoveryMaxResults").value||15),
    status:$("discoveryStatus").value,
    contentPillar:$("discoveryPillar").value,
    audience:$("discoveryAudience").value,
    relevanceLanguage:"en"
  };
}

async function load(message=""){
  try{
    if(message)status(message,"warn");
    const state=await adminApi.tvCuratorState();
    sources=Array.isArray(state.sources)?state.sources:[];
    discoveries=Array.isArray(state.discoveries)?state.discoveries:[];
    candidates=Array.isArray(state.candidates)?state.candidates:[];
    renderMetrics(state.configured);
    renderSources();
    renderDiscoveries();
    renderCandidates();
    if(state.configured)status("Curator ready. Global discovery is review-only; external videos remain on YouTube and require SpeakOut editorial review before public release.","ok");
    else status("Curator UI is ready, but the Worker still needs the encrypted YOUTUBE_API_KEY secret before discovery can run.","warn");
  }catch(error){
    console.error(error);
    status(error.message||"Could not load the curator.","bad");
  }
}

$("sourceForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(busy)return;
  setBusy(true);
  try{
    status("Resolving the YouTube channel and saving the source…","warn");
    await adminApi.saveTvCuratorSource(sourcePayload(),$("sourceId").value);
    fillSource(null);
    await load();
  }catch(error){
    console.error(error);status(error.message||"Could not save the source.","bad");
  }finally{setBusy(false)}
});
$("cancelSource").addEventListener("click",()=>fillSource(null));

$("discoveryForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(busy)return;
  setBusy(true);
  try{
    status("Saving global YouTube discovery rule…","warn");
    await adminApi.saveTvCuratorDiscovery(discoveryPayload(),$("discoveryId").value);
    fillDiscovery(null);
    await load();
  }catch(error){
    console.error(error);status(error.message||"Could not save discovery rule.","bad");
  }finally{setBusy(false)}
});
$("cancelDiscovery").addEventListener("click",()=>fillDiscovery(null));

$("syncAll").addEventListener("click",async()=>{
  if(busy)return;setBusy(true);
  try{
    status("Checking all active trusted YouTube sources…","warn");
    const result=await adminApi.syncTvCurator();
    const created=(result.results||[]).reduce((sum,row)=>sum+Number(row.created||0),0);
    const errors=(result.results||[]).filter(row=>row.error).length;
    await load();
    status("Trusted-source sync complete: "+created+" new candidate"+(created===1?"":"s")+(errors?" · "+errors+" source error"+(errors===1?"":"s"):"")+".",errors?"warn":"ok");
  }catch(error){console.error(error);status(error.message||"Curator sync failed.","bad")}
  finally{setBusy(false)}
});
$("syncDiscoveryAll").addEventListener("click",async()=>{
  if(busy)return;setBusy(true);
  try{
    status("Searching YouTube with active discovery rules…","warn");
    const result=await adminApi.syncTvCuratorDiscovery();
    const created=(result.results||[]).reduce((sum,row)=>sum+Number(row.created||0),0);
    const errors=(result.results||[]).filter(row=>row.error).length;
    await load();
    status("Global discovery complete: "+created+" new candidate"+(created===1?"":"s")+(errors?" · "+errors+" search error"+(errors===1?"":"s"):"")+".",errors?"warn":"ok");
  }catch(error){console.error(error);status(error.message||"Global discovery failed.","bad")}
  finally{setBusy(false)}
});

$("refreshCurator").addEventListener("click",()=>load("Refreshing curator…"));
for(const id of ["candidateState","candidateSource"])$(id).addEventListener("change",renderCandidates);
$("candidateSearch").addEventListener("input",renderCandidates);

document.addEventListener("click",async event=>{
  const sync=event.target.closest("[data-source-sync]");
  const edit=event.target.closest("[data-source-edit]");
  const remove=event.target.closest("[data-source-delete]");
  const discoverySync=event.target.closest("[data-discovery-sync]");
  const discoveryEdit=event.target.closest("[data-discovery-edit]");
  const discoveryRemove=event.target.closest("[data-discovery-delete]");
  const draft=event.target.closest("[data-candidate-draft]");
  const reject=event.target.closest("[data-candidate-reject]");

  if(edit){fillSource(sourceById(edit.dataset.sourceEdit));return}
  if(discoveryEdit){fillDiscovery(discoveryById(discoveryEdit.dataset.discoveryEdit));return}
  if(busy)return;

  if(sync){
    setBusy(true);
    try{status("Checking this trusted source…","warn");await adminApi.syncTvCurator(sync.dataset.sourceSync);await load()}
    catch(error){console.error(error);status(error.message||"Source sync failed.","bad")}
    finally{setBusy(false)}
    return;
  }
  if(discoverySync){
    setBusy(true);
    try{status("Running this YouTube search…","warn");await adminApi.syncTvCuratorDiscovery(discoverySync.dataset.discoverySync);await load()}
    catch(error){console.error(error);status(error.message||"Discovery scan failed.","bad")}
    finally{setBusy(false)}
    return;
  }
  if(remove){
    if(!confirm("Remove this curator source? Existing candidates and TV drafts will remain."))return;
    setBusy(true);
    try{await adminApi.deleteTvCuratorSource(remove.dataset.sourceDelete);await load()}
    catch(error){console.error(error);status(error.message||"Could not remove source.","bad")}
    finally{setBusy(false)}
    return;
  }
  if(discoveryRemove){
    if(!confirm("Remove this discovery rule? Existing candidates and TV drafts will remain."))return;
    setBusy(true);
    try{await adminApi.deleteTvCuratorDiscovery(discoveryRemove.dataset.discoveryDelete);await load()}
    catch(error){console.error(error);status(error.message||"Could not remove discovery rule.","bad")}
    finally{setBusy(false)}
    return;
  }
  if(draft||reject){
    const id=draft?.dataset.candidateDraft||reject?.dataset.candidateReject;
    const decision=draft?"draft":"reject";
    setBusy(true);
    try{
      status(decision==="draft"?"Creating an unpublished TV Studio draft…":"Rejecting candidate…","warn");
      await adminApi.reviewTvCuratorCandidate(id,decision);
      await load();
      status(decision==="draft"?"Draft created. Complete editorial review in TV Studio before publishing.":"Candidate rejected.","ok");
    }catch(error){console.error(error);status(error.message||"Could not update candidate.","bad")}
    finally{setBusy(false)}
  }
});

requireRoles(["admin","super_admin"],()=>load());
