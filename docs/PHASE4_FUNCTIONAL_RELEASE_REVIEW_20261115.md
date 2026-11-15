# CHICO Phase 4 — Functional integrity and release review (2026-11-15)

## Scope and production boundary
- Based on the exact production source commit `1f098736c9156525ccbff8cb441c69ab438680b4`.
- Executed checks in a disposable, isolated Vercel Sandbox without production credentials or a production database connection.
- No production roster, Excel upload, report, login/session, team ranking or Supabase record was changed.

## Defect identified and fixed
`GET /api/export?scope=readings&format=print` includes all eligible historical readings, but the summary at the top incorrectly displayed the current week's Tickets, Flags and flag rate. Operators could read those figures as the totals of the full historical ledger.

The printed historical summary now shows:
1. Number of eligible exported reading records.
2. Number of evaluated administrators represented by those records.
3. Actual earliest `from_date` to latest `to_date` across exported records.

Weekly team print continues showing the weekly statistics and eligible roster count. Administrators, General and inactive users stay excluded from evaluation reports.

## Verification
- `npm ci --no-audit --no-fund`: pass.
- Baseline `npm run build` with all existing prebuild regression suites: pass.
- Updated `npm run test:export-scope`: pass; added multi-week reading to an isolated 30-person source fixture and checked historical period 2026-11-02 through 2026-11-12, 27 eligible rows, 26 represented admins and absence of misleading current-week statistics.
- Updated `npm run typecheck`: pass.
- Full post-fix `npm run build` and every prebuild suite: pass (rules, Excel, import/commit, report, roster, preview DB safeguards, accessibility/UX contracts, poster, date period and exports).
- Local production server with no secrets: `/` and `/v2` 200; `/api/auth` says unauthenticated; `/api/state` rejects anonymous access with 401; `/api/health` correctly reports 503 when a database is not configured.

## Still not verified in this phase
- No positive authenticated login, new Excel import or production database write was attempted. Do not mistake passing fixture tests for a production user journey.
- No new visual review on physical phones and no fresh full browser viewport matrix in this change; earlier Phase 2/3 test records cover browser layouts.
- The preview deployment and manual operator acceptance are separate release requirements. Keep this PR off production until those checks are complete.
