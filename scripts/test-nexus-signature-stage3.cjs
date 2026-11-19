const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shell=read('src/components/v2/ExecutiveCommand.tsx');
const stage=read('src/components/nexus/NexusShell.tsx');
const palette=read('src/components/nexus/NexusCommandPalette.tsx');
const css=read('src/components/v2/signature-phase3.css');
const generator=read('scripts/build-executive-css.cjs');
const packageJson=JSON.parse(read('package.json'));

assert(shell.includes("import NexusCommandPalette from '../nexus/NexusCommandPalette'"),
 'The command palette must be live in the existing authenticated application, not a demo');
assert(shell.includes('<NexusCommandPalette open={searchOpen} routes={links} members={rows}'),
 'Navigation and staff search must use real in-memory signed-session data');
assert(shell.includes("onNavigate={open}")&&shell.includes("onMember={id=>"),
 'Each result must have a real route or actual member callback');
assert(shell.includes("event.key.toLowerCase()==='k'"),
 'Ctrl/Cmd+K must be a real keyboard shortcut');
assert(shell.includes("if(auth!=='in'||previewLogin)return"),
 'Do not trigger command navigation while signed out');
assert(shell.includes("document.querySelector('[aria-modal=\"true\"]')"),
 'Do not steal shortcuts from another modal');
assert(!shell.includes('searchOpen&&<div className="x-command-search"'),
 'Remove the old click-to-filter placeholder');
assert(palette.includes('aria-modal="true"')&&palette.includes('role="dialog"'));
assert(palette.includes("e.key==='Escape'")&&palette.includes("e.key==='Tab'"),
 'Dialog must support Escape and focus wrapping');
assert(palette.includes("e.key==='ArrowDown'")&&palette.includes("e.key==='ArrowUp'")&&palette.includes("e.key==='Enter'"),
 'Keyboard search result activation must work');
assert(palette.includes("members.filter")&&palette.includes("routes.filter"),
 'Results must be drawn from genuine route and roster lists only');
assert(!palette.includes("fetch(")&&!palette.includes("/api/"),
 'This enhancement must not add a new API or expose staff to anonymous users');

assert(!stage.includes('ct-theater-grid')&&!stage.includes('nx-stage-aura'),'No decorative grid in identity or dashboard');
assert(stage.includes('command-analysis')&&stage.includes('leader-lists'),'Data and leaderboard lead the dashboard composition');
assert(shell.includes('<motion.strong className="nx-kpi-number"'),
 'Animated values must update from actual summary metrics, without replacing source calculation');
assert(shell.includes("key={english+':'+value}"),
 'Value reveal must retrigger only for an actual value change');
assert(css.includes('ct-auth-stage')&&css.includes('nx-palette-dialog')&&css.includes('nx-dock-item.is-active'));
assert(css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('@media(max-width:760px)'),
 'Accessibility and mobile alternatives are required');
assert(css.includes('pointer-events:none')&&css.includes('forced-colors:active'),
 'Decorations must not capture clicks and high contrast requires an alternative');
assert(generator.includes("'signature-phase3.css'"),'Stage 3 styles must be in the canonical generated stylesheet');
assert(packageJson.scripts.prebuild.includes('test:signature-stage3'),
 'Stage 3 UI contracts must gate production builds');
assert(!packageJson.dependencies.three&&!packageJson.dependencies.gsap&&!packageJson.dependencies['@react-three/fiber'],
 'Do not add a new 3D/motion runtime without measurements and a new decision');
assert(read('src/lib/rules.ts').includes('isEvaluatedAdmin'),
 'Do not replace production ranking policy during visual transformation');
console.log('PASS CHICO NEXUS Stage 3: live command palette, real KPI reveals, wolf depth, focus, mobile and reduced motion.');
