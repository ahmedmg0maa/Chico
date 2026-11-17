const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const main=source('src/components/v2/ExecutiveCommand.tsx');
const route=source('src/app/v2/page.tsx');
const rootRoute=source('src/app/page.tsx');
const css=source('src/components/v2/executive-v12.css');
const metadata=main.slice(main.indexOf('const navigationGroups:'),main.indexOf('function pretty('));
const sidebar=main.slice(main.indexOf('<nav className="v12-nav"'),main.indexOf('<div className="x-sidebar-footer">'));
for(const required of ["['dashboard','team','alerts']","['updates','operations']","['daily','reports']","['settings']"]){
 assert(metadata.includes(required),'Missing primary nav group '+required);
}
assert(!main.includes('primaryLinks.map'),'Legacy ungrouped sidebar should be removed');
assert(sidebar.includes("aria-current={tab===id?'page':undefined}"),'Active route accessible to assistive tech');
assert(sidebar.includes("onClick={()=>open(id)}"),'Every nav link works through existing router');
const dashboardKpis=main.slice(main.indexOf('const kpis=['),main.indexOf('const isLogin='));
assert.equal((dashboardKpis.match(/title:/g)||[]).length,4,'Only four core decision KPI cards on the home page');
for(const needed of ['Weekly Tickets','Weekly Flags','Rating','Time'])
 assert(dashboardKpis.includes(needed),'Missing executive KPI '+needed);
assert(!dashboardKpis.includes('Total Staff'),'Staff count belongs to hero, not duplicated in KPI');
const nexus=source('src/components/nexus/NexusShell.tsx');
assert(nexus.includes('Weekly Flag %')&&nexus.includes('تغطية التقييم'),'Rate and coverage must stay available in distinct command panels');
assert(nexus.includes('Top 3 Helpers')&&nexus.includes('Top 3 Moderators'),'Both approved ranking groups must appear on the dashboard');
assert(nexus.includes('NEXUS_DESTINATIONS')&&nexus.includes('aria-keyshortcuts'),'Floating dock has real routing and keyboard hints');
assert(!main.includes('<section className="x-weekbanner">'),'Remove redundant ornamental weekly section');
assert(route.includes("executive-unified.css"),'Stage 2 CSS must be loaded from one canonical entrypoint');
assert(rootRoute.includes('executive-unified.css')&&!rootRoute.includes('executive-v11.css'),'The root site must include complete mobile poster styles, not old CSS layers');
assert(!route.includes("executive-v12.css"),'No stacked versioned CSS imports on /v2');
const bundler=source('scripts/build-executive-css.cjs');
assert(bundler.includes('removedDeclarations')&&bundler.includes('combined.walkRules'),'CSS generator removes earlier exact-context declarations');
const unified=source('src/components/v2/executive-unified.css');
assert(unified.includes('.chico-v2')&&unified.includes('v12-nav'),'Combined CSS contains the full app and new design system');
for(const key of ['--ch-bg:','--ch-surface:','--ch-muted:','--ch-gold:','--ch-line:','prefers-reduced-motion','focus-visible','max-width:720px'])
 assert(css.includes(key),'Missing design system contract '+key);
assert(css.includes('.v9-poster-preview canvas')&&css.includes('aspect-ratio:auto'),'Phase 3 must preserve the poster Canvas native aspect ratio');
const discord=source('src/components/v2/DiscordReportStudio.tsx');
assert(discord.includes('latestSingleDay(eligibleRecords)')&&discord.includes('latestRecord?.to_date'),'Discord controls safely handle no recent eligible reading');
assert(main.includes('href="#chico-main-content"')&&main.includes('id="chico-main-content"'),'Skip to main content must be available');
assert(main.includes("state?'البيانات محمّلة':'جاري تحميل البيانات'"),'Never falsely claim active DB connection before state fetch');
assert(main.includes('aria-label="تسجيل الخروج من CHICO"'),'Logout button must be accessible');
const team=source('src/components/v2/ExecutiveTeamStudio.tsx');
assert(!team.includes("||'CHICO GENERAL TEAM'"),'No fake fullname placeholder for team records');
const operations=source('src/components/v2/ExecutiveOperationsWorkspace.tsx');
const operationTabs=source('src/components/v2/ExecutiveOperations.tsx');
assert(operations.includes('compactHead/>'),'Nested management subtools must request compact headings');
assert(operationTabs.includes("{!compact&&<img className="),'Nested pages should not load redundant large artwork');
assert(operations.includes("aria-current={selected===t.id?'page':undefined}"),'Management subnav must expose active state');
assert(main.includes('const light=false;')&&!main.includes('switchAppearance')&&!main.includes("localStorage.getItem('chico-ui-theme')"),'CHICO TEAM must always render dark, regardless of old preference');
assert(main.includes('ct-topbar')&&main.includes('<b>CHICO TEAM</b>'),'Compact canonical masthead must be present');
assert(!main.includes('CHICO TEAM 1.0')&&!nexus.includes('N E X U S'),'No old brand additions in app shell');
assert(!sidebar.includes('<small>{item.en}</small>'),'Drawer links should have one readable label');
const dark=source('src/components/v2/nexus.css');
assert(dark.includes('ct-emblem-float')&&dark.includes('ct-page-in')&&dark.includes('ct-drawer-in')&&dark.includes('prefers-reduced-motion:reduce'),'Motion should be purposeful and respect reduced motion');
assert(css.includes('.v9-history-table th')&&css.includes('.x-op-table th'),'Excel/history tables should have readable sticky headers');

console.log('PASS CHICO Stage 2: grouped navigation, 4 dashboard KPIs, semantic route state, responsive visual tokens');

assert(nexus.includes("{id:'salary',label:'الرواتب'}")&&nexus.includes("{id:'academy',label:'التدريب'}"),'Both new standalone pages must be present in the dock');
assert(nexus.includes('[0,1,2,6].map')&&nexus.includes('[3,4,5,7].map'),'Four direct destinations on both sides; legacy keyboard shortcut indexes retained');
assert(source('src/components/v2/signature.css').includes('repeat(4,minmax(0,1fr)) 74px repeat(4,minmax(0,1fr))'),'Nine-slot dock layout');
console.log('PASS dock salary and academy routes, balanced nine-slot layout.');
