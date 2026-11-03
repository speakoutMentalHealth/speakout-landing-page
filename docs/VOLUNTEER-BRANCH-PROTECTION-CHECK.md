# Volunteer pilot: GitHub branch protection verification

Status: **NOT a production launch authorization.** Reviewed 3 November 2026.

The repository's `main` branch currently reports `protected: false`; configured rulesets are empty. A normal green CI run does **not** prove merges are protected. The GitHub connector has no repository administration-write permission, so this must be configured by an authorized repository administrator.

## Administrator setup

1. Open [SpeakOut landing page repository settings](https://github.com/speakoutMentalHealth/speakout-landing-page/settings/rules) while signed into an administrator account.
2. Create an **active branch ruleset** targeting `main`. Prevent force pushes/deletion and require pull requests before merging. Require an independent review when available. Do not grant broad bypass rights.
3. Require check names that actually run on every pull request, beginning with `Node tests` and `Firestore security rules` from **SpeakOut CI**. Do **not** require the manual-only safeguard job or path-specific/dispatch-only workflows; GitHub would wait indefinitely on unavailable checks.
4. Verify merge is blocked on a deliberately failing **test PR** without bypass. Record the settings (including bypass list) for the release file.
5. Open **Actions → Volunteer Pilot Branch Protection Check → Run workflow** after configuring the rules. The workflow makes one read-only request to GitHub's branch metadata. It intentionally **fails when `main` is not protected**, and passes only if GitHub reports `protected: true`.

**Limits:** A passing signal checks only the branch's protected flag, **not** the exact required checks, settings, protected ruleset enforcement, live volunteer permission tests, certificate validity, moderation or release readiness. Admin must inspect those separately. No account, beneficiary, staging service, credential or deployment is changed by this workflow.

## Other release gates

Keep [volunteer production hardening #409](https://github.com/speakoutMentalHealth/speakout-landing-page/issues/409) **NO-GO** until official MindCheck issuer/revocation checks (#81), synthetic authorized volunteer account lifecycle (including pause and suspension), trained safeguarding rota, human supervision, and 5–10 opted-in adult pilot acceptance are documented. Never substitute a synthetic Firestore emulator success for live production identity assurance.
