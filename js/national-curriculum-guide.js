import {NATIONAL_CURRICULUM} from './national-curriculum.js';
const node=(tag,text)=>{const element=document.createElement(tag);element.textContent=text;return element;};
const list=items=>{const element=document.createElement('ul');for(const item of items)element.append(node('li',item));return element;};
document.getElementById('sharedSubjects').append(list(NATIONAL_CURRICULUM.sharedBasicSubjects));
for(const group of NATIONAL_CURRICULUM.groups){
 const article=document.createElement('article');article.append(node('h3',group.label));
 if(group.core){article.append(node('p','Senior core subjects'),list(group.core),node('p',`Pathways: ${group.pathways.join(', ')}. See the official offering for elective and trade choices.`));}
 else{article.append(node('p','Add to the shared basic subjects above:'),list(group.additional),node('p',`Optional: ${group.optional.join(', ')}.`));}
 const link=node('a',`Browse ${group.classes[0]} courses and materials`);link.href=`my-learning.html?stage=${group.stage}&class=${encodeURIComponent(group.classes[0])}`;
 article.append(node('p','This is the subject framework. Available courses and materials are listed separately; the guide does not claim complete coverage.'),link);
 document.getElementById('nationalGroups').append(article);
}
for(const source of NATIONAL_CURRICULUM.sources){const paragraph=document.createElement('p'),link=node('a',source.title);link.href=source.url;paragraph.append(link,document.createTextNode(` — ${source.scope}.`));document.getElementById('officialSources').append(paragraph);}
