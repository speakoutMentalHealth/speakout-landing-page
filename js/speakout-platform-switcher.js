(()=>{
if(document.getElementById('speakout-platform-switcher'))return;
const entries=[['SpeakOut','https://speakoutmentalhealth.org/','Official website'],['MindCheck','https://mindcheck.speakoutmentalhealth.org/','Mental wellness'],['SpeakOut TV','https://speakoutmentalhealth.org/tv.html','Videos and audio']];
const css=document.createElement('style');
css.textContent='#speakout-platform-switcher{position:fixed;top:90px;right:12px;z-index:9999;font:14px system-ui,sans-serif}#speakout-platform-switcher button{border:1px solid #ffffff55;border-radius:999px;padding:11px 15px;background:#09213d;color:#fff;font:700 13px system-ui;box-shadow:0 6px 25px #0005;cursor:pointer}#speakout-platform-switcher nav{position:absolute;right:0;top:calc(100% + 8px);width:min(280px,calc(100vw - 24px));padding:8px;background:#0b1c35;border:1px solid #ffffff40;border-radius:16px;box-shadow:0 14px 40px #0008}#speakout-platform-switcher nav[hidden]{display:none}#speakout-platform-switcher a{display:block;padding:12px;border-radius:9px;color:white;text-decoration:none}#speakout-platform-switcher a:hover{background:#ffffff20}#speakout-platform-switcher small{display:block;color:#b4c6d9;margin-top:3px}#speakout-platform-switcher :focus-visible{outline:3px solid #f4a21c;outline-offset:2px}@media(max-width:600px){#speakout-platform-switcher{top:76px;right:10px}}';
document.head.appendChild(css);
const wrap=document.createElement('div');wrap.id='speakout-platform-switcher';
const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Explore SpeakOut ▾';toggle.setAttribute('aria-label','Switch SpeakOut platform');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','speakout-platform-menu');
const menu=document.createElement('nav');menu.id='speakout-platform-menu';menu.hidden=true;menu.setAttribute('aria-label','SpeakOut ecosystem');
for(const [title,url,detail] of entries){const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer';const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=detail;a.append(strong,small);menu.appendChild(a)}
function close(){menu.hidden=true;toggle.setAttribute('aria-expanded','false')}
toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});
document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){close();toggle.focus()}});
wrap.append(toggle,menu);document.body.appendChild(wrap);
})();