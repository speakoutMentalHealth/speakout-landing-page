// Fail closed when a queued release job belongs to a superseded PR commit.
// No Firebase or Cloudflare requests are made by this admission guard.
const SHA = /^[a-f0-9]{40}$/i;
const REPOSITORY = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

export function classifyHead({ eventName, eventHead, currentHead, state }) {
  if (eventName !== "pull_request") return { status: "not_applicable" };
  if (!SHA.test(eventHead) || !SHA.test(currentHead)) return { status: "invalid_sha" };
  if (state !== "open") return { status: "not_open" };
  return eventHead.toLowerCase() === currentHead.toLowerCase()
    ? { status: "current" }
    : { status: "superseded" };
}

export async function verifyReleaseHead(env, request = fetch) {
  if (env.GITHUB_EVENT_NAME !== "pull_request") return { status: "not_applicable" };
  const repository = String(env.GITHUB_REPOSITORY || "");
  const number = String(env.PR_NUMBER || "");
  const eventHead = String(env.PR_HEAD_SHA || "");
  if (!REPOSITORY.test(repository) || !/^[1-9][0-9]{0,8}$/.test(number) || !SHA.test(eventHead)) {
    throw Error("Invalid GitHub PR release-head context.");
  }
  const response = await request(`https://api.github.com/repos/${repository}/pulls/${number}`, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      authorization: `Bearer ${env.GITHUB_TOKEN || ""}`,
      "user-agent": "speakout-staging-head-guard"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Error(`Could not verify current PR head (HTTP ${response.status}). Staging run blocked.`);
  const data = await response.json();
  const result = classifyHead({
    eventName: env.GITHUB_EVENT_NAME,
    eventHead,
    currentHead: String(data?.head?.sha || ""),
    state: data?.state
  });
  if (result.status !== "current") {
    throw Error(`Staging release stopped: PR ${number} is ${result.status}; only the current open PR head may run expensive acceptance.`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    const result = await verifyReleaseHead(process.env);
    console.log(result.status === "not_applicable"
      ? "Release head guard not applicable to this non-PR event."
      : "PASS: this run tests the current open PR head.");
  } catch (error) {
    console.error("::error::" + error.message);
    process.exitCode = 1;
  }
}
