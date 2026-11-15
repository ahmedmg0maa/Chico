const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),ExcelJS=require('exceljs');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const fixture=JSON.parse(read('scripts/test-import-route.cjs').match(/const fixture=(\[[^\n;]+\]);/)[1]);
const admins=fixture.map((r,i)=>({
 id:String(i+1),name:r[1],rank:r[0],active:true,in_reporting:r[0]!=='Responsible',
 sort_order:i+1,admin_level:1,joined_on:null
}));
admins.push(...['Alajmi','Alkhaldy','Rey','Yoyo'].map((name,i)=>({id:'old'+i,name,rank:'Helper',active:false,in_reporting:false,sort_order:101+i,admin_level:1,joined_on:null})));
const readings=fixture.filter(r=>r[0]!=='Responsible').map(r=>{
 const i=fixture.indexOf(r);return {
 id:'r'+i,admin_id:String(i+1),admin_name:r[1],rank:r[0],source_row:i+2,source_name:r[1],
 from_date:'2026-11-09',to_date:'2026-11-12',week_start:'2026-11-09',
 tickets_counter:r[5],tickets_delta:r[5],flags_counter:r[4],flags_baseline:r[3],
 flags_delta:r[4]-r[3],hours:r[6],rating:r[7],note:'Verified test row',
 created_at:'2026-11-13T12:00:00.000Z',report_entered_on:'2026-11-13'
 };
});
const state={admins,readings,summary:{week_start:'2026-11-09',tickets:3222,flags:50,rate:1.55}};
let current=state;
function compile(name,imports={}){
 const file=path.resolve(__dirname,'..',name);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText;
 const module={exports:{}};
 // Execute the transpiled route in the host realm so ExcelJS receives real
 // Array instances (vm realm arrays can be mistaken for objects by ExcelJS).
 const evaluate=new Function('require','module','exports',source);
 evaluate(n=>imports[n]||require(n),module,module.exports);
 return module.exports;
}
const rules=compile('src/lib/rules.ts');
const exportRoute=compile('src/app/api/export/route.ts',{
 '@/lib/rules':rules,
 '@/lib/api':{requireOwner:async()=>null,response:(obj,status=200)=>new Response(JSON.stringify(obj),{status}),failure:err=>{throw err;}},
 '@/lib/state':{loadState:async()=>current}
});
const endpoint=(scope,format)=>exportRoute.GET({nextUrl:new URL('https://chico.test/api/export?scope='+scope+'&format='+format)});
(async()=>{
 const r=await endpoint('team','xlsx');
 assert.equal(r.status,200);
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await r.arrayBuffer()));
 const sheet=wb.worksheets[0];
 const names=[];for(let i=2;i<=sheet.rowCount;i++)names.push(sheet.getRow(i).getCell(1).value);
 assert.equal(sheet.rowCount,27,'Exactly 26 evaluated staff plus header');
 for(const n of ['General','A. Marwan','A. Bashar','A. Nar','Alajmi','Alkhaldy','Rey','Yoyo'])
  assert(!names.includes(n),'Non-evaluated or inactive '+n+' should not appear in report companion');
 assert(names.includes('Kararr')&&names.includes('SN.Gaby')&&names.includes('M.Gambul'));
 console.log('PASS Excel team: 26 evaluated people, leadership and inactive excluded');
 const h=await endpoint('readings','xlsx');
 const wh=new ExcelJS.Workbook();await wh.xlsx.load(Buffer.from(await h.arrayBuffer()));
 const names2=[];for(let i=2;i<=wh.worksheets[0].rowCount;i++)names2.push(wh.worksheets[0].getRow(i).getCell(1).value);
 assert.equal(names2.length,26,'No Administrative readings in exported performance ledger');
 assert(!names2.some(n=>String(n).startsWith('A. ')));
 console.log('PASS Excel readings: 26 eligible records from 29 source records');
 const csv=await endpoint('team','csv'),rawCSV=new Uint8Array(await csv.arrayBuffer());
 // Fetch Response.text strips a UTF-8 BOM; check actual downloaded bytes instead.
 assert.deepEqual(Array.from(rawCSV.slice(0,3)),[239,187,191]);
 const body=Buffer.from(rawCSV).toString('utf8').replace(/^\uFEFF/,'');
 assert.equal(csv.status,200);assert(body.includes('Kararr'));assert(!body.includes('A. Marwan'));assert.equal(body.split('\r\n').length,27);
 console.log('PASS CSV team counts, BOM encoding, excluded rank');
 const printed=await endpoint('team','print'),html=await printed.text();
 assert(printed.status===200&&html.includes('Evaluated Members: 26')&&!html.includes('A. Bashar'));
 console.log('PASS print view reports correct evaluation cohort size');
 // This endpoint includes all historical readings. Its summary must describe
 // that historical scope, not misleadingly reuse the latest weekly totals.
 const historical={...readings[0],id:'historic',from_date:'2026-11-02',to_date:'2026-11-02',
  week_start:'2026-11-02',tickets_delta:25,flags_delta:1};
 current={...state,readings:[...readings,historical]};
 const historyPrint=await endpoint('readings','print'),historyHTML=await historyPrint.text();
 assert.equal(historyPrint.status,200);
 assert(historyHTML.includes('القراءات المصدرة: 27'),'historical summary must count actual exported eligible rows');
 assert(historyHTML.includes('فترة السجل: 2026-11-02 — 2026-11-12'),'historical summary must show full date coverage');
 assert(historyHTML.includes('الإداريون أصحاب القراءات: 26'));
 assert(!historyHTML.includes('Flag Rate: 1.55')&&!historyHTML.includes('Tickets: 3222')&&!historyHTML.includes('Flags: 50'),
  'historical report must not present current-week totals as entire history');
 current={...state,readings};
 console.log('PASS historical print summary matches exported scope and does not confuse weeks');
 const old=readings[0];
 current={...state,readings:[...readings,{...old,id:'more',from_date:'2026-11-13',to_date:'2026-11-13',tickets_delta:null,flags_delta:null,hours:null,rating:null}]};
 const partial=await endpoint('team','xlsx'),wb2=new ExcelJS.Workbook();
 await wb2.xlsx.load(Buffer.from(await partial.arrayBuffer()));
 const row=wb2.worksheets[0].getRow(2);
 assert.equal(row.getCell(1).value,old.admin_name);
 for(const i of [7,8,10])assert(row.getCell(i).value===null,'Never export partial total for '+old.admin_name+' in column '+i);
 console.log('PASS unknown mixed-week deltas stay blank, not misleading known partial sums');
 console.log('PASS EXPORT_END_TO_END');
})().catch(e=>{console.error('EXPORT_QA_FAILED',e.stack||e);process.exit(1)});
