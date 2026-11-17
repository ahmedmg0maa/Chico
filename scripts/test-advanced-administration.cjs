const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function compile(name,imports={}){const source=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('require','module','exports',source)(n=>imports[n]||require(n),m,m.exports);return m.exports;}
const rules=compile('src/lib/rules.ts');
const p=compile('src/lib/points-preview.ts',{'./rules':rules});
const admins=[{id:'a',name:'Helper A',rank:'Helper',active:true,in_reporting:true,sort_order:1,shift_label:'Morning'},{id:'b',name:'Senior B',rank:'SN.Helper',active:true,in_reporting:true,sort_order:2,shift_label:'Morning'},{id:'m',name:'Moderator',rank:'Moderator',active:true,in_reporting:true,sort_order:3},{id:'lead',name:'General',rank:'Responsible',active:true,in_reporting:true,sort_order:4},{id:'old',name:'Archived',rank:'Helper',active:false,in_reporting:true,sort_order:5,shift_label:'Night'}];
const now='2026-11-17T12:00:00Z',today='2026-11-17',d={adminId:'a',category:'shift_attended',amount:7,date:today,note:'test'};
assert.equal(p.POINT_CATEGORIES.length,7);assert(p.POINT_CATEGORIES.every(c=>!('amount' in c)));
let rows=p.addPoints([],admins,d,'one',now,today);
rows=p.addPoints(rows,admins,{...d,category:'warning',amount:3},'two',now,today);
assert.equal(p.netPoints(rows,'a'),4);
assert.throws(()=>p.addPoints(rows,admins,d,'one',now,today));
for(const invalid of [{amount:0},{amount:1.5},{amount:-2},{date:'2026-11-18'},{date:'2026-02-30'},{adminId:'lead'},{adminId:'old'},{note:''}])assert.throws(()=>p.addPoints(rows,admins,{...d,...invalid},'invalid',now,today),JSON.stringify(invalid));
rows=p.voidPoints(rows,'two',now);assert.equal(p.netPoints(rows),7);assert.equal(rows.length,2);assert.throws(()=>p.voidPoints(rows,'two',now));
const snapshot=p.parsePreview(JSON.stringify({entries:rows,config:{warning:9,shift_attended:0}}));assert.equal(snapshot.entries.length,2);assert.deepEqual(snapshot.config,{warning:9});assert.equal(p.netPoints(snapshot.entries),7);
const groups=p.groupFixedShifts(admins);assert.equal(groups.groups.length,1);assert.equal(groups.groups[0].members.length,2);assert.equal(groups.missing.length,2);
assert.deepEqual(p.parsePreview(null),{entries:[],config:{}});assert.deepEqual(p.parsePreview('bad json'),{entries:[],config:{}});
console.log('PASS advanced administration: unassigned rules, explicit positive/negative entries, eligibility, dates, reversal history, fixed shifts, local persistence.');
