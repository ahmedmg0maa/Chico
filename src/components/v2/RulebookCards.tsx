'use client';
import {useMemo,useRef,useState} from 'react';
import {BookOpen,Check,ChevronLeft,Copy,Filter,Search,ShieldAlert,X} from 'lucide-react';
import {RULES} from '@/lib/academy';
import {RULE_GROUPS,RULE_TYPE_LABELS,WRITTEN_RULES,type RulebookEntry,type RuleCategory,type RulePunishment} from '@/lib/rulebook';

const allGroups:RuleCategory[]=['RP','CHAT','TCHAT','ABUSE','ALERT','NAME','CLAN'];
const allKinds:RulePunishment[]=['Jail','Mute','Ban','Kick','Other'];
/** Old table contains independent NAME and CLAN entries not provided in full written text.
 * Keep them visible, but visibly distinct from the author's new written source.
 */
const legacyExtras:RulebookEntry[]=RULES.filter(r=>/^(Name|Clan)/i.test(r.code)).map(r=>({
 code:r.code.toUpperCase(),
 title:r.arabic,
 description:r.name+(r.note?' — '+r.note:''),
 penalty:r.kind+' · '+r.duration,
 types:[r.kind],
 category:r.code.toUpperCase().startsWith('NAME')?'NAME':'CLAN',
 source:'legacy'
}));
export const ALL_ACADEMY_RULES:RulebookEntry[]=[...WRITTEN_RULES,...legacyExtras];
const normalize=(s:string)=>s.toLocaleLowerCase('ar-EG').normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').trim();
const groupTitle=(id:RuleCategory)=>RULE_GROUPS.find(g=>g.id===id)?.title||id;
function penaltyTone(r:RulebookEntry){
 if(r.types.includes('Ban'))return 'Ban';
 if(r.types.includes('Mute'))return 'Mute';
 if(r.types.includes('Jail'))return 'Jail';
 if(r.types.includes('Kick'))return 'Kick';
 return 'Other';
}
export default function RulebookCards(){
 const [group,setGroup]=useState<RuleCategory|'all'>('all');
 const [kind,setKind]=useState<RulePunishment|'all'>('all');
 const [search,setSearch]=useState('');
 const [copied,setCopied]=useState('');
 const [selected,setSelected]=useState<RulebookEntry|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const found=useMemo(()=>{
  const needle=normalize(search);
  return ALL_ACADEMY_RULES.filter(r=>
   (group==='all'||r.category===group)&&
   (kind==='all'||r.types.includes(kind))&&
   (!needle||normalize([r.code,r.title,r.description,r.penalty].join(' ')).includes(needle))
  );
 },[group,kind,search]);
 const grouped=allGroups.map(id=>({id,items:found.filter(r=>r.category===id)})).filter(g=>g.items.length);
 const writtenCount=WRITTEN_RULES.length;
 async function copy(value:string,key:string){
  try{await navigator.clipboard.writeText(value);setCopied(key);}
  catch{setCopied('');}
 }
 function show(rule:RulebookEntry){setSelected(rule);dialog.current?.showModal();}
 function close(){dialog.current?.close();setSelected(null);}
 function clear(){setGroup('all');setKind('all');setSearch('');}
 return <div className="rb" dir="rtl">
  <section className="rb-hero" aria-label="مكتبة قوانين العقوبات">
   <div className="rb-hero-copy"><span className="rb-overline"><BookOpen size={16}/> CHICO RULEBOOK</span><h2>قوانين العقوبات</h2><p>القاعدة ومعناها والعقوبة في بطاقة واحدة. ابحث بالكود أو نوع المخالفة، وافتح النص الكامل عند الحاجة.</p></div>
   <div className="rb-summary" aria-label="إجمالي القوانين"><strong>{ALL_ACADEMY_RULES.length}</strong><span>قاعدة معروضة</span><small>{writtenCount} من النص المكتوب · {legacyExtras.length} من الجدول السابق</small></div>
  </section>
  <div className="rb-controls">
   <label className="rb-search"><Search size={20} aria-hidden="true"/><span className="sr-only">ابحث في قوانين العقوبات</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="كود القاعدة، عنوانها، نصها أو العقوبة…" autoComplete="off"/></label>
   <div className="rb-kind-controls" aria-label="تصفية حسب نوع العقوبة"><Filter size={17} aria-hidden="true"/><button type="button" aria-pressed={kind==='all'} onClick={()=>setKind('all')}>كل العقوبات</button>{allKinds.map(k=><button key={k} type="button" aria-pressed={kind===k} onClick={()=>setKind(k)} data-kind={k}>{RULE_TYPE_LABELS[k]}</button>)}</div>
  </div>
  <nav className="rb-groups" aria-label="تصنيفات القوانين"><button type="button" className="rb-group-pill" aria-pressed={group==='all'} onClick={()=>setGroup('all')}>جميع الأقسام <span>{ALL_ACADEMY_RULES.length}</span></button>{RULE_GROUPS.map(g=><button type="button" className="rb-group-pill" key={g.id} aria-pressed={group===g.id} onClick={()=>setGroup(g.id)}><b dir="ltr">{g.id}</b><span>{ALL_ACADEMY_RULES.filter(r=>r.category===g.id).length}</span></button>)}</nav>
  <div className="rb-result-bar"><span role="status">{found.length} قاعدة مطابقة</span>{(group!=='all'||kind!=='all'||search)&&<button type="button" onClick={clear}>إزالة الفلاتر</button>}</div>
  {grouped.length?<div className="rb-collections">{grouped.map(({id,items})=>{
   const info=RULE_GROUPS.find(g=>g.id===id)!;
   return <section key={id} className="rb-collection" data-category={id} aria-label={info.title}>
    <header className="rb-section-head"><div><span className="rb-section-code" dir="ltr">{id}</span><div><h3>{info.title}</h3><p>{info.subtitle}</p></div></div><span className="rb-section-count">{items.length} قاعدة</span></header>
    {id==='NAME'||id==='CLAN'?<p className="rb-legacy-explainer"><ShieldAlert size={16}/> هذه البنود محفوظة من جدول التدريب السابق؛ النصوص الكاملة والعقوبات بحاجة إلى تأكيد من المرجع الجديد.</p>:null}
    <div className="rb-grid">{items.map(r=><article key={r.code} className="rb-card" data-tone={penaltyTone(r)} data-source={r.source}>
     <div className="rb-card-top"><span className="rb-card-code" dir="ltr">{r.code}</span><button className="rb-icon-btn" type="button" onClick={()=>void copy(r.code,r.code)} title={'نسخ '+r.code} aria-label={'نسخ كود '+r.code}>{copied===r.code?<Check size={16}/>:<Copy size={16}/>}</button></div>
     <h4>{r.title}</h4><p className="rb-excerpt">{r.description}</p>
     <div className="rb-penalty"><span className="rb-penalty-heading">{r.source==='legacy'?'العقوبة في الجدول القديم':'العقوبة'}</span><strong>{r.penalty}</strong></div>
     <div className="rb-card-foot"><button type="button" onClick={()=>show(r)} aria-label={'عرض التفاصيل الكاملة لقاعدة '+r.code}>النص الكامل <ChevronLeft size={17}/></button>{r.source==='legacy'&&<span>بحاجة للمراجعة</span>}</div>
    </article>)}</div>
   </section>;
  })}</div>:<div className="rb-empty"><Search size={26}/><strong>لا توجد نتائج مطابقة</strong><p>جرّب البحث بكود مختلف أو امسح الفلاتر.</p><button type="button" onClick={clear}>عرض كل القوانين</button></div>}
  <p className="rb-source-note"><ShieldAlert size={16}/> النص المكتوب الذي أرسلته هو المرجع الحالي لقوانين RP وCHAT وTCHAT وABUSE وALERT. أي اختلاف عن الصور أو الجداول القديمة لا يُحسم تلقائيًا، وتحديد صلاحيات تنفيذ العقوبات يرجع لسياسة الفريق.</p>
  <dialog ref={dialog} className="rb-dialog" onClose={()=>setSelected(null)} aria-label={selected?'تفاصيل القاعدة '+selected.code:'تفاصيل القاعدة'}>
   {selected&&<div className="rb-dialog-content" dir="rtl">
    <header><div><span className="rb-card-code" dir="ltr">{selected.code}</span><span className="rb-dialog-category">{groupTitle(selected.category)}</span></div><button type="button" onClick={close} aria-label="إغلاق التفاصيل"><X size={21}/></button></header>
    <div className="rb-dialog-body"><h2>{selected.title}</h2><h3>نص القاعدة</h3><p>{selected.description}</p><h3>العقوبة المعتمدة في المرجع</h3><div className="rb-dialog-penalty" data-tone={penaltyTone(selected)}>{selected.penalty}</div>{selected.source==='legacy'&&<p className="rb-legacy-explainer">هذا البند مأخوذ من الجدول القديم، وليس من النص المكتوب الجديد. يحتاج مطابقة قبل اعتماده.</p>}</div>
    <footer><button type="button" className="rb-copy-full" onClick={()=>void copy('['+selected.code+'] - '+selected.title+'\n'+selected.description+'\nالعقوبة: '+selected.penalty,'full:'+selected.code)}>{copied==='full:'+selected.code?<Check size={17}/>:<Copy size={17}/>} {copied==='full:'+selected.code?'تم النسخ':'نسخ القاعدة والعقوبة'}</button><button type="button" className="rb-close" onClick={close}>إغلاق</button></footer>
   </div>}
  </dialog>
 </div>;
}
