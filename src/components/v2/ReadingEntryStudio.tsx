'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {CalendarDays,CheckCircle2,ChevronDown,Clock3,Download,History,Pencil,Plus,Save,Search,ShieldAlert,Trash2,X} from 'lucide-react';
import {weekStart} from '@/lib/rules';
import type {Reading,State} from '@/lib/types';

type Props={state:State|null;review:boolean;onRefresh:()=>Promise<void>;initialAdminId?:string|null};
type Draft={admin_id:string;from_date:string;to_date:string;report_entered_on:string;tickets_counter:number|null;flags_counter:number|null;flags_baseline:number|null;hours:number|null;rating:number|null;note:string};
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const offset=(date:string,days:number)=>{const d=new Date(date+'T00:00:00.000Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const blank=():Draft=>({admin_id:'',from_date:localDay(),to_date:localDay(),report_entered_on:localDay(),tickets_counter:null,flags_counter:null,flags_baseline:null,hours:null,rating:null,note:''});
const num=(v:number|null,digits=0)=>v===null?'—':v.toLocaleString('en-US',{maximumFractionDigits:digits});
const parse=(s:string)=>s===''?null:Number(s);
const dateText=(r:Reading)=>r.from_date===r.to_date?r.to_date:r.from_date+' ← '+r.to_date;
const errorName=(message:string)=>{
 const known:Record<string,string>={WEEK_CLOSED:'الأسبوع ده مقفول. افتحه من قسم الأسابيع قبل تعديل قراءاته.',OVERLAPPING_PERIOD:'في قراءة محفوظة بتغطي جزءًا من نفس الفترة لهذا الإداري. عدّل القراءة القديمة بدل تكرارها.',DUPLICATE_READING:'تقرير هذا اليوم مسجّل بالفعل.',CROSS_WEEK_NOT_ALLOWED:'الفترة بتعدي يوم الإثنين. سجّل كل أسبوع لوحده لأن Tickets بيتصفّر.',TICKETS_COUNTER_DECREASE_WITHIN_WEEK:'عداد Tickets أقل من آخر قراءة في نفس الأسبوع. راجع التاريخ والقيمة.',FLAGS_COUNTER_DECREASE:'رصيد Flags أقل من آخر قراءة. راجع الرصيد والتاريخ.'};
 return known[message]||message;
};
export default function ReadingEntryStudio({state,review,onRefresh,initialAdminId}:Props){
 const [draft,setDraft]=useState<Draft>(blank);
 const [editing,setEditing]=useState<string|null>(null);
 const [range,setRange]=useState(false);
 const [advanced,setAdvanced]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [historyAdmin,setHistoryAdmin]=useState('');
 const [historyRange,setHistoryRange]=useState<'recent'|'all'>('recent');
 const [historySearch,setHistorySearch]=useState('');
 useEffect(()=>{if(initialAdminId)setDraft(d=>({...d,admin_id:initialAdminId}));},[initialAdminId]);
 const ordered=useMemo(()=>[...(state?.readings||[])].sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)),[state]);
 const previous=useMemo(()=>ordered.filter(r=>r.admin_id===draft.admin_id&&r.id!==editing&&r.to_date<draft.from_date).sort((a,b)=>b.to_date.localeCompare(a.to_date))[0],[ordered,draft.admin_id,draft.from_date,editing]);
 const currentMember=state?.admins.find(a=>a.id===draft.admin_id);
 const filtered=ordered.filter(r=>(!historyAdmin||r.admin_id===historyAdmin)&&(!historySearch.trim()||r.admin_name.toLowerCase().includes(historySearch.trim().toLowerCase())||r.to_date.includes(historySearch.trim()))).slice(0,historyRange==='recent'?30:undefined);
 const update=<K extends keyof Draft>(key:K,value:Draft[K])=>setDraft(d=>({...d,[key]:value}));
 const startNew=()=>{setDraft(blank());setEditing(null);setRange(false);setAdvanced(false);setError('');setNotice('');};
 const startEdit=(r:Reading)=>{
  setDraft({admin_id:r.admin_id,from_date:r.from_date,to_date:r.to_date,report_entered_on:r.report_entered_on||localDay(),tickets_counter:r.tickets_counter,flags_counter:r.flags_counter,flags_baseline:r.flags_baseline,hours:r.hours,rating:r.rating,note:r.note});
  setEditing(r.id);setRange(r.from_date!==r.to_date);setAdvanced(r.flags_baseline!==null||Boolean(r.note));setError('');setNotice('');
  document.getElementById('chico-reading-entry')?.scrollIntoView({behavior:'smooth',block:'start'});
 };
 const setPreset=(kind:'today'|'yesterday'|'three')=>{
  const end=kind==='yesterday'?offset(localDay(),-1):localDay();
  const from=kind==='three'?offset(end,-2):end;
  setDraft(d=>({...d,from_date:from,to_date:end}));setRange(kind==='three');setError('');
 };
 async function request(url:string,method:string,payload:Record<string,unknown>){
  const res=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json();if(!res.ok||data.ok===false)throw new Error(errorName(String(data.error||'تعذر الحفظ')));
 }
 const save=(e:FormEvent)=>{
  e.preventDefault();setError('');setNotice('');
  if(review)return setError('لا يمكن تعديل بيانات المعاينة');
  if(!draft.admin_id)return setError('اختار الإداري');
  if(!draft.from_date||!draft.to_date||!draft.report_entered_on)return setError('حدد التاريخ');
  if(draft.from_date>draft.to_date)return setError('تاريخ البداية لازم يكون قبل النهاية');
  if(weekStart(draft.from_date)!==weekStart(draft.to_date))return setError('الفترة بتعدّي يوم الإثنين؛ احفظ كل أسبوع لوحده بسبب تصفير Tickets.');
  if([draft.tickets_counter,draft.flags_counter,draft.hours,draft.rating].every(x=>x===null))return setError('اكتب قيمة واحدة على الأقل أو ألغِ الإدخال');
  setBusy(true);
  void (async()=>{
   try{
    await request(editing?'/api/readings/'+encodeURIComponent(editing):'/api/readings',editing?'PATCH':'POST',draft as unknown as Record<string,unknown>);
    await onRefresh();setNotice(editing?'تم تحديث القراءة وسجلها بنجاح':'تم حفظ التقرير بالتواريخ اللي اخترتها');
    setEditing(null);setRange(false);setAdvanced(false);setDraft(d=>({...blank(),admin_id:d.admin_id}));
   }catch(err){setError(err instanceof Error?err.message:'تعذر الحفظ');}
   finally{setBusy(false);}
  })();
 };
 const destroy=(r:Reading)=>{
  if(review||busy)return;
  if(!confirm('هتحذف قراءة '+r.admin_name+' عن '+dateText(r)+' ويُعاد حساب الفروق. متأكد؟'))return;
  setBusy(true);setError('');setNotice('');
  void (async()=>{try{await request('/api/readings/'+encodeURIComponent(r.id),'DELETE',{confirm:'DELETE'});await onRefresh();setNotice('تم حذف القراءة وإعادة حساب الفروق مع إنشاء نسخة احتياطية');if(editing===r.id)startNew();}catch(err){setError(err instanceof Error?err.message:'تعذر الحذف');}finally{setBusy(false);}})();
 };
 return <div className="v9-reading-studio">
  <section id="chico-reading-entry" className="x-panel v9-entry-card">
   <header className="v9-entry-heading"><div><small>CHICO / SAVED READINGS</small><h2>{editing?'تعديل تقرير محفوظ':'إضافة تقرير أداء'}</h2><p>اختار الإداري والفترة، وسجّل الأرقام كما ظهرت في اللعبة. الحفظ هيحسب الفرق تلقائيًا.</p></div>{editing&&<button type="button" className="v9-quiet-btn" onClick={startNew}><X size={16}/>إلغاء التعديل</button>}</header>
   <form className="v9-reading-form" onSubmit={save}>
    <div className="v9-reading-step"><b>1</b><span>الإداري وتاريخ التقرير</span></div>
    <label className="v9-wide">الإداري
     <select required disabled={review||busy} value={draft.admin_id} onChange={e=>update('admin_id',e.target.value)}>
      <option value="">اختار إداريًا من الفريق</option>
      {state?.admins.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.name} — {a.rank}</option>)}
     </select>
    </label>
    {currentMember&&<div className="v9-last-reading"><History size={19}/><div><b>{currentMember.name}</b><span>{previous?'آخر قراءة قبل الفترة: '+dateText(previous)+' • Tickets '+num(previous.tickets_counter)+' • Flags '+num(previous.flags_counter):'لا توجد قراءة سابقة قبل الفترة. أول عداد Tickets في الأسبوع يُحسب كبداية الأسبوع، وFlags يحتاج رصيدًا سابقًا معروفًا.'}</span></div></div>}
    <div className="v9-period-toggle" role="group" aria-label="نوع فترة التقرير"><button type="button" className={!range?'active':''} onClick={()=>{setRange(false);update('from_date',draft.to_date);}}>يوم واحد</button><button type="button" className={range?'active':''} onClick={()=>setRange(true)}>فترة يومين أو أكتر</button></div>
    <div className="v9-presets"><button type="button" onClick={()=>setPreset('today')}>النهاردة</button><button type="button" onClick={()=>setPreset('yesterday')}>أمس</button><button type="button" onClick={()=>setPreset('three')}>آخر 3 أيام</button></div>
    <div className="v9-date-grid">
     {range&&<label>بداية الفترة<input type="date" value={draft.from_date} onChange={e=>update('from_date',e.target.value)} disabled={review||busy} required/></label>}
     <label>{range?'نهاية الفترة':'يوم التقرير'}<input type="date" value={draft.to_date} onChange={e=>setDraft(d=>({...d,to_date:e.target.value,...(!range?{from_date:e.target.value}:{})}))} disabled={review||busy} required/></label>
     <label>تاريخ إضافة التقرير <small>حتى لو بتضيف تقرير قديم النهاردة</small><input type="date" value={draft.report_entered_on} onChange={e=>update('report_entered_on',e.target.value)} disabled={review||busy} required/></label>
    </div>
    <div className="v9-input-note"><CalendarDays size={17}/>تاريخ التقرير هو اليوم أو الأيام اللي القراءات بتغطيها. تاريخ الإضافة بيتحفظ بشكل مستقل. ووقت الحفظ الفعلي بيسجله الموقع تلقائيًا.</div>
    <div className="v9-reading-step"><b>2</b><span>الأرقام الموجودة في اللعبة</span></div>
    <div className="v9-number-grid">
     <label>Tickets <small>العداد الحالي، وليس الفرق</small><input type="number" min="0" step="1" disabled={review||busy} placeholder="غير مسجل" value={draft.tickets_counter??''} onChange={e=>update('tickets_counter',parse(e.target.value))}/></label>
     <label>Flags <small>الرصيد التراكمي الحالي</small><input type="number" min="0" step="1" disabled={review||busy} placeholder="غير مسجل" value={draft.flags_counter??''} onChange={e=>update('flags_counter',parse(e.target.value))}/></label>
     <label>TIME <small>ساعات عشرية: 1.5 = ساعة ونصف</small><input type="number" min="0" max="500" step="0.01" disabled={review||busy} placeholder="غير مسجل" value={draft.hours??''} onChange={e=>update('hours',parse(e.target.value))}/></label>
     <label>Rating <small>التقييم من 5</small><input type="number" min="0" max="5" step="0.01" disabled={review||busy} placeholder="غير مسجل" value={draft.rating??''} onChange={e=>update('rating',parse(e.target.value))}/></label>
    </div>
    <button type="button" className="v9-advanced-toggle" aria-expanded={advanced} onClick={()=>setAdvanced(a=>!a)}>خيارات إضافية <ChevronDown size={17}/></button>
    {advanced&&<div className="v9-advanced-fields"><label>رصيد Flags المعروف قبل أول قراءة <small>اكتبه بس لو معروف. لا نفترض إنه صفر.</small><input type="number" min="0" step="1" value={draft.flags_baseline??''} onChange={e=>update('flags_baseline',parse(e.target.value))} disabled={review||busy}/></label><label>ملاحظة (اختياري)<textarea maxLength={600} rows={2} value={draft.note} onChange={e=>update('note',e.target.value)} disabled={review||busy}/></label></div>}
    <footer className="v9-form-actions"><button type="submit" className="v9-primary" disabled={review||busy||!draft.admin_id}><Save size={18}/>{busy?'جارٍ الحفظ…':editing?'حفظ التعديل':'حفظ التقرير'}</button><span>الحقول الفارغة مش صفر، ومش هتتوزع قراءة 3 أيام على أيام منفصلة.</span></footer>
   </form>
   {error&&<div className="v9-message error" role="alert"><ShieldAlert size={18}/>{error}</div>}
   {notice&&<div className="v9-message success" role="status"><CheckCircle2 size={18}/>{notice}</div>}
  </section>
  <section className="x-panel v9-reading-history">
   <header className="v9-entry-heading"><div><small>SAVED HISTORY</small><h2>سجل القراءات والأيام المحفوظة</h2><p>تقدر ترجع لأي تقرير قديم، تعرف الفترة اللي غطاها وإمتى اتضاف، وتعدّله لو الأسبوع لسه مفتوح.</p></div><span className="v9-record-count">{ordered.length} سجل</span></header>
   <div className="v9-history-controls">
    <label><Search size={17}/><input value={historySearch} onChange={e=>setHistorySearch(e.target.value)} placeholder="بحث بالاسم أو التاريخ" aria-label="بحث في السجل"/></label>
    <select aria-label="فلتر الإداري" value={historyAdmin} onChange={e=>setHistoryAdmin(e.target.value)}><option value="">كل الإداريين</option>{state?.admins.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <select aria-label="عدد السجلات المعروضة" value={historyRange} onChange={e=>setHistoryRange(e.target.value as 'recent'|'all')}><option value="recent">آخر 30 تقرير</option><option value="all">كل السجل</option></select>
   </div>
   <div className="v9-history-table-wrap"><table className="v9-history-table"><thead><tr><th>الإداري</th><th>الفترة المغطاة</th><th>أُضيف في</th><th>Tickets</th><th>Flags</th><th>TIME</th><th>Rating</th><th>الإجراءات</th></tr></thead>
    <tbody>{filtered.map(r=><tr key={r.id}><td><b>{r.admin_name}</b></td><td>{dateText(r)}{r.from_date!==r.to_date&&<small>فترة مجمّعة</small>}</td><td title={'حُفظ فعليًا: '+new Date(r.created_at).toLocaleString('ar-EG')}>{r.report_entered_on}</td><td>{num(r.tickets_delta)}</td><td>{num(r.flags_delta)}</td><td>{r.hours===null?'—':num(r.hours,2)+' h'}</td><td>{num(r.rating,2)}</td><td><button type="button" disabled={review||busy} onClick={()=>startEdit(r)} title="تعديل القراءة" aria-label={'تعديل '+r.admin_name}><Pencil size={17}/></button><button className="danger" type="button" disabled={review||busy} onClick={()=>destroy(r)} title="حذف القراءة" aria-label={'حذف '+r.admin_name}><Trash2 size={17}/></button></td></tr>)}</tbody>
   </table></div>
   {!filtered.length&&<div className="v9-empty-history"><History size={27}/><b>مفيش قراءات محفوظة مطابقة</b><span>بعد أول تقرير حقيقي هتظهر القراءات هنا بالتاريخ.</span></div>}
  </section>
 </div>;
}
