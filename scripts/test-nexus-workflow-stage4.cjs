const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const v=f=>read('src/components/v2/'+f+'.tsx');
for(const f of ['ExecutiveOperations','ReadingEntryStudio','DailyReportStudio','DiscordReportStudio','SalaryCenter','AcademyCenter'])assert(v(f).includes('<WorkflowStatus'),f+' has state-driven workflow status');
for(const f of ['DailyReportStudio','DiscordReportStudio']){assert(v(f).includes('period.canExport'));assert(v(f).includes('!imageReady||downloading'));assert(v(f).includes('partial>0'));}
assert(v('ExecutiveOperations').includes('approvedRosterSync')&&v('ExecutiveOperations').includes('IMPORT REVIEWED'));
assert(v('ExecutiveTeamStudio').includes('nx-filter-strip')&&v('ExecutiveTeamStudio').includes('setStatus(t.id)'));
assert(v('AcademyCenter').includes('<progress value={progress} max={100}')&&v('AcademyCenter').includes("action:'finish'"));
assert(v('SalaryCenter').includes('hideAll')&&v('SalaryCenter').includes('exportExcel'));
assert(read('scripts/build-executive-css.cjs').includes("'workflow-phase4.css'"));
assert(read('src/components/v2/workflow-phase4.css').includes('prefers-reduced-motion'));
console.log('PASS Phase 04 workflow state, report guards, staff filters and upload progress');
