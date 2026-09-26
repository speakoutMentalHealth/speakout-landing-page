const DEFAULT_SELECTOR=".content-rail,.originals-rail,.ios-episode-strip,.ios-audio-strip,.listen-rail,.live-previous-rail,.topic-journey-grid";

const motionBehavior=()=>matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";

function labelFor(rail){
 return rail.getAttribute("aria-label")
  ||rail.closest("section")?.querySelector("h1,h2,h3")?.textContent?.trim()
  ||"content";
}

function updateShell(shell){
 const rail=shell.querySelector("[data-global-overflow-rail]");
 if(!rail)return;
 const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
 const overflow=max>8;
 const navigable=overflow||rail.children.length>1;
 shell.classList.toggle("has-overflow",overflow);
 shell.classList.toggle("has-navigation",navigable);
 const prev=shell.querySelector('[data-global-rail-arrow="prev"]');
 const next=shell.querySelector('[data-global-rail-arrow="next"]');
 if(prev)prev.disabled=!overflow||rail.scrollLeft<=8;
 if(next)next.disabled=!overflow||rail.scrollLeft>=max-8;
}

export function updateOverflowRailControls(){
 document.querySelectorAll(".tv-global-rail-shell").forEach(updateShell);
}

export function installOverflowRailControls(selector=DEFAULT_SELECTOR){
 document.querySelectorAll(selector).forEach(rail=>{
  if(rail.closest(".tv-rail-shell,.tv-global-rail-shell"))return;
  if(rail.closest(".discovery-group")?.querySelector(".discovery-rail-nav"))return;

  const shell=document.createElement("div");
  shell.className="tv-global-rail-shell";
  rail.parentNode.insertBefore(shell,rail);
  shell.appendChild(rail);
  rail.dataset.globalOverflowRail="true";

  const nav=document.createElement("div");
  nav.className="tv-global-rail-nav";
  nav.setAttribute("aria-label",labelFor(rail)+" navigation");

  for(const [direction,symbol] of [["prev","‹"],["next","›"]]){
   const button=document.createElement("button");
   button.type="button";
   button.className="tv-global-rail-arrow "+direction;
   button.dataset.globalRailArrow=direction;
   button.setAttribute("aria-label",(direction==="prev"?"Previous ":"Next ")+labelFor(rail));
   button.innerHTML='<span aria-hidden="true">'+symbol+"</span>";
   button.addEventListener("click",()=>{
    const amount=Math.max(300,Math.round(rail.clientWidth*.82));
    rail.scrollBy({left:(direction==="prev"?-1:1)*amount,behavior:motionBehavior()});
   });
   nav.appendChild(button);
  }

  shell.prepend(nav);
  rail.addEventListener("scroll",()=>requestAnimationFrame(()=>updateShell(shell)),{passive:true});
  if("ResizeObserver" in window)new ResizeObserver(()=>updateShell(shell)).observe(rail);
  if("MutationObserver" in window)new MutationObserver(()=>requestAnimationFrame(()=>updateShell(shell))).observe(rail,{childList:true});
 });

 requestAnimationFrame(updateOverflowRailControls);
}
