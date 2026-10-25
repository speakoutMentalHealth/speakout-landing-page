#!/usr/bin/env node
// Read-only inventory: calculates digests from repository files.
// This tool never marks resources trusted or writes to Firestore.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const catalogue=JSON.parse(readFileSync(resolve(root,'data/home-learning-catalog.json'),'utf8'));
const result={schema:1,generatedAt:new Date().toISOString(),status:'candidate-unverified',resources:[]};
for(const resource of catalogue.resources){
 const path=resource.resource_url;
 if(typeof path!=='string'||!/^[-a-zA-Z0-9_/]+\.html$/.test(path)||path.includes('..'))throw Error('Unsafe resource path: '+resource.id);
 const full=resolve(root,path);
 if(!full.startsWith(root+sep))throw Error('Resource path escapes repository');
 const bytes=readFileSync(full);
 result.resources.push({resourceId:resource.id,resourceUrl:path,contentSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,reviewStatus:resource.review_status});
}
const output=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--output')){
 const index=process.argv.indexOf('--output');
 const target=process.argv[index+1];
 if(!target||target.startsWith('-'))throw Error('Provide output file');
 writeFileSync(resolve(process.cwd(),target),output,{flag:'wx'});
}else process.stdout.write(output);
