# Google registration and login acceptance

Both `/auth.html` and `/auth/auth.html` offer **Continue with Google**. Firebase authenticates the Google identity; SpeakOut still requires its own profile and canonical approval. The default persistence remains session-only. The existing private-device checkbox allows browser persistence when explicitly selected.

New users confirm their Google email and names, select a public role, accept the terms and optionally complete school verification details. Password fields are disabled and hidden during Google profile setup. Individual profiles are created transactionally with `status: pending` and `approved: false`; an existing profile cannot be replaced. School-linked users use the existing authenticated onboarding API and require school approval. A school code and Google identity do not grant school membership or administrator rights.

Existing members keep their profile, roles and approval state. Pending, rejected and suspended members receive the same denial and sign-out behavior as email/password members. Account-provider conflicts receive instructions to use the existing sign-in method; no credentials are cached and no automatic client-side account merge is attempted. Google authentication failures do not delete an account. Incomplete Google setup can be resumed or cancelled without deleting the identity.

## Automated evidence

- `tests/google-auth-browser.mjs` exercises both routes with controlled Firebase mocks: new individual application, school-linked onboarding, approved routing, pending/rejected/suspended denial despite stale legacy approval flags, popup failure, provider conflict, cancellation and resumed incomplete setup.
- The Access Gateway Accessibility workflow runs these browser checks alongside the existing label, keyboard-tab and responsive checks.
- The combined staging release gate verifies that the existing live email/password journeys, approval checks, publishing rights and school boundaries continue to pass.
- An unauthenticated `accounts:createAuthUri` configuration probe generated Google OAuth URLs for production and staging on 9 October 2026. It does not prove completion of a real Google sign-in.

## Real Google acceptance still required

On the deployed site, use a dedicated, owned Google account and complete the following without sharing credentials or OAuth codes:

1. Open the root access page and select Continue with Google; choose the intended Google account.
2. For a new account, confirm the verified email, complete the profile and accept the terms. Confirm the application awaits approval and private learner resources remain inaccessible.
3. Approve only that test learner through the normal authorized admin process. Sign in with Google again; confirm the correct learner dashboard, learning access and logout.
4. Repeat at the nested access page and on a physical mobile browser. Check popup handling; if a browser blocks it, permit the site's popup and retry. This implementation uses popup authentication, without a redirect fallback that would require additional cross-domain storage configuration.
5. Verify an existing member retains their UID/profile, role, school scope and approval status when using Google. If Firebase reports a provider conflict, use the original method and resolve linking through a separately reviewed flow.
6. For a school-linked test user, verify registration details and school approval remain necessary. Confirm unrelated schools and children are inaccessible.

Firebase must have Google enabled and the actual site domain authorized. Google users manage their Google password through Google. SpeakOut password-reset tests remain separate for email/password users. Real inbox delivery, completed production password recovery and actual Google OAuth acceptance must be recorded separately; mocks do not close those gates.

References: https://firebase.google.com/docs/auth/web/google-signin and https://firebase.google.com/docs/auth/web/redirect-best-practices.

Google button mark: `images/google-g.png` is the unmodified gradient G asset downloaded from https://developers.google.com/static/identity/images/g-logo.png on 9 October 2026. It is decorative beside the accessible button text and preserves its aspect ratio. Source guidance: https://developers.google.com/identity/branding-guidelines.
