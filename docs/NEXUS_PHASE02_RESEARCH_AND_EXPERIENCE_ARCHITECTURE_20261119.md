# CHICO NEXUS — Phase 02: Creative Research & Experience Architecture

**Date:** 2026-11-19 · **Product:** CHICO TEAM · **Scope:** Existing Next.js 16 / React 19 application and all 13 live workspaces.
**Release policy:** User-authorized implementation, test and production publication without an additional approval round. Preserve current data, authentication and backend contracts.

## 1. Actual project baseline

- The current public application is the existing GitHub project `ahmedmg0maa/Chico`, deployed as `chicoteam.vercel.app` through Vercel. Do not replace it with a new site or SaaS landing page.
- Existing stack: Next.js 16, React 19, TypeScript, Postgres, ExcelJS, server-side one-password signed-cookie authentication and the already-installed `motion` package. Retain the working application shell, API routes, stats math, exports, academy video handling and salary.
- Existing sections: dashboard, team, operations, updates, excel, server, daily, reports, weeks, alerts, settings, salary, academy (**13**). Some 2026-11-17 audit notes predate salary and academy and reference 11 tabs: do not silently drop the two newer screens.
- Both root and `/v2` render `ExecutiveCommand`. The bundled `executive-unified.css` is GENERATED from source modules by `scripts/build-executive-css.cjs`; never hand-edit it.
- Production source at start of this phase: `2b2cddc9418827f975fe0573195945745a77b8a9`. Prior release has user-approved interactive transitions and history navigation.

## 2. Source research and decisions

| Source | Relevant implementation | Decision |
|---|---|---|
| https://motion.dev/docs/react-animate-presence | AnimatePresence wait/sync/popLayout, layout and exit motion | KEEP installed Motion as the sole engine for UI element transitions. Avoid a second animation engine targeting the same DOM element. |
| https://motion.dev/docs/react-accessibility | MotionConfig reducedMotion="user" | KEEP and extend reduced-motion support, preserve real interaction while omitting spatial motion when requested. |
| https://tympanus.net/codrops/hub/all/ | Experimental page transitions, GL, SVG, navigation and creative interfaces | Extract the principle of intentional continuity and material depth, not whole-page source duplication or heavy effects on management forms. |
| https://tympanus.net/codrops/2026/02/04/making-motion-behave-inside-vladyslav-penevs-production-ready-interaction-systems/ | Production-level interaction and motion systems | Build reusable UX primitives rather than decorative one-off demos. |
| https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | Scroll-based timeline control, responsive matchMedia and cleanup | Candidate ONLY for a later verified cinematic section if native CSS + Motion cannot meet requirements. No installation in Phase 02. |
| https://github.com/ibelick/motion-primitives | MIT licensed React microinteraction patterns | Source of possible patterns; prefer adapting ideas with existing Motion dependency. |
| https://github.com/magicuidesign/magicui | MIT licensed decorative UI patterns | Reference only until a specific benefit and dependency footprint is verified. |
| https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md | MIT **plus Commons Clause** | Do NOT assume plain MIT. Recheck the exact component and licensing terms before copying it. No code imported in Phase 02. |
| https://r3f.docs.pmnd.rs/getting-started/installation | React Three Fiber 9 paired with React 19 | Later 3D proof of concept only. Not needed for ordinary management pages or Phase 02. |
| https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition | Built-in SPA view transitions with support guards | Alternate for future route-specific effect, avoid double-animation with existing Motion transitions. |
| https://web.dev/articles/animations-guide | Compositor-friendly opacity and transform; sparing will-change | Keep animation paint inexpensive and skip expensive scenes on small devices. |

**Trade-off:** For this 13-screen private administration tool, meaningfully different interactions beat maximum motion density. A permanently running WebGL canvas, particle field or custom cursor on forms would increase work and potential defects without making reports more understandable.

## 3. Design DNA and reusable primitives

