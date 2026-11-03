# Volunteer certificate API release tripwire

This automated Node test protects the volunteer dashboard from accidentally publishing a **Verify / Download PDF** control while the platform API has no corresponding routes.

A passing test is **not** evidence of certificate validity, issuer authorization or readiness to launch. On today's `main`, both authenticated `/v1/volunteer-certificates/verify` and `/download` are missing; the existing volunteer dashboard correctly has no download controls.

The test runs in normal `npm test`, using only source files, never private records or credentials. If a future PR adds the certificate controls before both API route names exist, CI fails. A backend route can exist and still be unsafe: this test checks **only routing presence**, not whether its implementation is correct.

**Mandatory additional release evidence:** authoritative MindCheck Apps Script project/source and deployment access; issued eligible passing assessment; named recipient bound to signed-in Firebase UID; explicit active/revoked status; short-lived owner-bound download token; official PDF; minimum response fields; generic unknown/other-holder errors and rate limiting; synthetic negative tests; physical iPhone/Android PDF downloads; admin signoff. See [SpeakOut #409](https://github.com/speakoutMentalHealth/speakout-landing-page/issues/409) and [MindCheck #81](https://github.com/speakoutMentalHealth/MindCheck/issues/81).

Do **not** remove this guard merely to make a draft PR green.
