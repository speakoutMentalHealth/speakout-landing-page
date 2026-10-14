# SpeakHub advertising activation gate

Status: **OFF**. This branch adds only a dormant placement to the public-facing SpeakHub page. The module will not request ads in its current configuration.

## Before activation

1. Google AdSense must show speakoutmentalhealth.org as **Ready**, and issue a valid display-ad unit ID.
2. Complete and verify consent/CMP and applicable privacy messaging for regions served. Non-personalized ads alone do not replace consent obligations.
3. Determine audience and child/teen treatment. Do not enable where user age or intended audience makes placement unsuitable.
4. Confirm the public page has substantial independent content; avoid an ad-only login gate, forced ad view, or timed redirect.
5. Verify site-wide Auto ads do not unexpectedly insert ads on authentication, assessments, private support, school dashboards or minor-oriented pages.
6. Confirm the required AdSense publisher script is loaded in a consent-compliant way before enabling this placement.
7. Test mobile layout, ad labeling, keyboard/navigation, account access, external course links and no ad-related layout shifts.
8. Only after all checks: set ADS_ENABLED and the actual Google-issued AD_SLOT_ID in js/speakhub-ad-placement.js. Review as a separate pull request.

Never add ads to login.html, register.html, auth.html, protected course-details.html, MindCheck assessment pages, private support or student dashboards. Do not delay course navigation or require interactions with advertisements.

## Verification for this branch

- The slot is hidden by default.
- No Google ad request is initiated by this module while disabled.
- Existing account, catalogue and external course flow remain unchanged.