- **Identity:** Dark obsidian and titanium materials; CHICO noble wolf artwork; warm restrained gold highlights; rank colors retain their approved meanings.
- **Spatial focus:** One subdued illumination family per screen intent. Never use colored scene illumination as a numerical/status indicator.
- **Scene map:** `src/components/nexus/experience.ts` is the single presentational map for 13 destinations (command / people / operations / data / reports / vigilance / system / finance / learning). No data, scores or permissions are held in this mapping.
- **Responsive optical depth:** CSS scene foundation is part of the canonical generated stylesheet. Small decorative spot follows a mouse pointer with requestAnimationFrame and direct DOM style writes, not React state. Disabled on touch-only devices, reduced-motion and small viewports. Pointer overlay never captures clicks.
- **Motion tokens:** short 160ms, medium 280ms, arrival 620ms; existing 220ms page transition remains under Motion. Physical emphasis is restricted to actionable shortcuts and surface boundaries; no excessive content bounce.
- **Accessibility:** Explicit `:focus-visible`; original semantic inputs/buttons remain real elements; reduced motion disables directional/3D gestures; keyboard, forms, and loading must never be obscured by effects.
- **Performance:** No new JS dependencies or 3D runtime; only small transform-based decorative movement and CSS hover/focus treatment. Avoid animating layout, blur or large painted surfaces on scroll.

## 4. Page-by-page experience contract

| Existing destination | Visual language | Purposeful next interaction (future phase) |
|---|---|---|
| dashboard | command | Presence for real KPIs, contextual previous-week states, legible Top 3 groupings, animated but precise comparison boundaries. |
| team | people | List ↔ member detail continuity, rank/status filter feedback, non-disruptive edit affordances and original roster order. |
| operations | operations | Distinguish frequent shortcuts from rare/destructive actions, preserve confirmation and workflow context. |
| updates | operations | Clear reading coverage, stages for entry/validate/save and safe error recovery. |
| excel | data | Legible upload → validate → review conversion → confirm transaction, no surprise commits. |
| server | data | Semantic data-backed changes/coverage without invented trends. |
| daily | reports | Coverage-aware report assembly, honest incomplete-period messaging and export gating. |
| reports | reports | Refined generation controls and faithful existing approved Discord Canvas output. |
| weeks | data | Monday reset boundaries, explicit weekly close/reopen confirmations and history access. |
| alerts | vigilance | Real alert severity with actionable next step; non-recorded remains unknown. |
| settings | system | Clear safeguards, confirmations and backups; never shift security settings merely for visual design. |
| salary | finance | Copy/export feedback, bonus multiplier state and Client ID privacy controls; never fabricate payout rules. |
| academy | learning | Search/filter/chapter continuity and protected real video-upload status; no placeholder fake lessons. |

## 5. QA and acceptance

1. Re-run all repository prebuild checks, including the new `test:experience-stage2` contract on all 13 destinations.
2. Verify Preview deployment completes with the exact branch commit. Check runtime errors; the previous Preview had `SERVICE_NOT_READY` during auth, so treat authenticated testing as separate from a green build.
3. Confirm no database migrations, schema rewrites, new fake data, ranking changes, auth bypasses, salary logic changes or poster rendering modifications.
4. Inspect desktop/tablet/mobile widths and mouse/touch/reduced-motion; no overflow, accessibility regressions, focus loss or form interference.
5. Target on real-device p75: INP <= 200ms, LCP <= 2.5s, CLS <= 0.1. These are RELEASE GOALS, not outcomes measured by this code change.
6. Merge to main only when CI and Preview are READY. Check production alias points to the merged SHA; check health/runtime errors. Keep rollback candidate intact.

## 6. Delivery and future phases

**Shipped by Phase 02 implementation:** real code for a 13-route visual-intent map, motion-responsive ambient layer, focus treatment, reusable motion tokens, responsive/reduced-motion safeguards, repository regression contract, and architecture/research documentation.

**NOT yet shipped:** true 3D wolf, advanced custom scroll choreography, per-form choreography, all-screens visual redesign, interactive full browser QA with isolated authenticated DB. Those belong to Phase 03–06, and none should be reported as done by a green build alone.

**Next:** Phase 03 implements coherent high-end material system, command center presence and improved login/shell; Phase 04 covers every remaining functional workflow; Phase 05 experiments with measured immersive techniques; Phase 06 measures, repairs and releases final quality.
