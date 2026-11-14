# CHICO – Excel upload and reporting audit (14 Nov 2026)

## Production facts verified with read-only SQL
- 34 stored names, of which 30 active: 26 evaluated (12 Helpers, four SN.Helpers, ten Moderators), three Administrators, one General (Responsible).
- Four old inactive Helpers: Alajmi, Alkhaldy, Rey and Yoyo. Their presence must not inflate the active count, evaluation or top rankings. No deletion was authorized.
- One successfully committed Excel upload, 29 saved reading rows and one pending/uncommitted preview at audit time.
- All 29 saved readings cover 2026-11-09 through 2026-11-12. Source total 3301 Tickets and 50 new Flags.
- Evaluated current performance: 26 members, 3222 Tickets, 50 gained Flags, 259 decimal hours, flag rate = 50/3222*100 = 1.55%. Three Administrator reading rows are intentionally excluded from evaluation; General has no reading.

## Actual user workbook inspection
- The original source `New Microsoft Excel Worksheet (2)(2).xlsx` has legacy headers without a year. Upload requires explicitly selecting **2026**; do not infer the current year.
- Valid structured alternative: `CHICO_VERIFIED_FULL_WEEK_09-12_NOV_2026.xlsx`, 30 names including General, Kararr as ordinary Helper, with From Date 2026-11-09 and To Date 2026-11-12.
- Previously produced `CHICO_Clean_Import_Ready_2026-11-13.xlsx` only contains a single Date of 2026-11-12 for the whole four-day cumulative counters. It lacks the correct coverage start and should **not** be used as a fresh weekly import.
- Production already contains this week's readings: do not reimport any of these files onto the existing dates; inspect existing reports instead.

## Confirmed UX constraints, not evidence that stored data is missing
- `?review=1` is a deliberately read-only design preview: file input disabled; no live readings and no PNG download. Browser audit on 1440px and 390px confirmed this and found no page JS errors.
- The official authenticated website is the only site used for actual Excel upload and live stored reports.
- The currently released Phase 2 still uses its previous poster; the redesigned Phase 3 Canvas is preview-only pending acceptance.

## Fix implemented in this review branch
- Detect an identical already-committed file during the preview request, not after pressing Confirm. Return FILE_ALREADY_IMPORTED (409) without staging duplicate values.
- Query saved date spans during the preview and generate blocking warnings for overlapping rows before user accepts. The transactional commit also rechecks overlap against concurrent writes.
- Detect a row with missing Name but filled Tickets, Flags, baseline, TIME or rating instead of silently omitting it.
- Extend the upload route test with all three regression cases, preserve all original import and report checks.

## Reporting integrity already covered by Phase 3 checks
- The combined 2026-11-09..12 reading is not a one-day 2026-11-12 report. If a selected day intersects it, the report disables export and offers a button to include its complete coverage.
- General and Administrators excluded, and inactive past roster never enters ranking; senior Helpers join Helpers for Top3; Moderator Top3 separate.
- No partial sums of unknown Tickets/Flags, and zero remains distinct from missing data.
- Verified from current data: Top Helpers Rare (201), Bieso (147), SN.Gaby (133). Top Moderators M.Gambul (603), M.Bnammoo (355), M.Dark (225).

## Tests and release boundary
- Production database used **read-only** for the above audit. No member, rank, imported reading or historical data was altered.
- `npm run test:import-route` and `npm run typecheck` passed with the fixes; initial complete Next build passed; broader Phase 3 build will be rerun on merge to its draft PR.
- No claim of having exercised a new positive authenticated upload into production: doing so would duplicate current records or mutate real data.
- Fix stays on a review branch or is merged only into the Phase 3 development branch, never directly into production without explicit approval.