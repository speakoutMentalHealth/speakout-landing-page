/* SpeakHub learner shell
   Shared, dependency-free progressive enhancement for learner-facing pages. */
(function(){
  function normalizePath(value){
    try{
      var url=new URL(value,window.location.href);
      return url.pathname.split("/").pop() || "index.html";
    }catch(_){return String(value||"");}
  }

  function markCurrentNavigation(){
    var current=normalizePath(window.location.href);
    document.querySelectorAll(".links,.nav-links").forEach(function(nav){
      if(nav.tagName==="NAV"&&!nav.getAttribute("aria-label")) nav.setAttribute("aria-label","Learner navigation");
    });
    document.querySelectorAll(".links a[href], .nav-links a[href]").forEach(function(link){
      var target=normalizePath(link.getAttribute("href"));
      var logicalActive=link.dataset.roleActive==="true";
      if(logicalActive||target===current) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    });
  }

  function normalizeLegacyNavigation(){
    document.body.classList.remove("menu-open");
    document.querySelectorAll(".menu").forEach(function(button){
      button.hidden=true;
      button.setAttribute("aria-hidden","true");
      button.tabIndex=-1;
    });
  }

  function keepActiveNavVisible(){
    var active=document.querySelector('.links [aria-current="page"], .nav-links [aria-current="page"]');
    if(!active) return;
    var nav=active.closest(".links,.nav-links");
    if(!nav) return;
    requestAnimationFrame(function(){
      try{active.scrollIntoView({block:"nearest",inline:"center",behavior:"auto"});}
      catch(_){active.scrollIntoView(false);}
    });
  }

  function labelTableRows(table,headers){
    table.querySelectorAll("tbody tr").forEach(function(row){
      var cells=Array.from(row.children).filter(function(cell){return cell.tagName==="TD";});
      if(cells.length===headers.length){
        cells.forEach(function(cell,index){
          if(!cell.hasAttribute("data-label")) cell.setAttribute("data-label",headers[index]||"");
        });
      }
    });
  }

  function enhanceTables(){
    document.querySelectorAll("table").forEach(function(table){
      if(!table.getAttribute("role")) table.setAttribute("role","table");
      var wrapper=table.closest(".table-wrap");
      if(!wrapper){
        wrapper=document.createElement("div");
        wrapper.className="table-wrap";
        table.parentNode.insertBefore(wrapper,table);
        wrapper.appendChild(table);
      }

      var headers=Array.from(table.querySelectorAll("thead th")).map(function(cell){
        return cell.textContent.trim();
      });
      if(headers.length){
        table.classList.add("learner-card-table");
        wrapper.classList.add("learner-card-table-wrap");
        labelTableRows(table,headers);

        if(table.dataset.learnerTableObserved!=="true"){
          var body=table.querySelector("tbody");
          if(body){
            new MutationObserver(function(){
              labelTableRows(table,headers);
            }).observe(body,{childList:true,subtree:true});
            table.dataset.learnerTableObserved="true";
          }
        }
      }
    });
  }

  function enhanceImages(){
    document.querySelectorAll("img:not([loading])").forEach(function(img){
      if(!img.closest(".brand")) img.setAttribute("loading","lazy");
    });
  }

  function setShellReady(){
    document.documentElement.dataset.learnerShell="ready";
  }

  function refreshNavigation(){
    markCurrentNavigation();
    keepActiveNavVisible();
  }

  document.addEventListener("DOMContentLoaded",function(){
    normalizeLegacyNavigation();
    refreshNavigation();
    enhanceTables();
    enhanceImages();
    setShellReady();
  });

  document.addEventListener("speakout:nav-updated",refreshNavigation);

  window.addEventListener("popstate",refreshNavigation);
})();