const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function compile(p){const m={exports:{}};const code=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(require,m,m.exports);return m.exports;}
const rules=compile('src/lib/rules.ts'),groups=compile('src/lib/report-groups.ts');
const r={tickets_delta:100,flags_delta:2,flags_counter:10,hours:5,rating:4.9};
assert.equal(rules.summarizeReadings([r,{...r,tickets_delta:null}]).tickets,null);
assert.equal(rules.summarizeReadings([r,{...r,tickets_delta:null}]).rate,null);
assert.equal(rules.summarizeReadings([r,{...r,flags_delta:null,flags_counter:null}]).flags,null);
assert.equal(rules.summarizeReadings([r,{...r,hours:null}]).hours,null);
assert.equal(rules.summarizeReadings([{...r,tickets_delta:0,flags_delta:0,hours:0}]).tickets,0);
const result=groups.buildReportGroups([{name:'Real',rank:'Helper',order:1,tickets:100},{name:'Zero',rank:'Helper',order:2,tickets:0},{name:'None',rank:'Moderator',order:3,tickets:null}]);
assert.deepEqual(result[0].topRows.map(x=>x.name),['Real']);assert.equal(result[1].topRows.length,0);
const chart=read('src/components/v2/ExecutiveWeeklyChart.tsx');assert(chart.includes('summarizeReadings(data).tickets')&&chart.includes('b.tickets===null')&&chart.includes('segments.filter'));
const main=read('src/components/v2/ExecutiveCommand.tsx');assert(main.includes('dynamic(()=>import(\'./ExecutiveTeamStudio\')')&&main.includes('dynamic(()=>import(\'./ExecutiveOperations\')'));
const config=read('next.config.ts');assert(config.includes("frame-ancestors 'none'")&&config.includes('private, no-store'));
assert(!read('src/lib/api.ts').includes("unavailable':code"));
console.log('PASS final quality: null-safe aggregates, actual zero, positive-only rankings, chart gaps, deferred loading, security headers.');
