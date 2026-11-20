'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {Award,CalendarDays,CheckCircle2,History,Minus,Plus,RotateCcw,Search,ShieldAlert} from 'lucide-react';
import type {Admin} from '@/lib/types';
import {isEvaluatedAdmin} from '@/lib/rules';
import {POINT_CATEGORIES,POINTS_PREVIEW_KEY,addPoints,voidPoints,netPoints,parsePreview,groupFixedShifts,validateAmount,type Category,type PointConfig,type PointsEntry} from '@/lib/points-preview';
import {CommandIcon,RankLabel,RankInsignia} from './ChicoVisualLanguage';
import {LOCAL_ROSTER_HISTORY_KEY,type LocalRosterEvent} from '@/lib/localRoster';

const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const signed=(n:number)=>n>0?'+'+n.toLocaleString('en-US'):n.toLocaleString('en-US');
type Ledger={entries:PointsEntry[];config:PointConfig};
type AuditItem={id:string;action:string;summary:string;created_at:string};
const blank:Ledger={entries:[],config:{}};
export default function AdvancedAdministration({admins,review,section,onTeam}:{admins:Admin[];review:boolean;section:'points'|'shifts'|'activity';onTeam:()=>void}){
 const [ledger,setLedger]=useState<Ledger>(blank),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[revision,setRevision]=useState(1);
 const [adminId,setAdminId]=useState(''),[category,setCategory]=useState<Category>('shift_attended'),[amount,setAmount]=useState(''),[date,setDate]=useState(today),[note,setNote]=useState('');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[showConfig,setShowConfig]=useState(false),[draftConfig,setDraftConfig]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[error,setError]=useState(''),[reverseId,setReverseId]=useState<string|null>(null);
 const [audit,setAudit]=useState<AuditItem[]>([]),[auditStatus,setAuditStatus]=useState<'loading'|'ready'|'error'>('loading');
 useEffect(()=>{
  if(section!=='points')return;
  let active=true;setReady(false);setError('');
  if(review){
   try{setLedger(parsePreview(localStorage.getItem(POINTS_PREVIEW_KEY)));setReady(true);}
   catch{setError('التخزين المحلي غير متاح.');}
   return;
  }
  fetch('/api/points',{cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw Error('LOAD_FAILED');return r.json();})
   .then(v=>{if(active){setLedger({entries:Array.isArray(v.entries)?v.entries:[],config:v.config||{}});setRevision(Number(v.revision)||1);setReady(true);}})
   .catch(()=>{if(active)setError('تعذر تحميل النقاط من السيرفر. أعد المحاولة بعد تحديث الصفحة.');});
  return()=>{active=false;};
 },[section,review]);
 useEffect(()=>{
  if(section!=='activity')return;let active=true;setAuditStatus('loading');
  if(review){try{const events:LocalRosterEvent[]=JSON.parse(localStorage.getItem(LOCAL_ROSTER_HISTORY_KEY)||'[]');setAudit(Array.isArray(events)?events.map((e,i)=>({id:String(i),action:e.kind,summary:[e.previous,e.next].filter(Boolean).join(' ← '),created_at:e.changed_at})).reverse():[]);setAuditStatus('ready');}catch{setAuditStatus('error');}return;}
  fetch('/api/activity',{cache:'no-store',credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(v=>{if(active){setAudit(Array.isArray(v.items)?v.items:[]);setAuditStatus('ready');}}).catch(()=>{if(active)setAuditStatus('error');});
  return()=>{active=false;};
 },[section,review]);
 const eligible=useMemo(()=>admins.filter(isEvaluatedAdmin).sort((a,b)=>a.sort_order-b.sort_order),[admins]);
 const fixed=useMemo(()=>groupFixedShifts(admins),[admins]);
 const categoryInfo=POINT_CATEGORIES.find(c=>c.id===category)!;
 const rows=ledger.entries.filter(e=>(filter==='all'||e.adminId===filter)&&(!query||[e.adminName,e.note,POINT_CATEGORIES.find(c=>c.id===e.category)?.label].join(' ').toLowerCase().includes(query.toLowerCase())));
 function persist(next:Ledger){if(!review||!ready)return false;try{localStorage.setItem(POINTS_PREVIEW_KEY,JSON.stringify(next));setLedger(next);setError('');return true;}catch{setError('تعذر حفظ المسودة في المتصفح. لم تُسجّل العملية.');return false;}}
 async function add(e:FormEvent){
  e.preventDefault();setMessage('');setError('');
  if(!ready||busy||!eligible.some(a=>a.id===adminId))return;
  try{
   if(review){
    const entries=addPoints(ledger.entries,eligible,{adminId,category,amount:Number(amount),date,note},crypto.randomUUID(),new Date().toISOString(),today());
    if(persist({...ledger,entries})){setNote('');setMessage('تم تسجيل العملية في المعاينة المحلية.');}
   }else{
    setBusy(true);
    const r=await fetch('/api/points',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({adminId,category,amount:Number(amount),date,note})});
    const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'SAVE_FAILED');
    setLedger(prev=>({...prev,entries:[data.item,...prev.entries]}));setNote('');
    setMessage('تم تسجيل النقاط وحفظها على السيرفر.');
   }
  }catch{setError('تعذر تسجيل العملية. تأكد من الإداري والتاريخ والقيمة والسبب، ثم حاول مرة أخرى.');}
  finally{setBusy(false);}
 }
 function editConfig(){setDraftConfig(Object.fromEntries(POINT_CATEGORIES.map(c=>[c.id,ledger.config[c.id]?.toString()||''])));setShowConfig(!showConfig);}
 async function saveConfig(e:FormEvent){
  e.preventDefault();setError('');setMessage('');
  if(!ready||busy)return;
  const next:PointConfig={};
  for(const c of POINT_CATEGORIES){
   const raw=(draftConfig[c.id]||'').trim();if(!raw)continue;
   const n=Number(raw);if(!validateAmount(n)){setError('القيم لازم تكون أعدادًا صحيحة موجبة.');return;}
   next[c.id]=n;
  }
  if(review){if(persist({...ledger,config:next})){setShowConfig(false);setMessage('تم حفظ مسودة القواعد. لا تتغير العمليات السابقة.');setAmount(next[category]?.toString()||'');}return;}
  setBusy(true);
  try{
   const r=await fetch('/api/points/config',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({config:next,revision})});
   const data=await r.json();
   if(r.status===409){setError('القواعد تغيرت في جلسة أخرى. حدّث الصفحة قبل حفظ التعديلات.');return;}
   if(!r.ok||!data.ok)throw Error('SAVE_FAILED');
   setLedger(prev=>({...prev,config:next}));setRevision(Number(data.revision));setShowConfig(false);
   setAmount(next[category]?.toString()||'');setMessage('تم حفظ قواعد النقاط على السيرفر. السجلات السابقة لم تتغير.');
  }catch{setError('تعذر حفظ القواعد على السيرفر.');}finally{setBusy(false);}
 }
 async function reverse(id:string){
  if(!ready||busy)return;
  setMessage('');setError('');
  if(review){
   try{if(persist({...ledger,entries:voidPoints(ledger.entries,id,new Date().toISOString())})){setReverseId(null);setMessage('تم إلغاء أثر العملية مع الاحتفاظ بها في السجل.');}}
   catch{setError('تعذر إلغاء العملية.');}
   return;
  }
  setBusy(true);
  try{
   const r=await fetch('/api/points/'+encodeURIComponent(id),{method:'PATCH',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:'VOID_POINTS'})});
   const data=await r.json();if(!r.ok||!data.ok)throw Error('VOID_FAILED');
   setLedger(prev=>({...prev,entries:prev.entries.map(e=>e.id===id?data.item:e)}));
   setReverseId(null);setMessage('تم إلغاء أثر العملية على السيرفر، والعملية محفوظة في السجل.');
  }catch{setError('تعذر إلغاء العملية. يمكن أن تكون أُلغيت مسبقًا من جلسة أخرى.');}
  finally{setBusy(false);}
 }
 if(section==='shifts')return <section className="ct-admin-studio"><header className="ct-admin-head"><div className="ct-workspace-identity"><CommandIcon name="shift"/><div><h2>المناوبات الثابتة</h2><p>من بيانات الفريق المسجلة</p></div></div><button className="v9-quiet-btn" onClick={onTeam}>إدارة الفريق</button></header>
 <div className="ct-admin-metrics"><div><small>المناوبات المحددة</small><strong>{fixed.groups.length}</strong></div><div><small>إداريون لديهم مناوبة</small><strong>{fixed.groups.reduce((sum,g)=>sum+g.members.length,0)}</strong></div><div><small>دون مناوبة محددة</small><strong>{fixed.missing.length}</strong></div></div>
 <div className="ct-shifts-grid">{[...fixed.groups,...(fixed.missing.length?[{label:'غير محددة',members:fixed.missing}]:[])].map(g=><article className="ct-admin-card" key={g.label}><h3><CalendarDays size={17}/>{g.label}<b>{g.members.length}</b></h3>{g.members.map(a=><div className="ct-shift-person" key={a.id}><RankInsignia rank={a.rank} compact/><strong dir="auto">{a.name}</strong><RankLabel rank={a.rank}/></div>)}</article>)}</div>{!fixed.groups.length&&!fixed.missing.length&&<p className="ct-admin-empty">لا توجد أسماء نشطة.</p>}</section>;
 if(section==='activity')return <section className="ct-admin-studio"><header className="ct-admin-head"><div className="ct-workspace-identity"><CommandIcon name="history"/><div><h2>سجل الإجراءات</h2><p>{review?'تغييرات الأسماء والرتب والمناوبات في هذا المتصفح':'آخر 40 إجراءً محفوظًا على الخادم'}</p></div></div></header>{auditStatus==='loading'?<p className="ct-admin-empty">جاري تحميل السجل…</p>:auditStatus==='error'?<p role="alert" className="v9-warning">تعذر تحميل سجل الإجراءات.</p>:audit.length?<div className="ct-audit-list">{audit.map(a=><article key={a.id}><History size={20}/><div><b>{a.action}</b><p>{a.summary}</p></div><time>{Number.isFinite(Date.parse(a.created_at))?new Date(a.created_at).toLocaleString('ar-EG',{timeZone:'Africa/Cairo'}):'—'}</time></article>)}</div>:<p className="ct-admin-empty">لا توجد إجراءات مسجلة.</p>}</section>;
 return <section className="ct-admin-studio"><header className="ct-admin-head"><div className="ct-workspace-identity"><CommandIcon name="rating"/><div><h2>النقاط والمكافآت</h2><p>منفصلة عن إحصائيات اللعبة</p></div></div><button className="v9-quiet-btn" onClick={editConfig} disabled={!ready||busy}>قواعد النقاط</button></header>
 {<>
 {review?<p className="ct-preview-note"><ShieldAlert size={16}/> معاينة محلية قابلة للتجربة — لا تُحفظ على الخادم ولا تؤثر على التقارير.</p>:<p className="ct-preview-note"><CheckCircle2 size={16}/> النظام متصل بالتخزين الآمن. جميع التعديلات محفوظة على السيرفر، والنقاط منفصلة عن إحصائيات اللعبة.</p>}
 <div className="ct-admin-metrics"><div><small>النقاط المضافة</small><strong>{ledger.entries.length?signed(ledger.entries.filter(x=>!x.voidedAt&&x.delta>0).reduce((n,e)=>n+e.delta,0)):'—'}</strong></div><div><small>النقاط المخصومة</small><strong>{ledger.entries.length?signed(ledger.entries.filter(x=>!x.voidedAt&&x.delta<0).reduce((n,e)=>n+e.delta,0)):'—'}</strong></div><div><small>الصافي</small><strong>{ledger.entries.length?signed(netPoints(ledger.entries)):'—'}</strong></div></div>
 {showConfig&&<form className="ct-admin-card ct-config" onSubmit={saveConfig}><h3>{review?'مسودة قيم النقاط':'قواعد النقاط المعتمدة'}</h3><p>اترك القيمة فارغة لو القاعدة لسه غير معتمدة.</p><div className="ct-config-grid">{POINT_CATEGORIES.map(c=><label key={c.id}><span className={c.sign>0?'ct-positive':'ct-negative'}>{c.sign>0?'+':'−'} {c.label}</span><input type="number" min="1" max="100000" step="1" value={draftConfig[c.id]||''} onChange={e=>setDraftConfig(v=>({...v,[c.id]:e.target.value}))} placeholder="غير محدد"/></label>)}</div><button className="v9-primary" type="submit" disabled={busy}>{review?'حفظ المسودة':'حفظ القواعد على السيرفر'}</button></form>}
 <div className="ct-points-grid"><form className="ct-admin-card ct-points-form" onSubmit={add}><h3>تسجيل إجراء</h3><label>الإداري<select value={adminId} required onChange={e=>setAdminId(e.target.value)}><option value="">اختر إداريًا</option>{eligible.map(a=><option value={a.id} key={a.id}>{a.name} — {a.rank}</option>)}</select></label><label>نوع الإجراء<select value={category} onChange={e=>{const c=e.target.value as Category;setCategory(c);setAmount(ledger.config[c]?.toString()||'');}}>{POINT_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.sign>0?'+':'−'} {c.label}</option>)}</select></label><div className="ct-form-pair"><label>عدد النقاط <span className={categoryInfo.sign>0?'ct-positive':'ct-negative'}>{categoryInfo.sign>0?'+':'−'}</span><input required type="number" min="1" max="100000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="غير محدد"/></label><label>تاريخ الإجراء<input type="date" required max={today()} value={date} onChange={e=>setDate(e.target.value)}/></label></div><label>السبب / المرجع<textarea required maxLength={400} rows={3} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="v9-primary" type="submit" disabled={!ready||busy||!adminId||!amount||!note.trim()}>{categoryInfo.sign>0?<Plus size={17}/>:<Minus size={17}/>} {review?'تسجيل في المعاينة':'حفظ النقاط'}</button></form>
 <div className="ct-admin-card"><h3><Award size={20}/> أرصدة الإداريين</h3>{!ledger.entries.some(e=>!e.voidedAt)?<div className="ct-admin-empty">بانتظار أول عملية</div>:<div className="ct-balances">{eligible.filter(a=>ledger.entries.some(e=>e.adminId===a.id&&!e.voidedAt)).sort((a,b)=>netPoints(ledger.entries,b.id)-netPoints(ledger.entries,a.id)).map(a=><div key={a.id}><RankInsignia rank={a.rank} compact/><span>{a.name}</span><b className={netPoints(ledger.entries,a.id)<0?'ct-negative':'ct-positive'}>{signed(netPoints(ledger.entries,a.id))}</b></div>)}</div>}</div></div>
 {message&&<p className="v9-message success" role="status">{message}</p>}{error&&<p className="v9-warning" role="alert">{error}</p>}
 <div className="ct-admin-card ct-ledger"><h3>سجل النقاط</h3><div className="ct-ledger-filters"><input aria-label="بحث في سجل النقاط" placeholder="بحث بالاسم أو السبب" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="فلترة الإداري" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">كل الإداريين</option>{Array.from(new Map(ledger.entries.map(e=>[e.adminId,e.adminName]))).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div>{rows.length?<div className="ct-ledger-list">{rows.map(e=><article key={e.id} data-voided={!!e.voidedAt}><div className="ct-ledger-delta" data-negative={e.delta<0}>{signed(e.delta)}</div><div><b>{e.adminName} · {POINT_CATEGORIES.find(c=>c.id===e.category)?.label}</b><p>{e.note}</p><small>{e.date}{e.voidedAt?' · ملغاة':''}</small></div>{!e.voidedAt&&(reverseId===e.id?<div><button type="button" className="v9-quiet-btn" onClick={()=>void reverse(e.id)} disabled={busy}>تأكيد الإلغاء</button><button type="button" className="v9-quiet-btn" onClick={()=>setReverseId(null)}>رجوع</button></div>:<button className="v9-quiet-btn" type="button" aria-label={'إلغاء العملية '+e.adminName} onClick={()=>setReverseId(e.id)}><RotateCcw size={15}/></button>)}</article>)}</div>:<div className="ct-admin-empty">لا توجد عمليات مطابقة</div>}</div>
 </>}</section>;
}
