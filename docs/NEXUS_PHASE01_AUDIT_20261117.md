# CHICO NEXUS — Phase 01 | baseline audit and transformation contract

**Date:** 2026-11-17 (Africa/Cairo)  
**Official product:** CHICO TEAM 1.0. **Design system:** CHICO NEXUS.  
**Execution scope:** development branch only; no production release or data mutation.

## 1. Recovery and isolation
- Verified production deployment: `dpl_EKLybdSSrwPT5bXnzdE6mrXSrPAD`, commit `246536c87b3d99525805bc233d258504dcd0f1dd`, state READY; public health HTTP 200, database connected and authentication ready.
- Created code recovery branch `backup/chico-pre-nexus-20261117` at that exact production commit. Keep it immutable.
- Created `chico-nexus-transformation-20261117` from `ab2d9641f147f8a90890f8e199bdfc36d5fa6d7a`, the latest tested but unpublished compact new-week dashboard (draft PR 22), to retain that work. PR 22 and main untouched. No deploy promotion.
- Built in disposable Vercel sandbox. PostgreSQL 18 initialized with repository migrations 001–005, not production credentials or a copy of production data. Verified backup create/download in that test database. Existing backup JSON contains admins, rank_history, readings, shift_history, weekly_status. No application restore endpoint in inventory, and a production database backup/restore were NOT performed. Before final release, validate a real backup with the owner if needed; never reset or migrate production merely to restyle.
- The reference mockups are visual references, not source statistics. No mockup names, chart points, percentages, trends or avatars may become live data.

## 2. Architecture / actual inventory
Next.js, React, TypeScript, CSS, SVG and Canvas; existing PostgreSQL-compatible backend, ExcelJS and server-side auth. Keep stack and shared API contracts; no new accounts, framework rewrite, 3D library, or schema changes as a side effect of the redesign.
Both / and /v2 share ExecutiveCommand and a generated executive-unified.css. The latter combines seven legacy source style modules; do not hand edit it. There are 11 authenticated functional tabs plus two preview-only demo pages. The 18 API handlers are: activity, admin-profile/[id], auth, backup, backup/[id], export, health, import, import/commit, preview-roster, readings, readings/[id], reset, roster, roster/[id], seed, state, week. Preserve direct URLs, owner checks, mutation confirmations and preview isolation.

| Existing functionality | Current implementation | NEXUS acceptance |
|---|---|---|
| Login / shared app shell | ExecutiveCommand | One-password access, same API; refined cinematic brand, status and accessible controls; no production bypass. |
| dashboard | ExecutiveCommand, DashboardWeekNotice, ExecutiveWeeklyChart | Four actual Tickets/Flags/Rating/TIME metrics; separate Flag % ring, coverage, role overview, trend, distinct Top 3 panels, alerts, period selector and prior-period empty state. Central original wolf artwork; live DOM controls above decorative art. |
| team | ExecutiveTeamStudio | Search, rank/status filters, add/edit, archive visibility, current shift, metrics, original order, working export. |
| Individual performance | ExecutiveProfile (opened from team) | Preserve profile dialog/actions, edit and log-reading navigation, real metrics/history, trend only where data supports it. |
| operations | ExecutiveOperationsWorkspace | Retain every management shortcut and embedded tool; do not make duplicate routes or fake functions. |
| updates | ReadingEntryStudio | Manual entry, previous reading, explicit coverage and week, validated save/edit and history. |
| excel | ExecutiveOperations, import preview/commit | Preserve Excel-only flow, file validation, mapping, data transformations (decimal TIME/date review), duplicate/overlap/closed-week rejection, confirmation before saving. |
| daily | DailyReportStudio | Actual range/report generation, prevent single-day export of multi-day record, exact full coverage action, no fabricated daily allocation. |
| reports | DiscordReportStudio, PremiumPosterRenderer | Keep approved live image export; new studio controls and preview. Data-backed two group Top 3, dynamic names/count and original roster order; no redesign of approved exported poster without separate visual review. |
| weeks | ExecutiveOperations | Week begins Monday, manual close/reopen safeguards and correctly scoped historic performance. |
| server | ExecutiveOperations | Existing true totals/Flag percentage and relevant historical comparisons. |
| alerts | ExecutiveOperations | Real, eligible data warnings. No invented objectives or evaluation rules. |
| settings | ExecutiveOperations | Preserve backup/download, explicit destructive confirmations and access controls. |
| shift management | existing roster shift_label and shift history | Dedicated workspace can expose existing assignment/change behavior; keep persistent shift until explicit edit. Do not revive removed permanent-shifts system or invent per-day assignments. |

## 3. Reference gap — observed from actual browser
Prior baseline: conventional dark management interface, left menu plus small mobile dock, horizontal illustrated hero banner, familiar rectangular panels, repeated headings/copy, conventional tables and small generic icons. The dashboard uses Tickets, Flags, rate and coverage KPIs rather than the new four requested measures. Team distribution is active/inactive; dashboard Top only includes Helper/SN.Helper. Rating/TIME are already represented in the state summary. Discord output already has a separate approved dark/red/gold poster; do not treat the mockup's sample image as a replacement for that approved renderer.
New visual direction: primary reference is the central sculptural metallic wolf, layered floating glass, thin titanium/gold rims, restrained warm light plus role-colored accents, a low floating navigation dock, genuine data in real text and controls. Secondary reference governs the compact functional screens and polished tables. Introduce a single token system (surface/elevation/material/motion/semantic color/typography), one icon vocabulary and shared components. Prefer responsive 2D CSS/SVG optical depth; no distorted text, heavy 3D runtime, pasted reference dashboard, random character photos, neon clutter or decorative duplicate headings. 
Implementation choices for review: compact dock of high-frequency destinations (dashboard, team, reports, shifts, Excel, Discord) plus accessible expandable more-menu for all existing routes; desktop and mobile share logical navigation, hide/reopen and keyboard support. Use existing local operational language/RTL; preserve CHICO TEAM 1.0 as official name. Decorative art may be new, but it must be independent of data. Establish legible mobile layout before visual scoring.

