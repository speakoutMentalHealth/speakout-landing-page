
const menu = document.querySelector('.menu');
if (menu) menu.addEventListener('click', () => document.body.classList.toggle('menu-open'));
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => document.body.classList.remove('menu-open')));
