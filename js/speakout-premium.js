const menuBtn=document.querySelector("[data-menu-btn]");
const navLinks=document.querySelector("[data-nav-links]");
if(menuBtn&&navLinks){
  menuBtn.addEventListener("click",()=>{
    const open=navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded",open?"true":"false");
    menuBtn.textContent=open?"×":"☰";
  });
  navLinks.querySelectorAll("a").forEach(link=>{
    link.addEventListener("click",()=>{
      navLinks.classList.remove("open");
      menuBtn.setAttribute("aria-expanded","false");
      menuBtn.textContent="☰";
    });
  });
}
