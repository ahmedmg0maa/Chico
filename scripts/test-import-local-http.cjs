// Optional isolated integration smoke test. NEVER point this at production.
const assert=require('node:assert/strict');
const fs=require('node:fs'),ExcelJS=require('exceljs');
const base=process.env.CHICO_QA_URL,password=process.env.CHICO_QA_PASSWORD;
if(!base||!password||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('ISOLATED_LOCAL_QA_ONLY');
const fixture=JSON.parse(fs.readFileSync('scripts/test-import-route.cjs','utf8').match(/const fixture=(\[[^\n;]+\]);/)[1]);
const levels={Helper:1,'SN.Helper':1,Moderator:2,Administrator:3,Responsible:3};let cookie='';let excelBytes=null;
async function api(url,method='GET',data){
 const headers={Origin:base};if(cookie)headers.Cookie=cookie;
 if(data&&!(data instanceof FormData))headers['Content-Type']='application/json';
 const response=await fetch(base+url,{method,headers,body:data instanceof FormData?data:data?JSON.stringify(data):undefined});
 return {status:response.status,body:await response.json(),headers:response.headers};
}
async function form(){
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Sheet1');
 sheet.addRow(['Rank / AdminLevel','Name','First Week Tickets','First Week Flags','Total Week Flags From 11/09 To 11/12','Total Week Tickets From 11/09 To 11/12','Total Week Hours From 11/09 To 11/12','Total Week Rate From 11/09 To 11/12']);
 fixture.forEach(r=>sheet.addRow([r[0]+' '+levels[r[0]],r[1],r[2],r[3],r[4],r[5],r[6],r[7]]));
 const bytes=excelBytes||(excelBytes=Buffer.from(await book.xlsx.writeBuffer()));
 const f=new FormData();f.append('file',new File([bytes],'CHICO_QA.xlsx'));f.set('period_year','2026');return f;
}
(async()=>{
 const login=await api('/api/auth','POST',{password});assert.equal(login.status,200);
 cookie=(login.headers.get('set-cookie')||'').split(';')[0];assert(cookie.startsWith('chico_session='));
 const seed=await api('/api/seed','POST',{confirm:'IMPORT NAMES'});assert.equal(seed.status,200);
 const p=await api('/api/import','POST',await form());assert.equal(p.status,200);
 assert.equal(p.body.imported,29);assert.equal(p.body.rosterChanges,3);
 assert.equal(p.body.sourceTotals.people,26);assert.equal(p.body.sourceTotals.tickets,3222);
 assert.equal(p.body.sourceTotals.flags,50);assert.equal(p.body.sourceTotals.hours,259);
 const row=p.body.rows.find(x=>x.source_name==='SN.Gaby');
 assert.equal(row.name,'Gaby');assert.equal(row.row,5);
 const saved=await api('/api/import/commit','POST',{preview_id:p.body.preview_id,confirm:'IMPORT REVIEWED',approve_roster_sync:true});
 assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.inserted,29);assert.equal(saved.body.created,3);
 const state=await api('/api/state');assert.equal(state.status,200);
 assert.equal(state.body.readings.length,29);assert.equal(state.body.summary.tickets,3222);assert.equal(state.body.summary.flags,50);
 const g=state.body.readings.find(r=>r.admin_name==='Gaby'),m=state.body.readings.find(r=>r.admin_name==='Alhassan');
 assert.equal(g.source_row,5);assert.equal(g.source_name,'SN.Gaby');
 assert.equal(m.source_row,18);assert.equal(m.source_name,'M.Alhassan');
 const group=state.body.readings.filter(r=>['Helper','SN.Helper','Moderator'].includes(r.rank));
 const helpers=group.filter(r=>r.rank!=='Moderator').sort((a,b)=>a.source_row-b.source_row);
 const mods=group.filter(r=>r.rank==='Moderator').sort((a,b)=>a.source_row-b.source_row);
 assert.equal(helpers.length,16);assert.equal(mods.length,10);
 assert.deepEqual(helpers.slice(0,4).map(x=>x.source_name),['Ahmedd','Bieso','Coconot','SN.Gaby']);
 assert.deepEqual(mods.slice(0,3).map(x=>x.source_name),['M.Alhassan','M.Bish','M.Bnammoo']);
 const repeated=await api('/api/import','POST',await form());assert.equal(repeated.status,200);
 const replay=await api('/api/import/commit','POST',{preview_id:repeated.body.preview_id,confirm:'IMPORT REVIEWED',approve_roster_sync:false});
 assert.equal(replay.status,409);assert.equal(replay.body.error,'FILE_ALREADY_IMPORTED');
 console.log('PASS ISOLATED AUTH HTTP: Excel->29 saved, 26 eligible, source names & row order, 3222 Tickets, 50 Flags, duplicate guarded');
})().catch(e=>{console.error('ISOLATED_HTTP_QA_FAILED',e.stack||e);process.exitCode=1});
