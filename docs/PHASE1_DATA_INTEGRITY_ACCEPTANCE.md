# CHICO — Phase 1 data-integrity acceptance
Reference: uploaded original **New Microsoft Excel Worksheet (2)(2).xlsx**, Sheet1 A1:H31.
Period: **2026-11-09 through 2026-11-12**, four-day coverage (Monday–Thursday).
Report entry date in the normalized workbook: 2026-11-13.

## Exact source reconciliation (before any import)
| Rank | Personnel | Tickets delta | Flags delta | Decimal TIME |
|---|---:|---:|---:|---:|
| Helper | 12 | 804 | 18 | 98 |
| SN.Helper | 4 | 358 | 4 | 24 |
| Moderator | 10 | 2,060 | 28 | 137 |
| Administrator (stored but not evaluated) | 3 | 79 | 0 | 24 |
| Responsible / General (roster only) | 1 | N/A | N/A | N/A |
| **All source rows** | **30** | **3,301** | **50** | **283** |
| **Evaluated ranks only** | **26** | **3,222** | **50** | **259** |

All source rows (29 with statistics and General) must remain present in a roster-aware import preview. Administrator values can remain in the historical ledger, but are excluded from evaluations, server flag rate and Top 3. General must never receive readings.

Expected evaluated server flag rate for this period: 50 / 3,222 × 100 = **1.55%**. The original source has 50 / 3,301 × 100 = **1.51%**; label them differently and never mix the denominator.

## Rules that must pass
- Excel imports cannot change existing staff names, ranks or levels. Existing roster wins even if source rank is stale. Explicit permission required for brand-new names.
- Initial Tickets in a week reflect Monday-to-reading coverage. First nonzero reading starting later than Monday is blocked unless there is a previous same-week reading.
- Monday resets Tickets; Flags are cumulative across weeks and need an actual prior balance or a documented opening baseline.
- TIME is decimal hours (1.5=1h30). Only safe near-1900 Excel date serial coercions are converted, accompanied by a review notice.
- No automatic distribution of multi-day readings into individual dates.
- Preserve missing values (null) separately from recorded zero.
- The team list follows the approved roster order; Top 3 uses actual Ticket deltas.
- No automatic public/production data modifications before reviewing preview and acceptance.

## Acceptance / deployment gate
1. Run typecheck, rules, Excel, stage-one ledger and build tests in CI.
2. On an isolated test environment, preview the original uploaded file and verify all 30 people, 29 statistical rows, 9–12 November coverage and expected totals.
3. Commit only on the isolated test DB; re-read saved records, check aggregates, verify duplicate file reupload is blocked and no existing rank changes.
4. Verify first-week, multi-day, cross-Monday, Flags-baseline, zero-vs-null, closed-week and partial-file cases.
5. Obtain user approval before merging/deploying to the production domain.

**Open acceptance dependency:** a full authenticated XLSX→commit→database→report round trip has not yet been executed against a dedicated test database. CI passing alone does not complete stage one.
