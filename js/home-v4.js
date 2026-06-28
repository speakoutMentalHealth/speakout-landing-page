
const menuBtn = document.querySelector('.menu-btn');
if (menuBtn) menuBtn.addEventListener('click', () => document.body.classList.toggle('menu-open'));

document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => document.body.classList.remove('menu-open'));
});

document.querySelectorAll('.nav-dropdown > button').forEach(btn => {
  btn.addEventListener('click', () => btn.parentElement.classList.toggle('open'));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.body.classList.remove('menu-open');
});

