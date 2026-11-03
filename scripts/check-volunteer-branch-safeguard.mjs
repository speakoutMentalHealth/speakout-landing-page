// Read-only branch-protection preflight. This does NOT attest to verified volunteers or certificates.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function assessBranch(branchInfo) {
  const protectedFlag = branchInfo?.protected === true;
  const listedChecks = [
    ...(Array.isArray(branchInfo?.protection?.required_status_checks?.contexts)
      ? branchInfo.protection.required_status_checks.contexts : []),
    ...(Array.isArray(branchInfo?.protection?.required_status_checks?.checks)
      ? branchInfo.protection.required_status_checks.checks.map(check => check?.context).filter(Boolean) : [])
  ];
  return {
    ok: protectedFlag,
    protected: protectedFlag,
    branchSha: typeof branchInfo?.commit?.sha === 'string' ? branchInfo.commit.sha : null,
    visibleRequiredChecks: [...new Set(listedChecks)].sort(),
    note: 'Protected-branch flag only. Repository admin must separately verify the exact required checks and bypass settings.'
  };
}

async function run() {
  const repository = process.env.GITHUB_REPOSITORY || '';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY must be owner/repository');
  const branch = process.env.PILOT_BASE_BRANCH || 'main';
  if (!/^[\w./-]+$/.test(branch) || branch.includes('..')) throw new Error('Invalid branch name');
  const api = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
  const url = `${api}/repos/${repository}/branches/${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Branch metadata request failed (HTTP ${response.status}); fail closed`);
  const assessment = assessBranch(await response.json());
  console.log(JSON.stringify({
    repository, branch, candidateSha: process.env.GITHUB_SHA || null,
    ...assessment
  }, null, 2));
  if (!assessment.ok) {
    console.error('PILOT BLOCKED: main is not protected. Enable branch protection/ruleset, then validate required checks with an administrator.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch(error => {
    console.error(`PILOT BLOCKED: ${error.message}`);
    process.exitCode = 1;
  });
}
