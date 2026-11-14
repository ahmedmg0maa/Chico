const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),ExcelJS=require('exceljs');
const fixture=[["Helper","Ahmedd",0,0,5,52,6.5,4.63],["Helper","Bieso",0,7,10,147,18,4.92],["Helper","Coconot",0,33,35,60,8,4.86],["SN.Helper","SN.Gaby",0,88,91,133,8,4.9],["SN.Helper","SN.Gehad",0,32,33,127,10,4.93],["Helper","Kararr",0,37,37,3,0,5],["Helper","Kyrlous",0,234,234,2,0,5],["Helper","Leogirl",0,21,21,97,14,4.95],["Helper","Mohamad",0,24,24,50,12,5],["SN.Helper","SN.Moody",0,43,43,25,1,4.96],["Helper","Nsnas",0,0,1,26,3.5,4.92],["Helper","Pot",0,2,2,21,1,4.8],["Helper","Rare",0,15,17,201,23,4.94],["Helper","Shahd",0,3,4,68,6,4.85],["SN.Helper","SN.Sherlock",0,242,242,73,5,5],["Helper","Me",0,18,22,77,6,4.63],["Moderator","M.Alhassan",0,174,175,65,12,4.83],["Moderator","M.Bish",0,194,198,56,5,4.71],["Moderator","M.Bnammoo",0,145,152,355,20,4.87],["Moderator","M.Dark",0,398,403,225,18,4.87],["Moderator","M.Darklight",0,126,126,155,12,4.99],["Moderator","M.Elyas",0,354,355,201,16,4.94],["Moderator","M.Gambul",0,380,384,603,24,4.95],["Moderator","M.Haitham",0,375,377,95,8,4.9],["Moderator","M.Sirbos",0,247,248,85,10,4.95],["Moderator","M.Zeroo",0,343,346,220,12,4.93],["Administrator","A. Marwan",0,255,255,5,4,4.8],["Administrator","A. Bashar",0,486,486,72,18,4.98],["Administrator","A. Nar",0,13,13,2,2,5],["Responsible","General",null,null,null,null,null,null]];
const rankLevel={Helper:1,'SN.Helper':1,Moderator:2,Administrator:3,Responsible:3};
function compile(pathName,required) {
 const full=path.resolve(__dirname,'..',pathName);
 const js=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,require:(name)=>required[name]||require(name),
  File,FormData,Buffer,Date,Intl,console,URL,TextEncoder,TextDecoder},{filename:full});
 return module.exports;
}
const rules=compile('src/lib/rules.ts',{});
const excel=compile('src/lib/excel-import.ts',{'./rules':rules});
const roster=fixture.map((r,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),name:r[1],rank:r[0],admin_level:rankLevel[r[0]],in_reporting:r[0]!=='Responsible'}));
let staged=null;
const sql=async(parts,...values)=>{
 const q=parts.join('?');
 if(q.includes('FROM chico_next.admins'))return roster;
 if(q.includes('INSERT INTO chico_next.import_staging')){staged=JSON.parse(values[1]);return [{id:'11111111-1111-4111-8111-111111111111'}];}
 if(q.includes('DELETE FROM chico_next.import_staging'))return [];
 throw Error('Unknown fake SQL: '+q.slice(0,120));
};
const route=compile('src/app/api/import/route.ts',{
 'exceljs':ExcelJS,
 '@/lib/db':{db:()=>sql},
 '@/lib/api':{requireOwner:async()=>null,response:(body,status=200)=>({body,status}),failure:(err)=>{throw err;}},
 '@/lib/excel-import':excel
});
async function parse(options={}){
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('CHICO_IMPORT');
 ws.addRow(['Name','Rank','AdminLevel','From Date','To Date','Report Entered On','Tickets Counter','Tickets Baseline','Flags Counter','Flags Baseline','TIME','Rating']);
 fixture.forEach((r,i)=>{
  const level=rankLevel[r[0]];
  const role=options.badRanks&&r[1]==='Kararr'?'SN.Helper':r[0];
  const time=options.dateTime&&r[1]==='Bieso'?new Date('1899-12-31T12:00:00.000Z'):r[6];
  ws.addRow([r[1],role,level,'2026-11-09','2026-11-12','2026-11-13',r[5],r[2],r[4],r[3],time,r[7]]);
 });
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 const file=new File([buffer],'CHICO_IMPORT.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const formData=new FormData();formData.set('file',file);
 return route.POST({formData:async()=>formData});
}
(async()=>{
 const {body,status}=await parse();
 assert.equal(status,200);
 assert.equal(body.rows.length,30);
 assert.equal(body.imported,29);
 assert.equal(body.leaders,1);
 assert.equal(body.rosterChanges,0);
 assert.deepEqual(Array.from(body.warnings),[]);
 assert.equal(body.rows.find(r=>r.name==='General').skip_reading,true);
 assert.equal(body.rows.find(r=>r.name==='Kararr').rank,'Helper');
 assert.equal(body.rows.find(r=>r.name==='M.Alhassan').rank,'Moderator');
 assert.equal(body.rows.find(r=>r.name==='A. Marwan').rank,'Administrator');
 assert(body.rows.filter(r=>!r.skip_reading).every(r=>r.from_date==='2026-11-09'&&r.to_date==='2026-11-12'));
 const sum=(rows,key)=>rows.reduce((a,r)=>a+(r[key]??0),0);
 const included=body.rows.filter(r=>!r.skip_reading&&['Helper','SN.Helper','Moderator'].includes(r.rank));
 assert.equal(sum(body.rows,'tickets_counter'),3301);
 assert.equal(sum(included,'tickets_counter'),3222);
 assert.equal(body.rows.reduce((a,r)=>a+(r.flags_counter===null||r.flags_baseline===null?0:r.flags_counter-r.flags_baseline),0),50);
 assert.equal(sum(body.rows,'hours'),283);
 assert.equal(sum(included,'hours'),259);
 assert(staged?.rows?.length===30,'staged preview must retain all rows');
 const stale=await parse({badRanks:true});
 assert.equal(stale.body.rows.find(r=>r.name==='Kararr').rank,'Helper');
 assert.equal(stale.body.rows.find(r=>r.name==='Kararr').roster_action,'match');
 assert(stale.body.notices.some(x=>x.includes('Excel says SN.Helper but approved roster says Helper')));
 assert.equal(stale.body.rosterChanges,0);
 const dated=await parse({dateTime:true});
 assert.equal(dated.body.rows.find(r=>r.name==='Bieso').hours,1.5);
 assert(dated.body.notices.some(x=>x.includes('TIME date-formatted cell converted to 1.5')));
 console.log('PASS CHICO 30-row XLSX source fixture => 29 readings + 1 General, exact totals and stable roster');
 console.log('PASS CHICO stale rank protection and date-formatted TIME review');
})().catch(e=>{console.error(e);process.exit(1)});
