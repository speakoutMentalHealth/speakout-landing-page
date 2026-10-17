const b=document.querySelector('[data-portal-menu]'),l=document.querySelector('[data-portal-links]');if(b&&l)b.onclick=()=>l.classList.toggle('open');
// Account controls capture logout clicks and end the Firebase session.
import "./account-controls.js";