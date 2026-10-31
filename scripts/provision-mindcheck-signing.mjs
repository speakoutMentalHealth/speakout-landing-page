// Run only in the authorized production deployment job. Never print key material.
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const workers=['speakout-platform-api','mindcheck-guide'];
const existing=workers.map(name=>JSON.parse(execFileSync('npx',['wrangler','secret','list','--name',name],{encoding:'utf8',cwd:'workers/platform-api',env:{...process.env,WRANGLER_SEND_METRICS:'false'}})).some(item=>item.name==='AGE_AUTH_SECRET'));
if(existing.every(Boolean)){console.log('Existing signing bindings retained; the live synthetic test verifies the shared configuration.');process.exit(0);}
const signingKey=randomBytes(48).toString('base64url');
console.log('::add-mask::'+signingKey);
for(const name of ['speakout-platform-api','mindcheck-guide']){
 execFileSync('npx',['wrangler','secret','put','AGE_AUTH_SECRET','--name',name],{input:signingKey,stdio:['pipe','pipe','pipe'],cwd:'workers/platform-api',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 console.log('Signing binding provisioned on '+name+'.');
}
