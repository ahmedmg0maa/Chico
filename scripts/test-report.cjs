const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const assert=require('node:assert/strict');
const modulePath=path.resolve(__dirname,'../src/lib/report-groups.ts');
const source=fs.readFileSync(modulePath,'utf8');
const javascript=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInNewContext(javascript,{module:mod,exports:mod.exports,require},{filename:modulePath});
const build=mod.exports.buildReportGroups;
const entry=(name,rank,tickets,order)=>({name,rank,tickets,order});
const groups=build([
 entry('Kararr','Helper',147,1),
 entry('SN.Gaby','SN.Helper',310,2),
 entry('M.Alhassan','Moderator',88,3),
 entry('A. Marwan','Administrator',999,4),
 entry('General','Responsible',1000,5),
 entry('Rare','Helper',201,6),
 entry('Bieso','Helper',null,7)
]);
assert.equal(groups.length,2);
assert.equal(groups[0].topTitle,'TOP 3 — HELPERS');
assert.equal(groups[1].topTitle,'TOP 3 — MODERATORS');
assert.deepEqual(Array.from(groups[0].rows.map(r=>r.name)),['Kararr','SN.Gaby','Rare','Bieso']);
assert.deepEqual(Array.from(groups[0].topRows.map(r=>r.name)),['SN.Gaby','Rare','Kararr']);
assert.deepEqual(Array.from(groups[1].rows.map(r=>r.name)),['M.Alhassan']);
assert.deepEqual(Array.from(groups[1].topRows.map(r=>r.name)),['M.Alhassan']);
assert(!groups.flatMap(g=>g.rows).some(r=>['A. Marwan','General'].includes(r.name)));
const render=fs.readFileSync(path.resolve(__dirname,'../src/components/v2/DailyReportStudio.tsx'),'utf8');
assert(!render.includes("◆ "), 'No diamond prefix beside SN.Helpers');
assert(!render.includes("label:'TOTAL STAFF'"), 'No staff KPI');
assert(!render.includes("label:'AVG. RATE'"), 'No average rate KPI');
assert(render.includes("label:'TICKETS'")&&render.includes("label:'FLAGS'"),'Both remaining KPI labels exist');
assert(!render.includes("TOP 3 — '+group.name"),'Use shortened Top 3 captions');
assert(render.includes("const itemHeight=rowSpace/Math.max(group.rows.length,1)"),'Moderator rows occupy column height');
assert(render.includes('H=podiumY+410'),'Footer remains outside podium area');
console.log('CHICO report group, rank, visible KPI and layout checks passed');
