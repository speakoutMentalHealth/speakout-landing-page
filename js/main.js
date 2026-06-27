
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => document.body.classList.remove('menu-open'));
});

const menu = document.querySelector('.menu');
if (menu) {
  menu.addEventListener('click', () => document.body.classList.toggle('menu-open'));
}
