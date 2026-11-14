const assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),{z}=require('zod');
function load(p,deps={}){
 const file=path.resolve(__dirname,'..',p);
 const c=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const mod={exports:{}};vm.runInNewContext(c,{module:mod,exports:mod.exports,require:n=>deps[n]||require(n),console,Date,Intl},{filename:file});return mod.exports;
}
const rules=load('src/lib/rules.ts');
const excel=load('src/lib/excel-import.ts',{'./rules':rules});
const rid='00000000-0000-4000-8000-000000000001',lid='00000000-0000-4000-8000-000000000002',preview='11111111-1111-4111-8111-111111111111';
const row=(id,name,rank,skip=false)=>({row:skip?3:2,name,admin_id:id,roster_name:name,rank,admin_level:skip?3:1,roster_action:'match',
 from_date:skip?null:'2026-11-09',to_date:skip?null:'2026-11-12',report_entered_on:skip?null:'2026-11-13',
 tickets_counter:skip?null:147,tickets_baseline:skip?null:0,flags_counter:skip?null:10,flags_baseline:skip?null:7,
 hours:skip?null:18,rating:skip?null:4.92,note:'QA verified',skip_reading:skip,time_was_date:false,year_inferred:false});
const rows=[row(rid,'Bieso','Helper'),row(lid,'General','Responsible',true)];
const people={ [rid]:{id:rid,name:'Bieso',rank:'Helper',admin_level:1,in_reporting:true},
 [lid]:{id:lid,name:'General',rank:'Responsible',admin_level:3,in_reporting:false}};
const record={payload:{rows,warnings:[]},source_hash:'sample-sha',committed_at:null};
let inserted=[],updates=[],recomputeIds=[],auditEvents=[],closed=false,overlap=false,duplicate=false;
const response=(body,status=200)=>({body,status});
const mockSQL=async(parts,...vals)=>{
 const q=parts.join('?');
 if(q.includes('SELECT id,payload,committed_at FROM chico_next.import_staging'))return [{id:preview,...record}];
 if(q.includes('SELECT payload,source_hash,committed_at FROM chico_next.import_staging'))return [record];
 if(q.includes('SELECT 1 FROM chico_next.import_staging'))return duplicate?[{x:1}]:[];
 if(q.includes('SELECT id,name,rank,admin_level,in_reporting FROM chico_next.admins'))return [people[vals[0]]].filter(Boolean);
 if(q.includes('SELECT status FROM chico_next.weekly_status'))return closed?[{status:'closed'}]:[];
 if(q.includes('SELECT id FROM chico_next.readings'))return overlap?[{id:'existing'}]:[];
 if(q.includes('INSERT INTO chico_next.readings')){inserted.push(vals);return [];}
 if(q.includes('UPDATE chico_next.admins')){updates.push(vals);return [];}
 if(q.includes('UPDATE chico_next.import_staging')){record.committed_at=new Date().toISOString();return [];}
 if(q.includes('INSERT INTO chico_next.audit')){auditEvents.push(vals);return [];}
 throw Error('Unrecognized mock SQL: '+q.slice(0,150));
};
mockSQL.begin=async f=>f(mockSQL);
const route=load('src/app/api/import/commit/route.ts',{
 zod:{z},
 '@/lib/db':{db:()=>mockSQL,snapshot:async()=>null},
 '@/lib/api':{requireOwner:async()=>null,response,failure:(e)=>{throw e;}},
 '@/lib/rules':rules,
 '@/lib/recompute':{recompute:async(id)=>{recomputeIds.push(id);}},
 '@/lib/excel-import':excel
});
const req=(approved=false)=>({json:async()=>({preview_id:preview,confirm:'IMPORT REVIEWED',approve_roster_sync:approved})});
(async()=>{
 const {body,status}=await route.POST(req());
 assert.equal(status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(body)),{ok:true,inserted:1,created:0,updated:0,leaders:1});
 assert.equal(inserted.length,1);
 assert.equal(recomputeIds.length,1);
 assert.equal(recomputeIds[0],rid);
 assert.equal(updates.length,0);
 assert.equal(auditEvents.length,1);
 let expired=await route.POST(req());
 assert.equal(expired.status,409);
 assert.equal(expired.body.error,'PREVIEW_EXPIRED_OR_USED');
 record.committed_at=null;
 record.payload.rows[0]={...record.payload.rows[0],rank:'SN.Helper'};
 await assert.rejects(()=>route.POST(req()),/ROSTER_CHANGED_REVIEW_AGAIN/);
 record.payload.rows[0]={...record.payload.rows[0],rank:'Helper'};
 closed=true;
 await assert.rejects(()=>route.POST(req()),/WEEK_CLOSED/);
 closed=false;overlap=true;
 await assert.rejects(()=>route.POST(req()),/OVERLAPPING_PERIOD/);
 overlap=false;duplicate=true;
 await assert.rejects(()=>route.POST(req()),/FILE_ALREADY_IMPORTED/);
 console.log('PASS CHICO staged XLSX commit: leader skipped, 1 reading saved, no rank mutation');
 console.log('PASS CHICO expired/used preview, changed ranks, closed-week, overlap and replay protection');
})().catch(e=>{console.error(e);process.exit(1)});
