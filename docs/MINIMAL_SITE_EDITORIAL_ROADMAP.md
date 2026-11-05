# SpeakOut — Minimal Public Website & Newsroom

## Editorial direction
Be a mission-led organisation first, not a text-heavy advertising catalogue. Every public page should have one main user task, a concise explanation, proof of work, and one primary call to action. Avoid repeating the full story of SpeakOut on every page.

## Suggested public navigation (not changing existing routes yet)
Home · About · Our Work · News & Events · Resources · Get Involved.
School partnerships, MindCheck, SpeakHub Academy and SpeakOut TV remain directly accessible from short grouped menus or relevant cards. Keep account and administration pages separate from marketing navigation.

## Content ownership

| Page | One primary purpose | Keep | Remove / move |
|---|---|---|---|
| Home | What SpeakOut does and where to begin | Strong introduction, three mission pathways, latest work, get involved | Duplicate programme detail, repeated partner claims |
| About | Credibility and organisational identity | Mission, registered status where verified, leadership, safeguarding | Repeating every service description |
| Our Work / Programs | Choose a programme | Clear school/community programmes with actions | Long generic promotional explanations |
| Schools | Partner with SpeakOut | School offer, implementation, contact/form | Duplicated About/Academy copy |
| News & Events | See current, verifiable activity | Latest published news, long-form articles, Instagram spotlight, archive links | Repeated stats, generic filler events, repeated category grids |
| Resources / MindCheck | Access appropriate help | Direct tools and scope limits | Unnecessary marketing before support |
| Get Involved | Volunteer, partner, donate | Role-specific pathways and short forms | Repeated CTAs within one page |

## This design branch
- News & Events replaces its long brochure with four editorial sections: short hero; dynamic published feed; prominent Instagram profile spotlight; three archive links.
- The Instagram area opens the verified public handle `@speaaakout`. The existing local website images are *illustrations*, not live Instagram posts; no Meta embed JavaScript is loaded and no fake social content is generated.
- The existing News publisher in stacked PR #451 is extended with an optional long article body (12,000 characters) and shareable article detail pages.
- Article text is rendered through `textContent`; unpublished/hidden items are blocked by Firestore's rules. Links and images must be HTTPS.
- Short event announcements can still be published using the summary field alone.
- Publishing requires verified school/student media permission and source accuracy. Avoid public beneficiary identities, sensitive health cases, unverified impact claims, or made-up event dates.

## Dependencies and release gates
1. Resolve already-merged public Metricool tracking PR #452 against the *explicit opt-in* tracking implementation still in PR #451. Do not deploy duplicate trackers or silently remove consent.
2. Verify the worker CMS field whitelist update, admin roles, draft-first publishing, Firestore draft access denial, content safety, and link validation on staging before public launch.
3. Test newsroom with zero, one, and multiple posts; a 12,000-character story; a draft; a hidden item; image failures; keyboard navigation; 320/360/390px devices; and low-bandwidth conditions.
4. Approve sample editorial content and review Instagram permissions before using an API feed or embedded posts. Individual public Instagram embeds may load Meta scripts and require separate privacy controls.
5. After tests pass, merge backend and design branches in the correct order. Deploy Cloudflare worker, restrictive Firestore rules, and public site as controlled steps. Confirm no source-only merge is mistaken for a live feature.

## Next content-reduction phase
Audit Home, About, Programmes, Schools, Resources and Get Involved for duplicated headings/paragraphs and broken navigation. Make reversible route-preserving edits, one page at a time, and verify accessibility and conversions before release.
