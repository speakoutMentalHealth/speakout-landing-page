import test from 'node:test';
import assert from 'node:assert/strict';
import { setupCertificateDownload, decodeCertificatePdf } from '../js/volunteer-certificate-download.js';
const certificateId='MC-CERT-TEST-1234';
const valid={ok:true,status:'active',certificateId,holderVerified:true,pdfAvailable:true,downloadToken:'server-token',expiresAt:60000};
function harness(request) {
  const elements=Object.fromEntries(['downloadCertificateId','certificateDownloadForm','verifyDownloadCertificate','downloadCertificatePdf','certificateDownloadStatus'].map(id=>[id,{value:'',hidden:id==='downloadCertificatePdf',disabled:false,dataset:{},events:{},addEventListener(name,fn){this.events[name]=fn;}}]));
  const saves=[];
  setupCertificateDownload(certificateId,{root:{getElementById:id=>elements[id]},request,now:()=>1000,save:(...args)=>saves.push(args)});
  return {elements,saves,verify:()=>elements.certificateDownloadForm.events.submit({preventDefault(){}}),download:()=>elements.downloadCertificatePdf.events.click(),edit:()=>elements.downloadCertificateId.events.input()};
}
test('download locked until holder verification and official PDF readiness succeed',async()=>{
  let calls=0;
  const h=harness(async path=>{calls++;return path.endsWith('/verify')?valid:{ok:true,certificateId,pdfBase64:btoa('%PDF-1.7\nsynthetic test\n%%EOF\n')};});
  await h.download();assert.equal(calls,0);assert.equal(h.saves.length,0);
  await h.verify();assert.equal(h.elements.downloadCertificatePdf.hidden,false);
  await h.download();assert.equal(h.saves.length,1);assert.match(h.saves[0][1],/\.pdf$/);
});
test('unknown, revoked, mismatched, unbound and unavailable certificates stay locked',async()=>{
  for(const response of [{ok:false},{...valid,status:'revoked'},{...valid,certificateId:'OTHER'},{...valid,holderVerified:false},{...valid,pdfAvailable:false},{...valid,expiresAt:500}]){
    const h=harness(async()=>response);await h.verify();assert.equal(h.elements.downloadCertificatePdf.hidden,true);
  }
});
test('editing ID invalidates an earlier verification and discards in-flight response',async()=>{
  let resolve;const h=harness(()=>new Promise(r=>resolve=r));const pending=h.verify();h.elements.downloadCertificateId.value='MC-CERT-OTHER';h.edit();resolve(valid);await pending;
  assert.equal(h.elements.downloadCertificatePdf.hidden,true);await h.download();assert.equal(h.saves.length,0);
});
test('network failure and malformed PDF never produce a downloaded certificate',async()=>{
  const h=harness(async path=>path.endsWith('/verify')?valid:{ok:true,certificateId,pdfBase64:btoa('<html>Error</html>')});
  await h.verify();await h.download();assert.equal(h.saves.length,0);assert.equal(h.elements.downloadCertificatePdf.hidden,true);
  const offline=harness(async()=>{throw Error('offline')});await offline.verify();assert.equal(offline.elements.downloadCertificatePdf.hidden,true);
});
test('edited ID discards an in-flight download',async()=>{
  let resolve;const h=harness(path=>path.endsWith('/verify')?Promise.resolve(valid):new Promise(r=>resolve=r));
  await h.verify();const pending=h.download();h.edit();resolve({ok:true,certificateId,pdfBase64:btoa('%PDF-1.7\nsynthetic\n%%EOF\n')});await pending;assert.equal(h.saves.length,0);
});
test('PDF sanity checking rejects malformed, truncated and oversized files',()=>{
  assert.throws(()=>decodeCertificatePdf('!'));
  assert.throws(()=>decodeCertificatePdf('A'.repeat(7000001)));
  assert.throws(()=>decodeCertificatePdf(btoa('<html>Not a PDF</html>')));
  assert.throws(()=>decodeCertificatePdf(btoa('%PDF-1.7\ntruncated without trailer')));
  // A valid-looking header and trailer must not bypass the exact 5MB cap.
  const oversized = '%PDF-1.7\n' + 'X'.repeat(5_000_000) + '\n%%EOF\n';
  assert.throws(()=>decodeCertificatePdf(btoa(oversized)));
  const bytes = decodeCertificatePdf(btoa('%PDF-1.7\nsynthetic\n%%EOF\n'));
  assert.equal(new TextDecoder().decode(bytes).startsWith('%PDF-'),true);
});
