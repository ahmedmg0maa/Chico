# CHICO Phase 3 — premium, data-bound report image

Status: **First implementation on preview branch; not approved or released.**

## Execution
- Rebuild the image from the actual website, not a separate static mockup.
- Daily and Discord Report Studio invoke the same `renderLuxuryPoster` from `PremiumPosterRenderer.ts`; the real downloadable PNG and on-site preview come from one Canvas.
- One image, 1560px wide, with two divisions: HELPERS (Helper+SN.Helper, roster order) and MODERATORS; Top 1/2/3 by recorded Tickets in each division.
- Kararr ordinary Helper, Senior Helpers in BLUE with simple SN badge and NO white stars, ordinary Helpers green, Moderators purple.
- Only Tickets and Flags KPIs: no Total Staff, Average Rating, Call, Hail or unnecessary legend.
- Real names/rank/numbers; genuine zero and unknown are distinct; Flags 0 green, >5 amber, >7 red, Rating >=4.80 green.
- Authenticated CHICO/OneState and wolf assets already in repository, restrained gold accents, charcoal surfaces; no invented team icon.
- Balances actual 16 Helpers and 10 Moderators by dynamically distributing row height instead of showing giant unused blank spaces.
- Missing group ranking shows an honest no-results message; never invent winner names or Tickets.
- No touching Phase 1 ledger, Excel, monthly resets, week boundaries or production records.

## QA verification
- `scripts/test-report.cjs` enforces group order, titles, no banned KPI and dynamic row distribution.
- `scripts/test-poster.cjs` instruments the real Canvas drawing code, checks dimension, zero/null accuracy, text and source fixture rank colors.
- Existing import/roles/rules/TypeScript and production build must continue to pass.
- Real Chromium browser rendered the approved Excel fixture: 26 evaluated rows out of the 30-person source, 16 Helpers/SN, 10 Moderators, 3222 Tickets and 50 Flags.
- Rendered 1560 x 2144 PNG-compatible Canvas; both original brand assets loaded; no JavaScript errors.
- Date coverage 2026-11-09 through 2026-11-12, with no invented daily allocation.
- PNG preview evaluated through the actual browser Canvas renderer, not a detached generated picture.

## Still required before publishing Phase 3
- Latest head CI pass and manual responsive preview inspection.
- Verify a real PNG download from the site after authenticated test readings, or isolated fixture test in browser if real records unavailable.
- Owner acceptance of image appearance and website behavior.
- No automatic merge or production deploy of Phase 3 until explicit approval.

Technical results do not replace subjective assessment of design quality.