// The API must authorize the signed-in holder and recheck validity at download.
// A verification success in the browser never grants onboarding clearance.
export function setupCertificateDownload(savedId = "", options = {}) {
  const root = options.root || document;
  const request = options.request || (async (path, payload) => {
    const { platformRequest } = await import("./platform-api.js");
    return platformRequest(path, payload);
  });
  const save = options.save || savePdf;
  const now = options.now || Date.now;
  const input = root.getElementById("downloadCertificateId");
  const form = root.getElementById("certificateDownloadForm");
  const verify = root.getElementById("verifyDownloadCertificate");
  const download = root.getElementById("downloadCertificatePdf");
  const status = root.getElementById("certificateDownloadStatus");
  if (!form || form.dataset.initialized) return;
  form.dataset.initialized = "true";
  input.value = savedId;
  let generation = 0;
  let verified = null;
  const id = () => input.value.trim().toUpperCase();
  function lock() {
    generation++;
    verified = null;
    download.hidden = true;
    download.disabled = false;
    verify.disabled = false;
  }
  input.addEventListener("input", () => { lock(); status.textContent = "Verify this certificate ID before downloading."; });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    lock();
    const certificateId = id();
    if (!/^[A-Z0-9-]{8,80}$/.test(certificateId)) {
      status.textContent = "Enter a valid certificate ID (8–80 letters, numbers or hyphens).";
      return;
    }
    const current = generation;
    verify.disabled = true;
    status.textContent = "Verifying your certificate…";
    try {
      const result = await request("/v1/volunteer-certificates/verify", { certificateId });
      if (current !== generation) return;
      if (result?.ok !== true || result.status !== "active" || result.certificateId !== certificateId || result.holderVerified !== true || result.pdfAvailable !== true || typeof result.downloadToken !== "string" || !result.downloadToken || !Number.isFinite(result.expiresAt) || result.expiresAt <= now()) {
        throw Error("unverified");
      }
      verified = { certificateId, token: result.downloadToken, expiresAt: Math.min(result.expiresAt, now() + 300000) };
      download.hidden = false;
      status.textContent = "Certificate verified. Your official PDF is ready to download.";
    } catch {
      if (current === generation) status.textContent = "We could not verify your certificate and prepare its PDF. Check the ID and try again, or contact your coordinator. You do not need to retake the assessment.";
    } finally {
      if (current === generation) verify.disabled = false;
    }
  });
  download.addEventListener("click", async () => {
    if (!verified || verified.certificateId !== id() || verified.expiresAt <= now()) {
      lock(); status.textContent = "Verify your certificate again before downloading."; return;
    }
    const current = generation;
    const record = verified;
    download.disabled = true;
    verify.disabled = true;
    status.textContent = "Downloading your official certificate PDF…";
    try {
      const result = await request("/v1/volunteer-certificates/download", { certificateId: record.certificateId, downloadToken: record.token });
      if (current !== generation) return;
      if (result?.ok !== true || result.certificateId !== record.certificateId) throw Error("mismatch");
      const bytes = decodeCertificatePdf(result.pdfBase64);
      save(bytes, `SpeakOut-Certificate-${record.certificateId}.pdf`);
      status.textContent = "PDF download started. On iPhone, use Share → Save to Files if a PDF preview opens.";
    } catch {
      if (current === generation) {
        lock();
        status.textContent = "The PDF could not be downloaded. Verify again to retry. Contact your coordinator if this continues.";
      }
    } finally {
      if (current === generation) { download.disabled = false; verify.disabled = false; }
    }
  });
}

export function decodeCertificatePdf(base64) {
  if (typeof base64 !== "string" || base64.length > 7000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw Error("Invalid PDF");
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw Error("Invalid PDF");
  return bytes;
}
function savePdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
