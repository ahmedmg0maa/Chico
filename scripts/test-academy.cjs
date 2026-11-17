const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const m={exports:{}};new Function('require','module','exports',ts.transpileModule(read('src/lib/academy.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,m,m.exports);
const {RULES,permission,LESSONS}=m.exports;
assert.equal(RULES.length,45);assert.equal(new Set(RULES.map(r=>r.code)).size,45);
assert(!RULES.some(r=>r.code==='Media1'));assert.equal(RULES.find(r=>r.code==='Rp9').duration,'60 min');assert.equal(RULES.find(r=>r.code==='Chat8').duration,'60 min');
assert.deepEqual(['Jail','Mute','Ban','Kick'].map(k=>RULES.filter(r=>r.kind===k).length),[15,8,18,4]);
for(const r of RULES){for(const rank of ['Helper','SN.Helper','Moderator']){assert.equal(permission(r,rank),r.kind==='Kick'?'evidence':r.kind==='Ban'?(rank==='Moderator'&&r.duration!=='Permanent'?'allowed':'restricted'):'allowed');}}
assert.deepEqual(LESSONS.map(x=>x.id),['jail','mute']);
const page=read('src/components/v2/ExecutiveCommand.tsx');assert(page.includes("items:['academy']")&&page.includes("tab==='academy'&&<AcademyCenter"));
for(const p of ['src/app/api/academy/route.ts','src/app/api/academy/media/[lesson]/route.ts'])assert(read(p).includes('await requireOwner(req)'));
const ddl=read('db/008_academy_media.sql');assert((ddl.match(/ENABLE ROW LEVEL SECURITY/g)||[]).length===2);
console.log('PASS Academy: 45 source rules; Media1 omitted; exact category counts; rank authorization; evidence required for Kick; two lessons; protected media and standalone nav.');
