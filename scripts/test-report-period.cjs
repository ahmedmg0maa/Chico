const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function compile(name,imports={}){
 const file=path.resolve(__dirname,'..',name),source=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:n=>imports[n]||require(n),console,Date,Intl},{filename:file});
 return mod.exports;
}
const rules=compile('src/lib/rules.ts');
const m=compile('src/lib/report-period.ts',{'./rules':rules});
const admins=[
 {id:'1',name:'Rare',rank:'Helper',active:true,in_reporting:true,sort_order:1},
 {id:'2',name:'SN.Gaby',rank:'SN.Helper',active:true,in_reporting:true,sort_order:2},
 {id:'3',name:'M.Gambul',rank:'Moderator',active:true,in_reporting:true,sort_order:3},
 {id:'4',name:'A. Marwan',rank:'Administrator',active:true,in_reporting:true,sort_order:4},
 {id:'5',name:'General',rank:'Responsible',active:true,in_reporting:false,sort_order:5}
];
const reading=(id,from,to,tickets,flags,rating,at='2026-11-14T10:00:00.000Z')=>({
 admin_id:id,from_date:from,to_date:to,week_start:rules.weekStart(from),
 tickets_delta:tickets,flags_delta:flags,flags_counter:flags,rating,created_at:at
});
const records=[
 reading('1','2026-11-09','2026-11-12',201,2,4.94),
 reading('2','2026-11-09','2026-11-12',133,3,4.90),
 reading('3','2026-11-09','2026-11-12',603,4,4.95),
 reading('4','2026-11-13','2026-11-13',72,0,5.0),
 reading('1','2026-11-13','2026-11-13',20,0,4.87,'2026-11-13T10:00:00.000Z')
];
const included=rules.eligibleReadings(records,admins);
assert.equal(included.length,4,'Administrator must not be part of report periods');
const truncated=m.selectPeriod(included,'2026-11-10','2026-11-12');
assert.equal(truncated.matching.length,0);
assert.equal(truncated.partial.length,3);
assert.equal(truncated.canExport,false);
assert.equal(truncated.expandFrom,'2026-11-09');
assert.equal(truncated.expandTo,'2026-11-12');
const mixed=m.selectPeriod(included,'2026-11-12','2026-11-13');
assert.equal(mixed.matching.length,1);
assert.equal(mixed.partial.length,3);
assert.equal(mixed.canExport,false,'must never export only some of the overlapping readings');
assert.equal(mixed.expandFrom,'2026-11-09');
const complete=m.selectPeriod(included,'2026-11-09','2026-11-13');
assert.equal(complete.canExport,true);
const aggregates=m.reportTotals(complete.matching,admins);
assert.equal(aggregates.tickets,957);
assert.equal(aggregates.flags,9);
const rows=m.reportRows(admins,complete.matching);
assert.equal(rows.length,3,'no Administrator or General in poster');
const rare=rows.find(x=>x.name==='Rare');
assert.equal(rare.tickets,221);
assert.equal(rare.rating,4.87,'latest rating must use date, not order of upload');
assert.equal(m.latestPeriod(included).to_date,'2026-11-13');
assert.equal(m.latestSingleDay(included).from_date,'2026-11-13');
const gap=m.selectPeriod(included,'2026-11-14','2026-11-14');
assert.equal(gap.canExport,false);
assert.equal(gap.partial.length,0);
const partialData=[reading('1','2026-11-09','2026-11-12',null,3,4.8),reading('2','2026-11-09','2026-11-12',20,null,4.9)];
const incomplete=m.reportTotals(partialData,admins);
assert.equal(incomplete.tickets,null,'missing Tickets must not be reported as partial known total');
assert.equal(incomplete.flags,null,'missing Flags must not be reported as partial known total');
const incompleteRows=m.reportRows(admins,partialData);
assert.equal(incompleteRows.find(x=>x.name==='Rare').tickets,null);
assert.equal(incompleteRows.find(x=>x.name==='SN.Gaby').flags,null);
const genuineZero=[reading('1','2026-11-09','2026-11-09',0,0,5)];
assert.equal(m.reportTotals(genuineZero,admins).tickets,0);
assert.equal(m.reportTotals(genuineZero,admins).flags,0);
assert.equal(m.selectPeriod(included,'2026-11-15','2026-11-16').valid,false,'dates across Monday must be rejected');
console.log('PASS period integrity: no partial exports, one-click coverage, admin/General exclusion, latest rate, honest missing/zero totals');
