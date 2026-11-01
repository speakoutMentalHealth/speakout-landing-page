/* Pure, reusable Kiddies TV Studio utilities. Never grants video approval. */
export const AGES=['3-5','6-9','10-12','13-17'];
export const SUBJECTS=['English & Phonics','English & Grammar','Literature & Storytelling','Mathematics','Science & Nature','Geography & Culture','Nigerian History & Citizenship','Nigerian Languages','Coding & Digital Literacy','Creative Arts & Music','Health & Wellbeing','Life Skills','Business & Financial Literacy','Agriculture & Environment','Sports & Movement','Practical Skills & Careers'];
export function parseYouTubeId(input){
 const raw=String(input||'').trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(raw))return raw;
 try{
  const u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,'');
  let id='';
  if(host==='youtu.be')id=u.pathname.split('/')[1]||'';
  if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))
   id=u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]||'';
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function parseCsv(source){
 const text=String(source||'').replace(/^\uFEFF/,'');
 const rows=[];let field='',row=[],quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){field+='"';i++;}
   else if(!quoted&&!field){quoted=true;}
   else if(quoted){quoted=false;}
   else throw Error('Unexpected quotation mark in CSV.');
  }else if(ch===','&&!quoted){row.push(field);field='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(field);field='';
   if(row.some(x=>x.trim()))rows.push(row);
   row=[];
  }else field+=ch;
 }
 if(quoted)throw Error('CSV has an unclosed quoted value.');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
export function previewBulkImport(input,existing=[],{maxRows=40}={}){
 const rows=parseCsv(input);
 if(!rows.length)return {videos:[],errors:['Paste CSV with a header and at least one lesson.']};
 const head=rows.shift().map(x=>x.trim().toLowerCase());
 const wanted=['url','title','description','source','category','ages'];
 const errors=[];
 for(const key of wanted)if(!head.includes(key))errors.push('Missing column: '+key);
 if(errors.length)return {videos:[],errors};
 if(rows.length>maxRows)errors.push('Maximum '+maxRows+' videos per import. Split into smaller batches.');
 const found=new Set(existing),local=new Set(),videos=[];
 rows.forEach((row,i)=>{
  const no=i+2,raw=Object.fromEntries(wanted.map(key=>[key,(row[head.indexOf(key)]||'').trim()]));
  const youtubeId=parseYouTubeId(raw.url);
  const ages=raw.ages.split(/[|;]/).map(x=>x.trim()).filter(Boolean);
  if(row.length>head.length)errors.push('Row '+no+': extra CSV columns; quote values containing commas.');
  if(!youtubeId)errors.push('Row '+no+': invalid YouTube video URL or ID.');
  if(youtubeId&&(found.has(youtubeId)||local.has(youtubeId)))errors.push('Row '+no+': duplicate video '+youtubeId+'.');
  if(youtubeId)local.add(youtubeId);
  if(raw.title.length<5||raw.title.length>160)errors.push('Row '+no+': title must be 5–160 characters.');
  if(raw.source.length<2||raw.source.length>120)errors.push('Row '+no+': creator must be 2–120 characters.');
  if(raw.description.length<15||raw.description.length>250)errors.push('Row '+no+': description must be 15–250 characters.');
  if(!SUBJECTS.includes(raw.category))errors.push('Row '+no+': choose a supported subject.');
  if(!ages.length||new Set(ages).size!==ages.length||ages.some(x=>!AGES.includes(x)))
   errors.push('Row '+no+': use valid age bands separated with |, for example 6-9|10-12.');
  videos.push({youtubeId,title:raw.title,description:raw.description,source:raw.source,category:raw.category,ages,
   status:'draft',approved:false,reviewConfirmed:false,reviewer:'',reviewDate:''});
 });
 if(!rows.length)errors.push('CSV contains no lesson rows.');
 return {videos:errors.length?[]:videos,errors,rows:rows.length};
}
export function buildCoverage(videos){
 const cells={};for(const name of SUBJECTS)cells[name]=Object.fromEntries(AGES.map(a=>[a,0]));
 for(const video of videos){
  if(!cells[video.category])continue;
  for(const age of video.ages||[])if(AGES.includes(age))cells[video.category][age]++;
 }
 return {cells,total:videos.length,ageTotals:Object.fromEntries(AGES.map(a=>[a,videos.filter(v=>v.ages?.includes(a)).length])),
  empty:SUBJECTS.filter(x=>AGES.every(age=>cells[x][age]===0))};
}
export function getReviewQueue(rows){
 return rows.filter(x=>x.status==='draft'||(x.status==='published'&&!x.reviewConfirmed))
  .sort((a,b)=>Number(b.status==='draft')-Number(a.status==='draft')||a.title.localeCompare(b.title));
}
export function determineAction(previous,next,{bulk=false}={}){
 if(bulk)return 'bulk_import_draft';
 if(!previous)return next==='published'?'publish':'create_draft';
 if(next==='archived')return 'archive';
 if(previous==='archived'&&next==='draft')return 'restore_draft';
 if(previous==='published'&&next==='draft')return 'unpublish';
 if(next==='published'&&previous!=='published')return 'publish';
 if(next==='published')return 'edit_published';
 return 'edit_draft';
}
