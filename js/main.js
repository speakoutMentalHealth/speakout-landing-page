
const m=document.querySelector('.menu');
if(m)m.onclick=()=>document.body.classList.toggle('menu-open');
document.querySelectorAll('.links a').forEach(a=>a.onclick=()=>document.body.classList.remove('menu-open'));
document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const f=btn.dataset.filter;
    document.querySelectorAll('[data-category]').forEach(card=>{
      card.style.display=(f==='all'||card.dataset.category===f)?'block':'none';
    });
  });
});
