# CHICO — Phase 2 visual and UX contract (2026-11-14)

## Objective
A premium, genuinely usable administration control center. Preserve **OneState + CHICO** identity and the approved wolf art, while eliminating ornamental noise, duplicate wayfinding, cramped metrics, CSS overrides, and inconsistent forms.

**Scope:** application pages and navigation only. Phase 3 owns the detailed Discord/poster renderer, podiums, and PNG layout. The backend, rank eligibility, Excel numbers, weekly cycle and production data approved in Phase 1 are not to be modified by Phase 2.

## Current implementation audit
- \`/v2\` has 11 routes: dashboard, team, operations, updates, excel, server, daily, reports, weeks, alerts, settings.
- Sidebar already uses a hamburger + collapsible navigation. Retain these behaviors and stable query parameter \`?tab=<id>\`. Do not introduce permanent sidebar on narrow screens.
- Five legacy CSS override layers are loaded on top of executive.css (\`v7\`, \`v8\`, \`v9\`, \`v10\`, \`v11\`). Both main visual components and form/page components use different generations of classes. Avoid global selector overrides that can break modal portals, exporter canvases, or login. Consolidation into a single stable system after screenshot parity checks is a **phase-2 acceptance requirement**, not an invitation to append endless overrides.
- The command dashboard currently has six metric tiles, a hero, a separate decorative weekly banner, three mid-page panels, a weekly chart, quick actions and a full table. This creates excessive competing hierarchy.
- Operations workspace links to Excel / Server / Week / Alerts / Settings which are also direct routes. Keep direct deep links, but group top-level navigation by task.
- Hero art, wolf, rank insignias and authentic CHICO imagery are already available under \`/public/assets\`. Reuse originals; no arbitrary external game images or generated logos.

## Visual system — non-negotiable tokens
- Core: charcoal blue-black \`#0B0E15\`; surface \`#141A24\`; elevated \`#202938\`; clear warm ivory text \`#F7F1E8\`.
- Gold \`#DFB776\` is a **highlight**, not a blanket fill on every panel.
- Burgundy/red is reserved for danger/risk; green indicates valid/healthy; blue for SN.Helper, green for Helper, purple for Moderator. Do not use badges or dots to encode meaning without a text label.
- Modern editorial spacing. Default card radius 16px, major sections 21px, density optimized for monitoring; no arbitrary neon glows, tiny labels, clipped ornaments or duplicate trophy icons.
- Two consistent type stacks (Tajawal Arabic, Inter Latin/numerals), accessible contrast in both themes, tabular numerals on values.
- Standard motion 150–180 ms, transform only on actual interaction; reduced-motion preference honored.
- Distinguish empty, loading, failed, incomplete, zero and not-applicable states. The UI must never invent data to fill space.

## Information architecture
1. القيادة (Overview): Dashboard, Team, Alerts.
2. العمل اليومي (Operations): New reading, Management Tools.
3. التقارير (Reports): Daily Report, Discord Report.
4. النظام (System): Settings.
Deep links to Excel, Server, Week close and all advanced tools remain valid, accessible via Management Tools or direct URL. The sidebar is grouping, not hiding/removing functionality.

## Component migration strategy
**Milestone A (this draft):** introduce stable tokens and navigation grouping in a single new phase-2 style layer and document the visual contract. Do not touch calculations. Build a visual QA reference.

**Milestone B:** replace duplicated component styles in each page with system primitives: cards, section titles, filters, tables, action bars, forms, toasts, modals, empty states, ranking and status treatments. Remove obsolete rules *after* parity screenshot tests, rather than leaving another stack of patch layers.

**Milestone C:** simplify the command dashboard hierarchy: one authentic art hero, prioritized KPIs, activity/alerts, real-data top performers and quick actions. Keep other metrics available but no repeated decorative sections.

**Milestone D:** responsive and interaction polish across 1366px/1920px, 1024px, 768px, 390px, 320px, dark/light, with focus/keyboard and empty-data cases.

## Acceptance gates
- Navigation: hamburger open/close, grouped keyboard navigation, Escape, overlay, deep-link \`?tab\` integrity, no accidental traps.
- No visual clipping/overlapping across declared viewport sizes, on all main pages and modal dialogs.
- No placeholder counts, fake team activity, stock wolf imagery, white stars beside SN.Helper or invented admin names.
- Compare actual browser screenshots, at least desktop + narrow mobile, on authenticated or verified preview state.
- Text and background contrast checked; focus indication visible; modal contents independently scrollable.
- Import/report/export backend operations unchanged and verified by Phase-1 CI.
- Files and selectors consolidated rather than perpetually layered. The current v12 file is explicitly a transitional foundation, **not** the final architecture.
- **No merge or release of Phase 2 until design and functional QA and explicit approval.**
