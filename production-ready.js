(function(){
  'use strict';
  const body=document.body;
  if(!body) return;

  // Add On The Move to the public Programs menu without duplicating it.
  const publicProgramsMenu=[...document.querySelectorAll('.drop-menu')].find(menu=>
    [...menu.querySelectorAll('a')].some(a=>(a.textContent||'').trim()==='All Programs')
  );
  if(publicProgramsMenu && !publicProgramsMenu.querySelector('a[href*="on-the-move.html"]')){
    const link=document.createElement('a');
    const inPages=location.pathname.includes('/pages/');
    link.href=inPages?'on-the-move.html':'pages/on-the-move.html';
    link.textContent='SpeakOut On The Move';
    const community=[...publicProgramsMenu.querySelectorAll('a')].find(a=>(a.textContent||'').trim()==='Community Outreach');
    if(community) community.insertAdjacentElement('afterend',link); else publicProgramsMenu.appendChild(link);
  }

  // Add the On The Move operations entry point to the existing Admin Command Center.
  if((location.pathname.split('/').pop()||'').toLowerCase()==='admin-dashboard.html' && !document.querySelector('a[href="admin-on-the-move.html"]')){
    const cards=[...document.querySelectorAll('a.card')];
    const grid=cards[0]?.parentElement;
    if(grid){
      const card=document.createElement('a');
      card.className='card';
      card.href='admin-on-the-move.html';
      card.innerHTML='<h3>On The Move</h3><p>Review host requests, sponsor enquiries, delivery status, follow-up and impact.</p><span class="btn primary">Open Command Center</span>';
      grid.prepend(card);
    }
    const nav=document.querySelector('nav.links');
    if(nav){
      const link=document.createElement('a');
      link.className='btn soft';
      link.href='admin-on-the-move.html';
      link.textContent='On The Move';
      const logout=nav.querySelector('#logoutLink');
      if(logout) nav.insertBefore(link,logout); else nav.appendChild(link);
    }
  }

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
