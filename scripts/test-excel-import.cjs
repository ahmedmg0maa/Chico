const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
function load(file,imports={}){
 const filename=path.resolve(__dirname,'../src/lib/'+file+'.ts');
 const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,require:(name)=>imports[name]||require(name)},{filename});
 return mod.exports;
}
const rules=load('rules'),x=load('excel-import',{'./rules':rules});
const person=(id,name,rank)=>({id,name,rank,admin_level:rank==='Responsible'?3:rank==='Moderator'?2:1,in_reporting:rank!=='Responsible'});
const admins=[person('1','Gaby','SN.Helper'),person('2','Bnammoo','Moderator'),person('3','General','Responsible')];
assert.equal(x.resolvePerson('SN.Gaby','SN.Helper',admins).person?.id,'1');
assert.equal(x.resolvePerson('M.Bnammoo','Moderator',admins).person?.id,'2');
assert.equal(x.resolvePerson('General','Responsible',admins).person?.id,'3');
assert.equal(x.strictDate('2026-11-12'),'2026-11-12');
assert.equal(x.strictDate('11/12/2026'),'2026-11-12');
assert.equal(x.strictDate('2026-11-31'),null);
assert.equal(x.validateCoverage('2026-11-09','2026-11-12'),true);
assert.equal(x.validateCoverage('2026-11-08','2026-11-12'),false);
assert.equal(x.validNumber(4.9,5),4.9);
assert.equal(x.validNumber(5.5,5),null);
assert.equal(x.readDecimalHours(1.5).hours,1.5);
assert.equal(x.readDecimalHours(new Date('1899-12-31T12:00:00.000Z')).hours,1.5);
assert.equal(x.readDecimalHours(new Date('1899-12-31T12:00:00.000Z')).converted,true);
assert.equal(x.readDecimalHours(new Date('2026-11-12T12:00:00.000Z')).invalid,true);
assert.equal(x.readDecimalHours('not a number').invalid,true);

const originalHeaders=[
 'Rank / AdminLevel','Name','First Week Tickets','First Week Flags',
 'Total Week Flags From 11/09 To 11/12','Total Week Tickets From 11/09 To 11/12',
 'Total Week Hours From 11/09 To 11/12','Total Week Rate From 11/09 To 11/12'
].map(x.normalizedExcelHeader);
assert.equal(x.findImportColumn(originalHeaders,'total week flags','flags'),4);
assert.equal(x.findImportColumn(originalHeaders,'first week flags'),3);
assert.equal(x.findImportColumn(originalHeaders,'total week tickets','tickets'),5);
assert.equal(x.findImportColumn(originalHeaders,'first week tickets'),2);
const legacy=x.inferLegacyPeriod(originalHeaders,2026);
assert.equal(legacy.from,'2026-11-09');
assert.equal(legacy.to,'2026-11-12');
const newHeaders=['Name','From Date','To Date','Flags Counter','Flags Baseline'].map(x.normalizedExcelHeader);
assert.equal(x.findImportColumn(newHeaders,'to date','date'),2);
assert.equal(x.findImportColumn(newHeaders,'from date'),1);
const row=(name,skip=false)=>({
 row:2,name,admin_id:null,roster_name:null,rank:skip?'Responsible':'Helper',
 admin_level:skip?3:1,roster_action:skip?'leader':'create',
 from_date:skip?null:'2026-11-09',to_date:skip?null:'2026-11-12',report_entered_on:skip?null:'2026-11-13',
 tickets_counter:skip?null:147,tickets_baseline:skip?null:0,
 flags_counter:skip?null:10,flags_baseline:skip?null:7,
 hours:skip?null:18,rating:skip?null:4.92,note:'test',
 skip_reading:skip,time_was_date:false,year_inferred:false
});
const audit=x.auditImport([row('Bieso'),{...row('General',true),row:3}]);
assert.equal(audit.imported,1);assert.equal(audit.leaders,1);assert.deepEqual(Array.from(audit.issues),[]);
assert.equal(rules.deltaFlags(10,null,7),3);
assert.equal(rules.deltaTickets(147,null,false),147);
assert.equal(rules.serverFlagRate(50,3301),1.51);
console.log('CHICO verified Excel parsing and leader exemption passed');
