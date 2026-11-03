// Static fail-closed guard against publishing download controls before both API routes exist.
// A route's presence is necessary, NOT sufficient: issuer identity/revocation and live tests
// are separately required by #409 and MindCheck #81.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../volunteer-dashboard.html", import.meta.url), "utf8");
const api = readFileSync(new URL("../workers/platform-api/src/index.js", import.meta.url), "utf8");

function releaseGate(page, server) {
  const visible = /id=["'](?:certificateDownloadForm|downloadCertificatePdf|verifyDownloadCertificate)["']/.test(page);
  const verify = /["']\/v1\/volunteer-certificates\/verify["']/.test(server);
  const download = /["']\/v1\/volunteer-certificates\/download["']/.test(server);
  return {
    ok: !visible || (verify && download),
    visible,
    verify,
    download
  };
}

test("live volunteer dashboard must not expose download UI before both backend routes exist", () => {
  const state = releaseGate(html, api);
  assert.equal(state.ok, true,
    "Release blocked: volunteer certificate UI would be published before both authenticated API routes exist. Official issuer assurance is separately required.");
});

test("missing backend and partially implemented routes cannot unlock UI", () => {
  const page = '<form id="certificateDownloadForm"><button id="downloadCertificatePdf">Get PDF</button></form>';
  assert.equal(releaseGate(page, "").ok, false);
  assert.equal(releaseGate(page, 'path === "/v1/volunteer-certificates/verify"').ok, false);
  assert.equal(releaseGate(page, 'path === "/v1/volunteer-certificates/download"').ok, false);
});

test("two route declarations avoid the missing-route failure, but do not attest issuer trust", () => {
  const page = '<button id="verifyDownloadCertificate"></button>';
  const server = 'path === "/v1/volunteer-certificates/verify"; path === "/v1/volunteer-certificates/download"';
  assert.deepEqual(releaseGate(page, server), {ok:true,visible:true,verify:true,download:true});
});

test("absent UI stays safely gated without issuer connection", () => {
  assert.deepEqual(releaseGate("<main>My existing training certificate</main>", ""), {
    ok:true,visible:false,verify:false,download:false
  });
});
