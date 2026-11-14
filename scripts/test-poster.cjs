const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const rpath=p=>path.resolve(__dirname,'..',p);
function compile(p,deps={}){
 const file=rpath(p),js=ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,require:n=>deps[n]||require(n),console,Intl,Number,Date},{filename:file});
 return module.exports;
}
const groups=compile('src/lib/report-groups.ts');
const poster=compile('src/components/v2/PremiumPosterRenderer.ts',{'@/lib/report-groups':groups});
const words=[];const ctx={
 createLinearGradient(){return{addColorStop(){}};},
 createRadialGradient(){return{addColorStop(){}};},
 fillText(s,x,y,max){words.push({s:String(s),x,y,max});},
 measureText(s){return{width:String(s).length*12};},
 roundRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},quadraticCurveTo(){},closePath(){},
 fill(){},stroke(){},save(){},restore(){},translate(){},setLineDash(){},drawImage(){}
};
const canvas={width:0,height:0,getContext:()=>ctx};
const row=(name,rank,order,tickets,flags,rate,flagsIncomplete=false)=>({id:String(order),name,rank,order,tickets,flags,rating:rate,flagsIncomplete});
const rows=[
 row('Kararr','Helper',1,3,0,5),
 row('SN.Gaby','SN.Helper',2,133,2,4.9),
 row('Bieso','Helper',3,147,7,4.92),
 row('Rare','Helper',4,201,9,4.94),
 row('SN.Gehad','SN.Helper',5,127,0,4.93),
 row('M.Gambul','Moderator',6,603,10,4.95),
 row('M.Bnammoo','Moderator',7,355,0,4.87),
 row('M.Dark','Moderator',8,225,6,4.87)
];
poster.renderLuxuryPoster(canvas,rows,'2026-11-09 — 2026-11-12',30,29,[null,null,null,null,null,null],
 'إحصائيات الفترة المجمعة',{tickets:3222,flags:50,rating:4.9});
const text=words.map(x=>x.s);
for(const required of ['CHICO','GENERAL TEAM','TICKETS','FLAGS','3222','50','HELPERS','MODERATORS',
 'TOP 3 HELPERS','TOP 3 MODERATORS','Rare','Bieso','SN.Gaby','M.Gambul','M.Bnammoo','M.Dark','Kararr','SN','0']){
 assert(text.includes(required),'poster text missing '+required);
}
for(const forbidden of ['TOTAL STAFF','AVERAGE RATE','HELPERS + SN.HELPERS','CALL','CALLS','HAIL']){
 assert(!text.includes(forbidden),'forbidden CHICO poster label '+forbidden);
}
assert(canvas.width===1560&&canvas.height>1700&&canvas.height<5000,'correct output aspect and dimensions');
const main=words.filter(x=>['TOP 3 HELPERS','TOP 3 MODERATORS'].includes(x.s));
assert.equal(main.length,2);
const noReadings=[row('Kararr','Helper',1,null,null,null),row('M.Dark','Moderator',2,null,null,null)];
words.length=0;
poster.renderLuxuryPoster(canvas,noReadings,'2026-11-14',2,0,[],undefined,{tickets:null,flags:null,rating:null});
const other=words.map(x=>x.s);
assert(other.includes('لا يوجد ترتيب موثق'),'empty ranking should show honest no-result');
assert(other.includes('—'),'missing should remain dash, not zero');
assert(!other.includes('0'),'missing should not be formatted as zero');
console.log('PASS CHICO Phase 3: 1560px PNG-ready canvas, two columns/tops, zero/null accuracy, no fake data or banned badges');