## 4. Data integrity contract and gaps discovered
- Keep the existing authoritative rules in rules.ts/report-groups.ts/report-period.ts/recompute.ts, import validation and snapshot logic; do not duplicate calculations inside visual components.
- Evaluated ranks in code: Helper, SN.Helper, Moderator only. Responsible (General), Administrator excluded. Exact role grouping excludes any other string from Top lists. Existing Rank enum, SQL CHECK and import validRanks do **not** model a separate literal M. rank. Never infer a rank from a person's name prefix or auto-reclassify existing names. Supporting an explicit new rank in storage requires confirmed migration semantics, including whether it should appear in non-Top totals; no migration made here.
- Keep Flags zero green, >5 amber/orange, >7 red (red overrides); Rating >=4.80 green, original active/review semantics. Weekly Flag %= flags / tickets *100; no denominator -> unknown. Source reference 87.4% is not a real value or threshold. Preserve Monday reset, cumulative baseline, decimal hours, exact coverage and current-vs-historical separation.
- Current history joins readings to current roster status/rank (state.ts); historical exports are filtered against current eligibility. A new historical-cohort policy would change meaning. Do not silently introduce it during styling.
- Existing summary/chart may sum known records if other ticket/hour values are missing; the specific period export enforces incomplete totals. Distinguish approved existing aggregation vs future complete/partial disclosure; do not turn missing inputs into real zeros. Charts must not fabricate daily split or percent growth. Test cross-week, zero, null, sparse and empty cases before release.
- Current shift storage is free-text shift_label. A weekly calendar cannot be populated by pretending unspecified days or time zones are known. Use existing values faithfully; request approval before a structured shift schema.
- /api/state returns all readings on every load; assess response sizes and render costs using long history before changing APIs. Remove unused images, lazy-load heavy media and preserve current preview isolation.

## 5. Measured baseline (not production-data results)
Full npm ci and npm run build including prebuild regression suites: **PASS**, with core rules, Excel, duplicate guard, archive roster, report scopes, dynamic Canvas poster, previous-period regression, preview database isolation and TypeScript checks.
Authenticated actual disposable PostgreSQL HTTP integration (original-equivalent existing CHICO test workbook, not the original XLSX binary): 34 stored / 30 active, 26 eligible; 29 saved readings; eligible Tickets 3222, Flags 50, TIME 259 decimal hours for 2026-11-09–12. Duplicate import guarded; source row order preserved. A new week without data remains separate.
Real Chromium authenticated with isolated database (no interception of API for the baseline matrix): 11 sections x 5 widths (1440, 1024, 768, 390, 320) = **55 views**, zero uncaught JS exceptions, zero flagged document-level overflow, zero flagged broken visible images/missing headings. Captured 22 actual viewport screenshots (desktop + mobile for every tab); visually reviewed an overview of the dashboard, team, reading entry and Discord. The reproducible script writes new evidence to local QA output without putting staff images/data on a public path. This is a baseline screen/load smoke test, not full accessibility, performance, cross-browser or all editor mutation coverage.
Real authenticated export: XLSX 26 data rows; historical HTML contained 3222/50/259; unauthenticated state rejected (401). Manual backup create and JSON download passed on test database, with reading count unchanged. Actual Discord PNG downloaded: 1560 x 1949, 2,854,543 bytes.
Production monitoring scope in this phase: health/deployment only; no production password, database rows, destructive operations, or production screenshot of authenticated screens.

## 6. Phase acceptance / release gate
1. Audit & architecture: recovery point, isolated build and data contract, inventory, baseline QA repeatable with `scripts/test-nexus-baseline.cjs`. Treat unresolved schema/policy decisions as explicit blockers for those changes, not permission to reinterpret old data.
2. Design system: original wolf/brand assets; coherent tokens, glass, icons, common controls, motion/reduced-motion, keyboard dock, RTL/dark/light and responsive primitives. Check actual browser screenshots before page-level rollout.
3. Every screen: component-specific layout, working buttons and all preserved flows; login, 11 tabs, profile modal, shift management UI, dialogs. Use actual dynamic data; no static screenshot-as-page.
4. Functional and optimization: isolated real DB add/edit/import/duplicate/reject/coverage/export/close-week/backup flows; preserve actual totals and order; long names/large roster; sparse, null, zero; measure asset size, rendering and speed, accessibility. No new schema or authorization assumptions.
5. Final: Chromium + other target engines (where available), keyboard and assistive checks, five widths, verified before/after actual captures, all critical regressions pass, visual review against references, no invented scores. Preview first, owner publication approval, verify production and documented rollback.

**Decision status:** Phase 1 establishes a measured baseline and refactor contract. It is not a claim that redesign, production-data validation or recovery rehearsal is complete. No changes to the approved production deployment, ranking policy, or data.