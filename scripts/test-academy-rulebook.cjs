const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const modExports={};
new Function('require','exports','module',ts.transpileModule(read('src/lib/rulebook.ts'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText)(require,modExports,{exports:modExports});
const rules=modExports.WRITTEN_RULES;
assert.equal(rules.length,49,'The owner's written rules cover exactly 49 codes');
assert.equal(new Set(rules.map(r=>r.code)).size,49,'Unique codes');
assert.deepEqual(Object.fromEntries(['RP','CHAT','TCHAT','ABUSE','ALERT'].map(g=>[g,rules.filter(r=>r.category===g).length])),{
 RP:17,CHAT:17,TCHAT:2,ABUSE:6,ALERT:7
});
for(const code of ['RP9.1','RP14','RP16','CHAT6','CHAT7','CHAT8','CHAT9','CHAT10','CHAT11','CHAT12','CHAT16','CHAT17','TCHAT1','TCHAT2','ABUSE3.1','ALERT4','ALERT7'])assert(rules.some(r=>r.code===code),code);
for(const r of rules){assert(r.title.length>2&&r.description.length>12&&r.penalty.length>10,r.code);assert(r.types.length>0,r.code);assert.equal(r.source,'written');}
assert.match(rules.find(r=>r.code==='RP11').penalty,/30-60/);
assert.match(rules.find(r=>r.code==='RP14').penalty,/24 ساعة/);
assert.match(rules.find(r=>r.code==='CHAT7').penalty,/10 ساعات/);
assert.match(rules.find(r=>r.code==='CHAT8').penalty,/60 دقيقة/);
assert.match(rules.find(r=>r.code==='TCHAT1').penalty,/60 دقيقة/);
assert.match(rules.find(r=>r.code==='ALERT7').penalty,/الإدارة العليا/);
const ui=read('src/components/v2/RulebookCards.tsx');
const academy=read('src/components/v2/AcademyCenter.tsx');
const style=read('src/components/v2/rulebook.css');
assert(ui.includes('ALL_ACADEMY_RULES')&&ui.includes('legacyExtras')&&ui.includes('source:\'legacy\''));
assert(ui.includes('rb-grid')&&ui.includes('rb-card')&&ui.includes('rb-search')&&ui.includes('rb-dialog'));
assert(ui.includes('navigator.clipboard.writeText')&&ui.includes('showModal()')&&ui.includes('aria-pressed'));
assert(academy.includes("tab==='rules'?<RulebookCards/>")&&!academy.includes('ct-academy-table'));
assert(academy.includes('ct-academy-lessons')&&academy.includes('LESSONS.map')&&academy.includes('video controls'));
assert(style.includes('grid-template-columns')&&style.includes('@media(max-width:700px)')&&style.includes('prefers-reduced-motion'));
console.log('PASS Academy rule cards: 49 written laws, unique codes, protected legacy data, full searchable responsive cards, video lessons intact.');
