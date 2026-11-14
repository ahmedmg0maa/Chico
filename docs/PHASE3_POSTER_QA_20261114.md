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
## Update — real website export regression, 2026-11-14
- `DailyReportStudio` and `DiscordReportStudio` now mark completed Canvas renders against an exact signature of selected dates, rows, totals and mode (Discord). The export button is disabled for missing, pending or stale render states. It displays a rendering status while valid data is drawing.
- Both pages hide an incomplete preview whenever a selected date range intersects but does not fully contain saved readings. Users must explicitly expand to the full coverage period; the four-day cumulative reading is never attributed to 12 November alone.
- New `scripts/test-report-export-ui.cjs` runs in `prebuild` and checks that the safety guards remain in both report pages.
- Full Next production build and the entire existing data/rules/import/report suite passed on the latest branch.
- **Browser end-to-end:** isolated Next production server with network-stubbed authenticated state containing the 30 original people / 29 readings from the source fixture, 26 eligible. Both report tabs downloaded genuine PNG files, 1560 x 2144 pixels and about 2.7 MB each. Each PNG had correct signature and no JS errors. Both prevented partial-day exports, and expanding to the full 2026-11-09..12 coverage re-enabled downloads only after redraw.
- Same browser download/period workflow also passed at **390 px mobile width** with no document-level horizontal overflow.
- These tests used a local fixture and browser-route stubs to avoid production credentials and data mutation. They do NOT prove production authenticated import/update or externally accessible Vercel preview.
- **Visual review:** inspected the generated poster at a downscaled overview width. The 26-row poster is dense at small thumbnail sizes; full-resolution readability and subjective art direction still require owner acceptance.
- **Release blocker:** Vercel reported `Deployment rate limited — retry in 24 hours` for this preview branch, despite successful GitHub CI. The latest Phase 3 SHA is not available at a confirmed READY Vercel URL. Do not present an older preview URL as evidence of the latest changes.
- Production `chicoteam.vercel.app` continues to serve Phase 2 (`bbbb696`); Phase 3 PR #16 remains draft and not merged. No customer/owner database modifications.


## Full operator-style user acceptance review — 15 November 2026

### Real isolated PostgreSQL + user browser
- Used original workbook-equivalent data: 30 current names including General, plus 4 inactive historic names.
- Opened real Next production build in Chromium, went through normal login form with a disposable QA password and a test-only HTTP cookie adapter; **production secure cookies and credentials were not modified**.
- Selected Excel, previewed all **30** source rows, checked General is leader excluded, verified **29** saved readings and source totals for the 26 evaluated members (**3,222 Tickets / 50 new Flags / 259 decimal hours**).
- Confirmed saving, then fetched actual `/api/state` from the isolated PostgreSQL database; all readings and totals matched.
- Found user-facing native XLSX input was not cleared after save, preventing reselecting the exact same filename. Fixed using a React file-input ref and a native value reset.
- Used separate browser-intercepted APIs to test the six error/consent UI journeys without modifying production: saved Excel, reselecting identical Excel, duplicate rejection, overlapping dated reading, unnamed numeric row, and changed-year roster-sync consent reset. Arabic warnings include the affected row and person.
- Confirmed the Excel preview table scrolls **inside** its container at 390px without horizontal document overflow.

### All user pages, accessible visual layout
- Tested **55** page/viewport combinations: 11 tabs at desktop **1440**, laptop **1024**, tablet **768**, mobile **390** and narrow mobile **320**.
- Zero uncaught JavaScript errors, zero unintended document-level horizontal overflow across these checks.
- On Discord preview at 1440px the image displays at 1100 CSS pixels; at 390/320px its content displays at **880 CSS pixels inside an independently horizontally scrollable region**, with keyboard focus and a visible swipe hint.
- Real downloaded PNG files from desktop/mobile Chromium were validated (native **1560×2144** at approximately **2.7MB**); image generation waits until the exact current date range is drawn, prevents blank/stale exports, and refuses partial multi-day coverage.
- Automated axe/WCAG A/AA/2.1-AA checks on Discord at 1440 and 390 found zero violations in these cases; this does not replace all manual accessibility testing.

### Companion exports were audited independently
- Fixed `/api/export` team and reading report scopes so **Administrator, General and historical inactive members do not enter performance exports**. The internal roster and stored administrator readings remain untouched for management/audit use.
- Verified actual **ExcelJS .xlsx** output: 26 evaluated member rows plus header, and 26 evaluated reading rows plus header (of 29 source readings).
- Verified **CSV** UTF-8 BOM from actual downloaded bytes, names/row counts and excluded ranks.
- Verified printable HTML reports show the correct evaluated-team count, **26**, instead of all 34 stored names.
- A member's exported Tickets, Flags or hours are now blank/unknown if any contributing reading lacks that field; previously the export could misleadingly sum only the known values.
- `scripts/test-report-export-scope.cjs` now runs before every build and checks real ExcelJS exports, CSV bytes, print output and incomplete-field behavior.

### Delivery boundary
- The live 34-person roster and production database were **not modified** during these tests.
- Vercel preview remains intentionally anonymous/read-only; its blank report is not evidence that the production database lacks readings. Full real-data tests were done in isolated local infrastructure.
- Review of a static PNG thumbnail shows unavoidable density when 26 rows are viewed without enlargement; the website now provides a horizontally pannable mobile preview and full-resolution download, preserving the user's one-image requirement.
- Keep phase 3 off production until the reviewed head is CI-successful and a Vercel preview deployment is READY. If merged, explicitly verify production alias points to the reviewed merge SHA and inspect runtime error logs.

