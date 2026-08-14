(function(){
  'use strict';
  const body=document.body;
  if(!body) return;
  // Mark current navigation destination when possible.
  const here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  document.querySelectorAll('nav a[href]').forEach(a=>{
    const target=(a.getAttribute('href')||'').split('#')[0].split('?')[0].split('/').pop().toLowerCase();
    if(target && target===here){a.setAttribute('aria-current','page');}
  });
  // Safer external links.
  document.querySelectorAll('a[target="_blank"]').forEach(a=>{
    const rel=new Set((a.getAttribute('rel')||'').split(/\s+/).filter(Boolean)); rel.add('noopener'); rel.add('noreferrer'); a.setAttribute('rel',[...rel].join(' '));
  });
  // Prevent intentionally disabled placeholder navigation.
  document.querySelectorAll('[aria-disabled="true"]').forEach(el=>el.addEventListener('click',e=>e.preventDefault()));
  // Accessible labels for icon-only controls.
  document.querySelectorAll('button,a').forEach(el=>{
    if(!el.getAttribute('aria-label') && !el.textContent.trim() && (el.querySelector('svg,i,img'))){
      const t=el.getAttribute('title')||el.querySelector('img')?.getAttribute('alt'); if(t) el.setAttribute('aria-label',t);
    }
  });
})();
