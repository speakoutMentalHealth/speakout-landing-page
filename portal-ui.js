/* SpeakOut Portal UI helpers — intentionally dependency-free. */
(function(){
  function normalizePath(value){
    try{
      var url=new URL(value,window.location.href);
      return url.pathname.split('/').pop() || 'index.html';
    }catch(_){return value;}
  }

  document.addEventListener('DOMContentLoaded',function(){
    var current=normalizePath(window.location.href);
    document.querySelectorAll('.links a[href], .nav-links a[href]').forEach(function(link){
      var target=normalizePath(link.getAttribute('href'));
      if(target===current){
        link.setAttribute('aria-current','page');
      }
    });

    document.querySelectorAll('table').forEach(function(table){
      if(!table.getAttribute('role')) table.setAttribute('role','table');
    });

    document.querySelectorAll('img:not([loading])').forEach(function(img){
      if(!img.closest('.brand')) img.setAttribute('loading','lazy');
    });
  });
})();
