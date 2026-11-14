const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const op=read('src/components/v2/ExecutiveOperations.tsx');
assert(op.includes('const fileInputRef=useRef<HTMLInputElement>(null)'),'File input ref missing');
assert(op.includes("if(fileInputRef.current)fileInputRef.current.value=''"),'Successful upload must clear the native file input');
assert(op.includes('setFile(null)'), 'Saved file state must be cleared');
assert(op.includes("setPeriodYear(e.target.value);setImportView(null);setAcceptedImport(false);setApprovedRosterSync(false);"),'Changing report year must revoke the old roster-sync approval');
assert(op.includes("setImportView(null);setAcceptedImport(false);setApprovedRosterSync(false);"),'New Excel preview must revoke the old approval');
assert(op.includes('explainExcelIssue(w)'),'User must receive Arabic validation feedback');
assert(op.includes("busy?'جاري فحص الملف ومطابقة البيانات…'"),'Upload preview must show loading state');
const css=read('src/components/v2/executive-v12.css');
assert(css.includes('.v9-poster-mobile-help'),'Mobile report swipe hint is missing');
assert(css.includes('min-width:880px!important'),'The detailed poster must be readable by panning on small screens');
for(const name of ['DailyReportStudio','DiscordReportStudio']){
 const file=read('src/components/v2/'+name+'.tsx');
 assert(file.includes('v9-poster-mobile-help'),name+' mobile guidance missing');
 assert(file.includes('period.canExport'),name+' coverage gate missing');
}
console.log('PASS CHICO user-journey contracts: input reset, explicit approvals, readable mobile reporting, and Arabic error feedback');
