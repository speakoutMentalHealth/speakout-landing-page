# Volunteer certificate verification and PDF download

Status: dashboard implementation prepared; NOT release-ready. The authenticated API routes below are not implemented yet. Keep the PR in draft until official issuer integration and end-to-end tests pass. Do not claim that this change fixes production printing.

The dashboard has a separate certificate verification form, available even after assessment clearance. It pre-fills an existing submitted certificate reference. Download stays hidden until the authenticated service verifies the exact ID, binds the holder, checks active status and confirms the official PDF exists. Editing the ID invalidates pending verification/download responses. No browser verification changes onboarding review or safeguarding decisions.

## Required issuer integration

The Google Apps Script source is outside this repository. Obtain its editor project and preserve the current deployment for rollback. Fix the assessment result link to use the explicit deployed `/exec` URL rather than `location.href` inside the Google sandbox iframe. Expose official PDF generation from the trusted passing record, preserving approved logos, signature and verification code. Never generate certificates from names/scores supplied by the browser.

Implement these authenticated platform API routes using the existing Firebase authentication and approved-volunteer authorization:

- `POST /v1/volunteer-certificates/verify`, body `{certificateId}`. Check the issuer's authoritative record, active/revoked status, and holder association with the signed-in UID. An admin-approved credential claim can support the holder binding; matching names alone is insufficient. Return `{ok:true, certificateId, status:"active", holderVerified:true, pdfAvailable:true, downloadToken, expiresAt}` only after the official PDF is available. `expiresAt` is epoch milliseconds; tokens expire within five minutes, are opaque or signed, and bind UID, ID and issuer record version. Return a generic failure for unknown or other-holder records.
- `POST /v1/volunteer-certificates/download`, body `{certificateId, downloadToken}`. Recheck authentication, holder, current issuer status, record version and token expiry. Return `{ok:true, certificateId, pdfBase64}` for the official PDF only. Do not redirect to arbitrary user-controlled URLs. Enforce PDF type/signature and a 5 MB binary limit, private/no-store response caching, request limits, and safe errors. Do not log tokens, personal records or certificate payloads.

Existing `verify_cert` returning a matching ID/name/score/date is insufficient to implement holder authorization or revocation checks. Do not map it directly to the new success contract without these additional guarantees. The client fails closed on missing routes, unavailable PDFs, mismatched IDs, non-active records and outages. It downloads actual PDF bytes, not HTML or a browser print dialog.

## Validation

Run `node --test tests/volunteer-certificate-download.test.mjs`. Uses synthetic records only. Covers initial lock, valid verification/PDF download, mismatch/revocation/holder/PDF failures, changed IDs during async requests, offline failure and malformed PDFs.

Before release, test the deployed API and dashboard with an authorized synthetic passing assessment: official record → owner-bound verification → PDF download, plus other-holder rejection, revoked/expired certificate, token tampering/replay policy, outage and retry. Confirm PDF recipient, ID, issuer, logo, signature and QR verification; visually inspect the PDF and test on physical iPhone Safari and Android. Unit tests are not evidence of issuer integration, actual PDF appearance, browser behavior or deployment.

Client-side PDF acceptance now also caps **decoded** files at 5,000,000 bytes and rejects missing PDF header or terminal `%%EOF` marker. This is only a defensive sanity check; a malicious or corrupted PDF can still carry those markers. The authenticated backend must validate MIME, byte size, issuer record and holder status and must not trust browser checks.
