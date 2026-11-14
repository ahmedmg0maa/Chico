const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const main=source('src/components/v2/ExecutiveCommand.tsx');
const route=source('src/app/v2/page.tsx');
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
assert.equal((dashboardKpis.match(/title:/g)||[]).length,4,'Only four decision KPI cards on the home page');
for(const needed of ['Weekly Tickets','Weekly Flags','Flag Rate','Team Coverage'])
 assert(dashboardKpis.includes(needed),'Missing executive KPI '+needed);
assert(!dashboardKpis.includes('Total Staff'),'Staff count belongs to hero, not duplicated in KPI');
assert(!dashboardKpis.includes('Average Rating'),'Per-member rating belongs to team dashboard');
assert(!main.includes('<section className="x-weekbanner">'),'Remove redundant ornamental weekly section');
assert(route.includes("executive-v12.css"),'Stage 2 design tokens must be imported on /v2');
for(const key of ['--ch-bg:','--ch-surface:','--ch-muted:','--ch-gold:','--ch-line:','prefers-reduced-motion','focus-visible','max-width:720px'])
 assert(css.includes(key),'Missing design system contract '+key);
assert(!css.includes('.v9-poster-preview canvas'),'Poster design belongs to Phase 3 and must stay unchanged');
const discord=source('src/components/v2/DiscordReportStudio.tsx');
assert(discord.includes('latestRecord&&latestRecord.from_date===latestRecord.to_date'),'Empty Discord report must not dereference a null latest reading');
assert(main.includes('href="#chico-main-content"')&&main.includes('id="chico-main-content"'),'Skip to main content must be available');
assert(main.includes("state?'البيانات محمّلة':'جاري تحميل البيانات'"),'Never falsely claim active DB connection before state fetch');
assert(main.includes('aria-label="تسجيل الخروج من CHICO"'),'Logout button must be accessible');
const team=source('src/components/v2/ExecutiveTeamStudio.tsx');
assert(!team.includes("||'CHICO GENERAL TEAM'"),'No fake fullname placeholder for team records');
const operations=source('src/components/v2/ExecutiveOperationsWorkspace.tsx');
assert(operations.includes("aria-current={selected===t.id?'page':undefined}"),'Management subnav must expose active state');
assert(css.includes('.chico-v2.x-light .v8-rank-label.v8-rank--helper'),'Accessible light-theme rank contrast must be maintained');
assert(css.includes('.chico-v2.x-light .x-user-button small'),'Light-theme user button subtitle contrast must be maintained');
assert(css.includes('.v9-history-table th')&&css.includes('.x-op-table th'),'Excel/history tables should have readable sticky headers');

console.log('PASS CHICO Stage 2: grouped navigation, 4 dashboard KPIs, semantic route state, responsive visual tokens');
