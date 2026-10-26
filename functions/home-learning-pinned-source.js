"use strict";

// Read exact bytes at a pinned Git commit from an allowlisted GitHub repository.
// Injection of fetch allows deterministic tests; do not pass untrusted fetch.
function createPinnedGitHubSourceLoader({fetchImpl=globalThis.fetch,repository="speakoutMentalHealth/speakout-landing-page",maxBytes=2_000_000}={}) {
  if(repository!=="speakoutMentalHealth/speakout-landing-page") throw new Error("Repository not allowlisted");
  if(typeof fetchImpl!=="function") throw new Error("Fetch unavailable");
  return async function loadSourceAtCommit({sourceCommit,resourceUrl}) {
    if(typeof sourceCommit!=="string" || !/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error("Full commit SHA required");
    if(typeof resourceUrl!=="string" || !/^[a-zA-Z0-9_/-]+\.html$/.test(resourceUrl) ||
      resourceUrl.includes("..") || resourceUrl.startsWith("/") || resourceUrl.includes("//")) {
      throw new Error("Invalid resource path");
    }
    const url=`https://raw.githubusercontent.com/${repository}/${sourceCommit}/${resourceUrl}`;
    const response=await fetchImpl(url,{redirect:"error",signal:AbortSignal.timeout(10000)});
    if(!response || !response.ok || response.status!==200) throw new Error("Pinned resource unavailable");
    const len=response.headers?.get?.("content-length");
    if(len!==null && len!==undefined && (!/^\d+$/.test(len) || Number(len)>maxBytes)) throw new Error("Resource too large");
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!bytes.length || bytes.length>maxBytes) throw new Error("Resource size invalid");
    return bytes;
  };
}
module.exports={createPinnedGitHubSourceLoader};
