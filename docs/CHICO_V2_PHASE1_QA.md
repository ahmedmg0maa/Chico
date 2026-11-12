# CHICO V2 · Phase-one verification ledger

## Scope and safety

- Work remains on the `feature/executive-v2-preview` branch. No change to `main`, production variables or existing Supabase data.
- Vercel previews are visual-only by default, using clearly labeled demo data. Use `?review=live` only **after** an isolated test database and independent preview credentials have been configured. The query flag `?review=1` must never bypass the production login.
- The supported production application is still on the existing homepage; V2 is **not** a complete replacement.

## First repair pass

1. Top 3 eligibility is **Helper and SN.Helper only**, both in shared server rule and the V2 interface. Moderator and leadership ranks are excluded.
2. Removed the unconditional `LIMIT 2000` on reading history, which could silently corrupt historical totals once a team accumulated enough readings. Future pagination is needed for scale; do not reintroduce silent truncation.
3. V2 treats cumulative Flags with no known baseline as **unrecorded/incomplete**, not a partial weekly total, and surfaces it in the attention queue.
4. The *live* V2 overview now lists each recorded time window and its known delta. A reading for several days is never plotted as a fabricated one-day jump. Demo mode retains its illustrative graph, with a prominent demo-data banner.
5. Package prebuild runs `test:rules` and TypeScript checks before Vercel building.

## Required next acceptance checks (not yet certified)

- Configure an **isolated** Preview database and password/session secrets; never copy the production database connection/password into public preview.
- Verify login, session, lockout, role/data permissions, create/edit/delete, reading recompute, multi-day gaps, Monday counter reset, week close/reopen, and Excel preview/import in a safe test environment.
- V2 now contains real UI wiring for team CRUD, readings, XLSX review/commit, weekly operations, report export, alerts and settings. **Do not mark these flows accepted until end-to-end tests run against an isolated database.** V1 remains the verified fallback until acceptance.
- Confirm how weekly TIME and Rating should be aggregated from the game's snapshots before claiming a verified weekly calculation.
- Reassess defense-in-depth RLS on the private `chico_next` schema. At inspection, anonymous/authenticated roles lacked schema/table access, so **absence of RLS is not evidence of public exposure**. Do not apply RLS or grants to production before a migration-and-rollback test.
- Complete real-browser desktop/mobile/light/dark/accessibility checks. HTTP 200 or a READY deployment are not full QA.

Do not merge the V2 preview into `main` or promote it to production without owner review and explicit sign-off.

## Import correctness follow-up

- Excel now recognizes the common bare `TIME` column, while preserving the rule that spreadsheet date-coercion warnings block confirmation in V2 until the source is corrected and re-previewed.
- Excel staging commit locks its preview row and recomputes all deltas **inside the same SQL transaction** as writing readings, marking the preview used, and audit. A recomputation error rolls back the import instead of leaving a committed staging row with stale statistics.
- Files larger than the inspected row limit now surface a blocking warning rather than silently importing a truncated dataset.
- V2 validates Monday for a manual weekly close/reopen action before calling the server.

## Data integrity follow-up

- Restored `flags_baseline` through the public `Reading` type and state mapper. Editing a previously baselined reading on either the original or V2 interface preserves that baseline instead of silently nulling it.
- Excel previews containing date-coerced TIME values now persist a per-row `time_was_date` marker. The import-commit API refuses these staged rows until the original file is fixed and reviewed again; this protection is enforced by the server, not only by V2 UI.
- XLSX files over the inspected-row limit are rejected by the preview endpoint instead of silently truncating the import to 501 rows.

## Approved roster, administrative levels and fixed shifts
- Official roster now has exactly 31 approved names and explicit levels 1–3 from Excel. No metrics are synthesized.
- Schema migration `db/002_admin_directory_enrichment.sql` adds structured administrative level, optional fixed shift, and shift-change history, without daily duplication.
- **Apply on isolated Preview database before connecting an authenticated V2 Preview**. This migration has not been applied to Production as part of UI work.
- The V2 review page supports local add/edit/delete. Local data is not Supabase data and may be reset from the roster form.

- Build gate now checks the 31-name approved roster (13 Helper, 4 SN.Helper, 10 Moderator, 3 Administrator, 1 Responsible), name uniqueness, explicit level assignments and absence of fake performance fields.
- Until any readings actually exist for a reporting week, absence of readings no longer triggers blanket performance warnings for all administrators.
- Shift edit events are exposed in the member's shift history. No daily shift rows are created.

## Isolated preview connection safety

- Removed the production Supabase tenant ID from pooler username normalization. If `DATABASE_URL` uses the generic `postgres` pooler user, set `CHICO_DB_POOLER_TENANT` for the appropriate environment; otherwise use a fully qualified branch-specific username.
- **A Preview deployment rejects** database URLs whose hostname or user includes the production project ref. Preview must never use production credentials.
- On production, `CHICO_DB_POOLER_TENANT` must be configured (or a fully-qualified username used in `DATABASE_URL`) **before** any merge into main; current production is unchanged.
- Backup snapshots now include fixed-shift history. Insertion of an admin and their initial rank record is atomic.
- Supabase branch creation is cost-gated; no new branch was created without explicit hourly-charge approval.

### Automated preview-database regression test

- `npm run test:preview-db` runs against a simulated Postgres adapter and fake database URLs. It asserts preview refuses production tenant and missing pooler tenancy and that a branch-specific URL is accepted. No real network, credentials or database is contacted.
