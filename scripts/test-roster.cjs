/* Approved roster regression test. No DB, no credentials, no mock statistics. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const file=path.resolve(__dirname,'../src/lib/roster.ts');
const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,require},{filename:file});
const list=mod.exports.APPROVED_ROSTER;
assert.equal(list.length,31,'Official sheet contains exactly 31 admins');
assert.equal(new Set(list.map(x=>x.name.toLowerCase())).size,31,'Names must be unique');
assert.deepEqual(Object.fromEntries(['Helper','SN.Helper','Moderator','Administrator','Responsible'].map(rank=>[rank,list.filter(a=>a.rank===rank).length])),{'Helper':13,'SN.Helper':4,'Moderator':10,'Administrator':3,'Responsible':1});
for(const item of list){
  assert.match(item.name,/^[A-Za-z][A-Za-z0-9_.-]*$/);
  assert.equal(item.admin_level, item.rank==='Helper'||item.rank==='SN.Helper'?1:item.rank==='Moderator'?2:3);
  assert.deepEqual(Object.keys(item).sort(),['admin_level','name','rank']);
}
assert.equal(list.find(x=>x.name==='Bnammoo')?.rank,'Moderator');
assert.equal(list.find(x=>x.name==='Me')?.admin_level,1);
console.log('PASS CHICO official 31-person roster, ranks, levels; no fabricated performance stats');
