const target=document.body.dataset.redirectTarget;
if(target){
  const destination=new URL(target,window.location.href);
  destination.search=window.location.search;
  destination.hash=window.location.hash;
  window.location.replace(destination.toString());
}
