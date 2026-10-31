// Run only in the authorized production deployment job. Never print key material.
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const signingKey=randomBytes(48).toString('base64url');
console.log('::add-mask::'+signingKey);
for(const name of ['speakout-platform-api','mindcheck-guide']){
 execFileSync('npx',['wrangler','secret','put','AGE_AUTH_SECRET','--name',name],{input:signingKey,stdio:['pipe','pipe','pipe'],cwd:'workers/platform-api',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 console.log('Signing binding provisioned on '+name+'.');
}
