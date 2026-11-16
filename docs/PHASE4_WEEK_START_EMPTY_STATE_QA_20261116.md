# CHICO — dashboard week-start empty-state QA

**Scope:** Approved issue 3 only. No production data writes, imports, schema migrations, or changes to the Discord poster.

## Correct live behavior
- The four existing dashboard KPIs always represent **the current Cairo week only**.
- When no **eligible** weekly readings are registered, a dedicated, separate banner says the current week has no readings. Leadership-only / archived-only readings do not make the performance week appear reported.
- An independent last-recorded-week panel shows the most recent **prior** week containing eligible readings. It lists the real min `from_date`, max `to_date`, distinct evaluated administrators, stored reading count, Tickets, and Flags. Date bounds are not described as daily readings. Unknown totals display `—`, never incomplete partial sums.
- If no earlier eligible readings exist, no fabricated prior-period totals are displayed.
- The historical action opens the **complete reported coverage range**, rather than selecting only the newest individual reading; recording opens the normal reading entry.
- After the first eligible current-week reading is stored and refreshed, the empty-state banner disappears automatically. The source of truth remains the existing state API.

## Verified automated checks
- Full `npm run build` with all prebuild suites, TypeScript, unit and regression tests: passed.
- New `test:week-empty`: 30-row CHICO source fixture (26 evaluated), historical 2026-11-09 — 2026-11-12, 3,222 Tickets / 50 Flags / 259 decimal hours. Proves that current-week KPIs are not replaced, unique admins are counted, archived/future weeks excluded, missing metrics remain unknown and valid zeros stay zero.
- Isolated Chromium against Next production build with intercepted fixture API: history card, historical report CTA, entry CTA, nonuniform latest individual reading vs complete coverage, first-ever week, automatic hide after eligible new-week reading, leadership-only reading exclusion.
- Responsive widths: 1440, 1024, 768, 390 and 320 px: no document-wide horizontal overflow; no uncaught JavaScript exceptions.
- `/week-demo` is a **preview-only**, explicitly labeled read-only design fixture. It returns HTTP 404 when `VERCEL_ENV=production` and HTTP 200 for preview. The preview toggles both no-current-reading scenarios and does not connect to production data.

**Release:** This branch is for review. Do not merge or publish to `main` before explicit owner approval.
