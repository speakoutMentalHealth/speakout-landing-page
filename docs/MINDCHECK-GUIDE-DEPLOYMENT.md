# MindCheck guide deployment

This repository holds the existing Cloudflare production deployment credentials. The isolated `.github/workflows/deploy-mindcheck-guide.yml` reuses them inside GitHub Actions without copying or displaying their values. It deploys the separate `mindcheck-guide` Worker from a pinned, reviewed commit of `speakoutMentalHealth/MindCheck`; it does not deploy or change `speakout-platform-api`.

The validate job installs pinned dependencies, runs the guide server's five privacy/provider tests and checks a Wrangler production bundle. Pull requests never deploy. A main-branch workflow change or manual run deploys after validation through the existing production environment. Missing deployment access fails explicitly rather than reporting a skipped deployment as successful.

The pinned source defaults to `GUIDE_ENABLED=false`. The public browser configuration also remains off. No Gemini key is included in this repository or supplied by this workflow. Deployment is not AI activation and must not be described as a live Gemini test.

After a successful deployment, the owner should use Cloudflare Workers & Pages → mindcheck-guide → Settings → Variables and Secrets → Add → Secret, with name `GEMINI_API_KEY`. Enter the key directly in that authenticated console, never in chat or Git. Use a Gemini project without billing for the free pilot.

Read MindCheck's `docs/ADULT-GUIDE.md` before enabling. Confirm model availability, adult audience, Nigeria-only pilot, limiter and fixed-question behaviour. Keep the prepared answers available. Live acceptance needs a permitted Nigeria-origin session; never spoof country metadata or bypass a firewall. The browser endpoint and explicit enable flag are updated only after controlled acceptance.

A later workflow rerun redeploys the pinned source and restores its disabled setting. This is intentional until an independently reviewed activation change updates the source pin. Do not use this deployment workflow as an implicit activation switch.
