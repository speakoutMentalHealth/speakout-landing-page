const clean=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

const skins=[
  {skin:"move",keys:["on the move","on the walk","street"]},
  {skin:"podcast",keys:["podcast","speak podcast","audio","radio"]},
  {skin:"checkin",keys:["how are you really","wellbeing","mental reset"]},
  {skin:"youth",keys:["youth voices","youth"]},
  {skin:"campus",keys:["campus connect","campus","student","school"]},
  {skin:"expert",keys:["expert corner","expert","professional"]},
  {skin:"stories",keys:["speakout stories","stories","story"]},
  {skin:"special",keys:["speakout special","special","anthem"]},
  {skin:"live",keys:["speakout live","live"]}
];

export function artSkin(item={},kind="video"){
  if(kind==="live"||String(item.format||item.type||"").toLowerCase()==="live")return "live";
  if(kind==="audio")return "podcast";
  const hay=clean([item.slug,item.show,item.title,item.category,item.label,item.contentPillar].filter(Boolean).join(" "));
  return skins.find(group=>group.keys.some(key=>hay.includes(key)))?.skin||"default";
}

export function artLabel(item={},kind="video"){
  if(kind==="live")return "LIVE";
  if(kind==="audio")return String(item.audioType||item.show||"SPEAKOUT AUDIO").toUpperCase();
  return String(item.show||item.category||item.label||"SPEAKOUT TV").toUpperCase();
}

export function artClass(item={},kind="video"){
  return "tv-art tv-art-"+artSkin(item,kind);
}

export function artFallback(item={},kind="video"){
  const label=artLabel(item,kind);
  const title=String(item.title||item.show||"SpeakOut TV");
  return '<div class="'+artClass(item,kind)+' tv-art-fallback" aria-hidden="true"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(title)+'</strong><i></i></div>';
}

export function artOverlay(item={},kind="video"){
  return '<span class="tv-art-bug '+artClass(item,kind)+'">'+escapeHtml(artLabel(item,kind))+'</span>';
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
