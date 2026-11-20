const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
function compile(p,imports={}){
 const js=ts.transpileModule(read(p),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',js)(name=>imports[name]||require(name),module,module.exports);
 return module.exports;
}
const academy=compile('src/lib/academy.ts');
const rulebook=compile('src/lib/rulebook.ts');
const card=compile('src/lib/rule-card-fields.ts',{'./academy':academy,'./rulebook':rulebook});
const entries=[
 ...rulebook.WRITTEN_RULES,
 ...academy.RULES.filter(r=>/^(Name|Clan)/i.test(r.code)).map(r=>({
  code:r.code,title:r.arabic,description:r.note||'التفاصيل غير متوفرة',
  penalty:r.kind+' '+r.duration,source:'legacy',category:r.code.toUpperCase().startsWith('NAME')?'NAME':'CLAN',
  types:[r.kind]
 }))
];
assert.equal(entries.length,58);
assert.equal(new Set(entries.map(r=>card.normalizeCode(r.code))).size,58);
assert.equal(card.displayRuleCode('RP1'),'RP 1');
assert.equal(card.displayRuleCode('RP9.1'),'RP 9.1');
assert.equal(card.displayRuleCode('CHAT16'),'CHAT 16');
assert.equal(card.displayRuleCode('ABUSE3.1'),'ABUSE 3.1');
assert.equal(card.displayRuleCode('TCHAT1'),'TCHAT 1');
for(const r of entries){
 const v=card.getCardCommand(r);
 assert(v.code.length>3&&v.englishName&&v.punishmentCode,r.code);
 assert(!v.englishName.includes('Not listed'),r.code);
 assert(!v.punishmentCode.includes('See full'),r.code);
 assert(v.code.startsWith(r.category+' '),r.code);
}
const rp1=card.getCardCommand(rulebook.WRITTEN_RULES.find(r=>r.code==='RP1'));
assert.deepEqual({code:rp1.code,name:rp1.englishName,punishment:rp1.punishmentCode},
 {code:'RP 1',name:'Deathmatch',punishment:'Jail 20 min'});
assert.equal(rp1.isGameMenuName,true);
assert.equal(card.getCardCommand(rulebook.WRITTEN_RULES.find(r=>r.code==='RP9.1')).punishmentCode,'Ban 12 h');
assert.equal(card.getCardCommand(rulebook.WRITTEN_RULES.find(r=>r.code==='CHAT8')).englishName,'MusicInVoiceChat');
assert.equal(card.getCardCommand(rulebook.WRITTEN_RULES.find(r=>r.code==='CHAT7')).punishmentCode,'Ban 10 days');
assert.equal(rulebook.WRITTEN_RULES.find(r=>r.code==='CHAT7').penalty,'حظر الحساب لمدة 10 ساعات.');
assert.equal(card.getCardCommand(rulebook.WRITTEN_RULES.find(r=>r.code==='CHAT9')).isGameMenuName,false);
assert.equal(card.getCardCommand(rulebook.WRITTEN_RULES.find(r=>r.code==='ALERT7')).punishmentCode,'By senior administration');
const ui=read('src/components/v2/RulebookCards.tsx'),css=read('src/components/v2/rulebook.css');
assert(ui.includes('rb-command-name')&&ui.includes('rb-command-sanction')&&ui.includes('rb-card--compact')&&ui.includes('عرض التفاصيل'));
assert(!ui.includes('rb-arabic-mini')&&!ui.includes('rb-arabic-desc'),'Compact cards must not render Arabic descriptions by default');
assert(ui.includes('rb-dialog-body')&&ui.includes('selected.description')&&ui.includes('selected.penalty'),'Detailed rules must remain available');
assert(!ui.includes('copyCardText')&&!ui.includes('navigator.clipboard')&&!ui.includes('نسخ البطاقة')&&!ui.includes('نسخ كود')&&ui.includes('اسم إنجليزي وصفي'));
assert(css.includes('.rb-card--compact')&&css.includes('min(100%,290px)')&&css.includes('min-height:235px'));
console.log('PASS command cards: 58 cards; English names & sanction notation; readable hierarchy; no copy controls; missing menu names visibly labeled; full written penalties intact.');
