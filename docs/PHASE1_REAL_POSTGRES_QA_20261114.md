# CHICO Phase 1 — real PostgreSQL acceptance report (2026-11-14)

Status: **PASS for isolated PostgreSQL import/commit/report calculations**. Pending final owner approval for production merge and, where available, a separate authenticated-browser/production-preview smoke test.

## Original source and fidelity

Original user-uploaded file: \`New Microsoft Excel Worksheet (2)(2).xlsx\`, Sheet1 A1:H31, inspected cell-by-cell.
- 30 personnel including General with no statistical values
- 29 rows containing Tickets, cumulative Flags, decimal TIME and Rating
- Covers 2026-11-09 through 2026-11-12, four days in one Monday–Sunday week
- Original SHA-256: \`2379dbb02fb70322e715f4a63d2726bd2da67e83cfd8139f6a0ebcca1b8e40ec\`
- A generated XLSX using **the exact same 30 original cell-value rows and original column headers** was used inside the isolated PostgreSQL sandbox; this was a semantic-equivalent workbook, **not byte-for-byte the uploaded XLSX**. Never assert the uploaded binary itself was committed.

## Isolation and database
- Disposable Vercel sandbox with fresh local PostgreSQL 18; no Supabase production URL, keys or data connection.
- Applied repository migrations \`db/001_chico_next.sql\` through \`db/004_report_entry_date.sql\`.
- Only local QA databases were mutated; Supabase production and chicoteam.vercel.app remained unchanged.
- Tested actual route functions and postgres.js transactions with real SQL, stage JSONB, backup JSONB, recomputation and state readback.
- Actual route authentication was substituted with a test owner approval in the function-level test. The running Next dev server was separately confirmed to return \`authenticated:false\` for anonymous access and \`LOGIN_REQUIRED\` for unauthenticated Excel uploads. A positive authenticated HTTP browser-to-database roundtrip was **not** completed.

## Verified source vs evaluated-team results

| Rank | People | Tickets | Flags gained | TIME |
|---|---:|---:|---:|---:|
| Helper | 12 | 804 | 18 | 98.00 |
| SN.Helper | 4 | 358 | 4 | 24.00 |
| Moderator | 10 | 2060 | 28 | 137.00 |
| Administrator (not evaluated) | 3 | 79 | 0 | 24.00 |
| Responsible / General (roster only) | 1 | — | — | — |
| Complete source | 30 | 3301 | 50 | 283.00 |
| Evaluated team | 26 | 3222 | 50 | 259.00 |

- Evaluated weekly Flags / Tickets: 50 / 3222 = **1.55%**.
- All 29 reading records persisted and read back; General excluded from readings and reports.
- \`state.summary.reported=26\`, \`missing=0\` for a populated same-week run.
- Top Helpers, by Tickets: Rare (201), Bieso (147), SN.Gaby (133).
- Top Moderators: M.Gambul (603), M.Bnammoo (355), M.Dark (225).

## Errors detected and fixed during real-db testing

1. **JSONB staging was being stored as a JSON string.** This caused \`PREVIEW_FORMAT_OUTDATED\` on commit. Replaced stringification + JSONB cast with postgres.js \`sql.json\` and retained legacy preview decoding.
2. **Backups were also stored as JSON strings.** Now stored as proper JSON objects with \`sql.json\`.
3. **Backup was created outside the transaction.** Rejected overlap/replay/closed period attempts could create orphan backup rows; backup now belongs to the transaction and rolls back automatically.
4. **Predictable error codes were reported as internal server failures.** Extended safe error handling and Arabic import messages.

## Passing real-database scenarios
- XLSX preview 30 names, 29 readings, 1 General exempt, no rank change requests.
- Commit 29 readings and read back exact 3301 source Tickets / 3222 evaluated Tickets / 50 Flags / 283.00h total / 259.00h evaluated.
- Duplicate preview ID rejected.
- Same XLSX hash imported twice rejected.
- Changed XLSX with overlapping reading period rejected.
- Stale Kararr senior rank shown as a discrepancy while the approved Helper rank stayed untouched.
- Database backup created exactly once on successful import, not on failed replays/overlaps.
- General manual reading rejected at the API/data layer.
- First counter of Monday is correct; Tuesday cumulative Tickets produces correct increment; Flags remain cumulative across weeks.
- First nonzero weekly Tickets reading starting midweek is rejected and rolled back.
- Closed-week entry rejected; no data mutation.

## Automated CI
- \`npm run typecheck\`
- \`npm run test:rules\`
- \`npm run test:excel\`
- \`npm run test:phase1\` (now asserts JSONB/backup invariants)
- \`npm run test:import-route\`
- \`npm run test:import-commit\`
- \`npm run test:report\`, roster/local-roster/preview DB policy tests
- \`npm run build\`

## Remaining release gate
- Owner visual review of the Excel preview and corrected summaries inside the **preview app**.
- Ideally a full authenticated HTTP upload on an isolated staging deployment with a dedicated staging DB before production, not the owner's production credentials.
- **Do not merge/activate this PR or load the original XLSX into production until owner approval.**
