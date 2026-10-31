import {requireRoles} from '../launch-role-guard.js';
import {platformRequest} from './platform-api.js';
const $=id=>document.getElementById(id);
requireRoles(['super_admin'],async()=>{
 for(const action of ['read','grant','revoke'])$(action).onclick=async()=>{
  try{if(action==='grant'&&!$('verified').checked)throw Error('Confirm documented adult verification first.');
   const result=await platformRequest('/v1/admin/mindcheck/access',{action,uid:$('uid').value.trim(),adultVerified:$('verified').checked,verificationMethod:$('method').value});
   $('status').textContent=JSON.stringify(result.grant||{status:'No AI pilot approval'},null,2);$('verified').checked=false;
  }catch(error){$('status').textContent=error.message}
 };
});
