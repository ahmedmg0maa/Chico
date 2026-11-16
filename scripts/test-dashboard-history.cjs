const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function compile(file,imports={}){
 const source=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',source)(id=>imports[id]||require(id),module,module.exports);
 return module.exports;
}
const rules=compile('src/lib/rules.ts');
const {previousRecordedWeek}=compile('src/lib/dashboard-history.ts',{'./rules':rules});
const fixture=JSON.parse(read('scripts/test-import-route.cjs').match(/const fixture=(\[[^\n;]+\]);/)[1]);
const admins=fixture.map((row,i)=>({id:String(i+1),name:row[1],rank:row[0],active:true,
 in_reporting:row[0]!=='Responsible',sort_order:i,admin_level:row[0]==='Moderator'?2:1}));
admins.push(...['Alajmi','Alkhaldy','Rey','Yoyo'].map((name,i)=>({id:'old'+i,name,rank:'Helper',active:false,in_reporting:false,sort_order:100+i})));
const readings=fixture.filter(row=>row[0]!=='Responsible').map(row=>{
 const index=fixture.indexOf(row);
 return {id:'r'+index,admin_id:String(index+1),admin_name:row[1],rank:row[0],
  week_start:'2026-11-09',from_date:'2026-11-09',to_date:'2026-11-12',
  tickets_delta:row[5],flags_delta:row[4]-row[3],hours:row[6],rating:row[7]};
});
const old=previousRecordedWeek(admins,readings,'2026-11-16');
assert(old,'Previous recorded week should be found');
assert.equal(old.weekStart,'2026-11-09');
assert.equal(old.from,'2026-11-09');assert.equal(old.to,'2026-11-12');
assert.equal(old.records,26);assert.equal(old.members,26);
assert.equal(old.tickets,3222);assert.equal(old.flags,50);assert.equal(old.hours,259);
console.log('PASS old multi-day reading remains historical, 26 evaluated, 3222 Tickets, 50 Flags, 259 hours');
assert.equal(previousRecordedWeek(admins,readings,'2026-11-09'),null,'Current-week readings are never historical');
assert.equal(previousRecordedWeek(admins,[],'2026-11-16'),null,'No historical results should yield null');
const second={...readings[0],id:'second-week',week_start:'2026-11-16',from_date:'2026-11-16',to_date:'2026-11-17',
 tickets_delta:15,flags_delta:2,hours:4};
const extra={...second,id:'same-member',from_date:'2026-11-18',to_date:'2026-11-20',tickets_delta:10,flags_delta:0,hours:2};
const future={...second,id:'future',week_start:'2026-11-30',from_date:'2026-11-30',to_date:'2026-11-30',tickets_delta:9999};
const last=previousRecordedWeek(admins,[...readings,second,extra,future],'2026-11-23');
assert(last);
assert.equal(last.weekStart,'2026-11-16');
assert.equal(last.from,'2026-11-16');assert.equal(last.to,'2026-11-20');
assert.equal(last.records,2);assert.equal(last.members,1,'Same member in multiple readings is one person');
assert.equal(last.tickets,25);assert.equal(last.flags,2);assert.equal(last.hours,6);
console.log('PASS chooses latest eligible prior week, unique members, genuine coverage, ignores future');
const missing=previousRecordedWeek(admins,[...readings,second,{...extra,flags_delta:null,hours:null}],'2026-11-23');
assert(missing);
assert.equal(missing.tickets,25);assert.equal(missing.flags,null);assert.equal(missing.hours,null);
const zero=previousRecordedWeek(admins,[{...second,tickets_delta:0,flags_delta:0,hours:0}],'2026-11-23');
assert(zero);assert.equal(zero.tickets,0);assert.equal(zero.flags,0);assert.equal(zero.hours,0);
console.log('PASS unknown totals never become misleading partial values; actual zeros remain zeros');
const invalid=previousRecordedWeek(admins,[{...second,admin_id:'old0'}],'2026-11-23');
assert.equal(invalid,null,'Archived staff never leaks into evaluated performance card');
const command=read('src/components/v2/ExecutiveCommand.tsx');
const notice=read('src/components/v2/DashboardWeekNotice.tsx');
const css=read('src/components/v2/executive-v12.css');
assert(command.includes('!review&&state&&!hasRegisteredWeek&&<DashboardWeekNotice'),'Notice only when live state is ready and current evaluated week is unrecorded');
assert(command.includes('const hasRegisteredWeek=currentEligible.some('),'Only eligible current-week records count as a weekly report');
assert(command.includes('const intervalRows=currentEligible.filter('),'Period list must exclude leadership-only records');
assert(notice.includes('onRecord')&&notice.includes('onReadReports'),'Actions must be real navigation controls');
assert(notice.includes('مش داخلة في مؤشرات الأسبوع الحالي'),'Historic numbers must be explicitly identified as prior period');
assert(css.includes('.v13-week-notice')&&css.includes('.chico-v2.x-light .v13-week-notice'),'Style must work in both themes');
console.log('PASS dashboard renders independent previous period, explicit no-report state and working navigation contracts');
