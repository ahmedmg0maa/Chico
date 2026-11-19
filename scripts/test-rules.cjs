/* Self-contained rule tests: no database access or secrets. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/lib/rules.ts');
const source=fs.readFileSync(filename,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require}, {filename});
const r=mod.exports;
function check(name,fn){try{fn();process.stdout.write('PASS '+name+'\n');}catch(e){process.stderr.write('FAIL '+name+': '+e.message+'\n');process.exitCode=1;}}
check('Monday week start',()=>{assert.equal(r.weekStart('2026-11-12'),'2026-11-09');assert.equal(r.weekStart('2026-11-09'),'2026-11-09');assert.equal(r.weekStart('2026-11-15'),'2026-11-09');});
check('Monday counter reset',()=>{assert.equal(r.deltaTickets(30,100,false),30);});
check('Same-week change',()=>{assert.equal(r.deltaTickets(125,100,true),25);});
check('Invalid same-week reset',()=>{assert.throws(()=>r.deltaTickets(10,100,true));});
check('Unknown flags baseline remains missing',()=>{assert.equal(r.deltaFlags(20,null,null),null);});
check('Known previous flags',()=>{assert.equal(r.deltaFlags(30,26,null),4);});
check('Owner supplied flag baseline',()=>{assert.equal(r.deltaFlags(15,null,12),3);});
check('Never hide flag counter regression',()=>{assert.throws(()=>r.deltaFlags(3,12,null));});
check('Decimal hours',()=>{assert.equal(r.decimalHours(1.5),1.5);});
check('Rate 25 / 1105',()=>{assert.equal(r.serverFlagRate(25,1105),2.26);});
check('No denominator, no percentage',()=>{assert.equal(r.serverFlagRate(0,null),null);assert.equal(r.serverFlagRate(0,0),null);});
check('Ranking excludes owner and Administrator',()=>{assert.equal(r.isEligibleForTop('Administrator'),false);assert.equal(r.isEligibleForTop('Moderator'),false);});
check('Only Helper and SN.Helper are eligible for Top 3',()=>{assert.equal(r.isEligibleForTop('Helper'),true);assert.equal(r.isEligibleForTop('SN.Helper'),true);assert.equal(r.isEligibleForTop('Moderator'),false);assert.equal(r.isEligibleForTop('Administrator'),false);assert.equal(r.isEligibleForTop('Responsible'),false);});
check('Null is different from recorded zero',()=>{const base={id:'a',admin_id:'b',admin_name:'c',rank:'Helper',from_date:'2026-11-09',to_date:'2026-11-09',week_start:'2026-11-09',flags_counter:null,flags_delta:null,hours:null,rating:null,created_at:'',note:''};const s=r.summarizeReadings([{...base,tickets_delta:null,tickets_counter:null}]);assert.equal(s.tickets,null);const t=r.summarizeReadings([{...base,tickets_delta:0,tickets_counter:0}]);assert.equal(t.tickets,0);});
check('Incomplete flags never show invented rate',()=>{const a={id:'a',admin_id:'b',admin_name:'c',rank:'Helper',from_date:'2026-11-09',to_date:'2026-11-09',week_start:'2026-11-09',flags_counter:25,flags_delta:null,hours:0,rating:4.8,created_at:'',note:'',tickets_delta:120,tickets_counter:120};const s=r.summarizeReadings([a]);assert.equal(s.flags,null);assert.equal(s.rate,null);});
check('Weekly review requires both measured thresholds',()=>{
 for(const [flags,rating,expected] of [[11,4.79,true],[10,4.79,false],[11,4.8,false],[null,4,false],[12,null,false]])assert.equal(r.needsWeeklyReview(flags,rating),expected);
});
check('Archive membership and rank are stable after roster edits',()=>{
 const admin={id:'a',active:false,in_reporting:false,rank:'Administrator'};
 const saved={admin_id:'a',rank:'Moderator',recorded_reporting:true};
 assert.equal(r.eligibleReadings([saved],[admin]).length,1);
 assert.equal(r.eligibleReadings([{...saved,rank:'M.'}],[admin]).length,0);
 assert.equal(r.eligibleReadings([{...saved,recorded_reporting:false}],[admin]).length,0);
});
if(process.exitCode)process.exit(1);
console.log('CHICO rules verified without seeded statistics');
