(()=> {
  const $=id=>document.getElementById(id);
  const form=$("cmsForm"),title=$("title"),slug=$("slug"),category=$("category"),host=$("host"),description=$("description"),image=$("imageUrl"),status=$("status");
  const readiness=$("seriesReadiness"),readinessList=$("seriesReadinessList"),summary=$("seriesPublishSummary");
  const previewArt=$("seriesPreviewArt"),previewTitle=$("seriesPreviewTitle"),previewCategory=$("seriesPreviewCategory"),previewDescription=$("seriesPreviewDescription"),previewHost=$("seriesPreviewHost");
  const statusBox=$("statusBox");
  let items=[],slugLocked=false;

  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const slugify=value=>String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);
  const validImage=raw=>{try{const u=new URL(String(raw||"").trim());return ["http:","https:"].includes(u.protocol)}catch{return false}};

  function currentEditingId(){
    return document.querySelector('[data-edit][aria-current="true"]')?.dataset.edit||"";
  }

  function quality(){
    const currentSlug=slug.value.trim().toLowerCase();
    const duplicate=items.some(item=>item.id!==currentEditingId()&&String(item.slug||"").toLowerCase()===currentSlug&&currentSlug);
    const checks=[
      ["Clear title",title.value.trim().length>=3],
      ["Valid public slug",/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(currentSlug)],
      ["Category",category.value.trim().length>=2],
      ["Useful description",description.value.trim().length>=40],
      ["Series artwork",validImage(image.value)],
      ["Unique slug",!duplicate]
    ];
    return {checks,ready:checks.every(([,ok])=>ok),duplicate};
  }

  function updatePreview(){
    const q=quality();
    previewTitle.textContent=title.value.trim()||"Untitled Series";
    previewCategory.textContent=(category.value.trim()||"SPEAKOUT ORIGINAL").toUpperCase();
    previewDescription.textContent=description.value.trim()||"Add a clear description so viewers know why this series is worth entering.";
    previewHost.textContent=host.value.trim()?"Hosted by "+host.value.trim():"Host optional";
    const art=image.value.trim();
    previewArt.style.backgroundImage=validImage(art)?'url("'+art.replace(/"/g,"%22")+'")':"";
    previewArt.classList.toggle("has-image",validImage(art));
    readiness.textContent=q.ready?"Ready":"Needs work";
    readiness.classList.toggle("ready",q.ready);
    readinessList.innerHTML=q.checks.map(([label,ok])=>'<span class="'+(ok?"ok":"missing")+'">'+(ok?"✓":"•")+" "+esc(label)+'</span>').join("");
    summary.textContent=status.value==="published"
      ? q.ready?"Series identity is ready to publish.":"Publishing is blocked until the identity checks are complete."
      : "Save as draft while you build the identity.";
    form.dataset.seriesReady=String(q.ready);
    return q;
  }

  title.addEventListener("input",()=>{
    if(!slugLocked||!slug.value.trim())slug.value=slugify(title.value);
    updatePreview();
  });
  slug.addEventListener("input",()=>{slugLocked=true;slug.value=slugify(slug.value);updatePreview()});
  for(const field of [category,host,description,image,status]) {
    field.addEventListener("input",updatePreview);
    field.addEventListener("change",updatePreview);
  }

  document.addEventListener("click",event=>{
    if(event.target.closest("[data-edit]"))slugLocked=true;
  },true);

  form.addEventListener("reset",()=>setTimeout(()=>{slugLocked=false;updatePreview()},0));

  document.addEventListener("cms:render",event=>{
    if(event.detail?.collectionName!=="tvShows")return;
    items=Array.isArray(event.detail.items)?event.detail.items:[];
    updatePreview();
  });

  form.addEventListener("submit",event=>{
    const q=updatePreview();
    if(status.value==="published"&&!q.ready){
      event.preventDefault();event.stopImmediatePropagation();
      statusBox.textContent=q.duplicate
        ?"Publishing blocked: another series already uses this URL slug."
        :"Publishing blocked: complete the series identity checks first. You can save it as a draft.";
      statusBox.className="notice bad";
      document.querySelector(".series-preview-card")?.scrollIntoView({behavior:"smooth",block:"center"});
    }
  },true);

  updatePreview();
})();