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
    document.querySelectorAll(".links a[href], .nav-links a[href]").forEach(function(link){
      var target=normalizePath(link.getAttribute("href"));
      if(target===current) link.setAttribute("aria-current","page");
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
      try{active.scrollIntoView({block:"nearest",inline:"center",behavior:"instant"});}
      catch(_){active.scrollIntoView(false);}
    });
  }

  function enhanceTables(){
    document.querySelectorAll("table").forEach(function(table){
      if(!table.getAttribute("role")) table.setAttribute("role","table");
      if(!table.closest(".table-wrap")){
        var wrapper=document.createElement("div");
        wrapper.className="table-wrap";
        table.parentNode.insertBefore(wrapper,table);
        wrapper.appendChild(table);
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

  document.addEventListener("DOMContentLoaded",function(){
    normalizeLegacyNavigation();
    markCurrentNavigation();
    keepActiveNavVisible();
    enhanceTables();
    enhanceImages();
    setShellReady();
  });

  window.addEventListener("popstate",function(){
    markCurrentNavigation();
    keepActiveNavVisible();
  });
})();