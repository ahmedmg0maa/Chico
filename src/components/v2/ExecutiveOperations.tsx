'use client';

import {useState, type FormEvent} from 'react';
import {Activity, AlertTriangle, Archive, BarChart3, CalendarDays, CheckCircle2, Download, FileSpreadsheet, Flag, Pencil, Plus, Save, Shield, Ticket, Trash2, Upload, Users} from 'lucide-react';
import type {Admin, Reading, State, Rank} from '@/lib/types';
import {RANKS} from '@/lib/types';

export type OperationTab = 'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings';
type Props = {tab:OperationTab;state:State|null;review:boolean;onRefresh:()=>Promise<void>};
type ReadForm={admin_id:string;from_date:string;to_date:string;tickets_counter:number|null;flags_counter:number|null;flags_baseline:number|null;hours:number|null;rating:number|null;note:string};
type Imported={row:number;name:string;admin_id:string|null;date:string|null;tickets_counter:number|null;flags_counter:number|null;hours:number|null;rating:number|null};
type ImportView={preview_id:string;filename:string;rows:Imported[];warnings:string[];requiresConfirmation:boolean};
const cairoDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const emptyReading=():ReadForm=>({admin_id:'',from_date:cairoDate(),to_date:cairoDate(),tickets_counter:null,flags_counter:null,flags_baseline:null,hours:null,rating:null,note:''});
const fmt=(n:number|null|undefined,places=2)=>n===null||n===undefined||!Number.isFinite(n)?'غير مسجّل':new Intl.NumberFormat('en-US',{maximumFractionDigits:places}).format(n);
const fieldValue=(n:number|null)=>n===null?'':String(n);
const asNumber=(v:string)=>v===''?null:Number(v);
async function api<T>(url:string,method='GET',data?:Record<string,unknown>|FormData):Promise<T>{
 const multipart=data instanceof FormData;
 const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:multipart?undefined:{'Content-Type':'application/json'},body:data===undefined?undefined:multipart?data:JSON.stringify(data)});
 const contentType=response.headers.get('content-type')||'';
 if(!contentType.includes('application/json'))throw new Error('الخادم لم يُرجع استجابة صحيحة');
 const payload=await response.json();
 if(!response.ok||payload.ok===false)throw new Error(String(payload.error||'تعذّر تنفيذ العملية'));
 return payload as T;
}
function Head({en,title,description}:{en:string;title:string;description:string}){
 return <section className="x-titleband"><span className="x-kicker">{en}</span><h1>{title}</h1><p>{description}</p></section>;
}
function Empty({text}:{text:string}){return <div className="x-empty"><Activity size={25}/><b>{text}</b></div>;}
function Hint({review}:{review:boolean}){return review?<div className="x-op-hint"><Shield size={18}/>هذه معاينة تصميم منفصلة: النماذج غير متصلة ولا تحفظ بيانات حقيقية.</div>:null;}
function DateRange({reading}:{reading:Reading}){return <span className="x-op-date">{reading.from_date===reading.to_date?reading.to_date:reading.from_date+' — '+reading.to_date}</span>;}
function Metric({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="x-op-metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;}

export function ExecutiveTeamManager({state,review,onRefresh}:{state:State|null;review:boolean;onRefresh:()=>Promise<void>}){
 const [selected,setSelected]=useState<string|null>(null);
 const [name,setName]=useState('');
 const [rank,setRank]=useState<Rank>('Helper');
 const [active,setActive]=useState(true);
 const [inReporting,setInReporting]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const editing=state?.admins.find(a=>a.id===selected);
 const openEdit=(a:Admin)=>{setSelected(a.id);setName(a.name);setRank(a.rank);setActive(a.active);setInReporting(a.in_reporting);setError('');setMessage('');};
 const reset=()=>{setSelected(null);setName('');setRank('Helper');setActive(true);setInReporting(true);};
 const run=async(fn:()=>Promise<unknown>)=>{
  if(review)return;
  setBusy(true);setError('');setMessage('');
  try{await fn();await onRefresh();reset();setMessage('تم حفظ التغيير ومراجعة البيانات المحدثة');}
  catch(e){setError(e instanceof Error?e.message:'تعذّر الحفظ');}
  finally{setBusy(false);}
 };
 const submit=(e:FormEvent)=>{e.preventDefault();void run(()=>api(selected?'/api/roster/'+selected:'/api/roster',selected?'PATCH':'POST',selected?{name:name.trim(),rank,active,in_reporting:inReporting}:{name:name.trim(),rank}));};
 const remove=()=>{
  if(!selected||review)return;
  if(window.prompt('سيُحذف الإداري وجميع سجلاته بعد إنشاء نسخة احتياطية. اكتب DELETE للتأكيد')!=='DELETE')return;
  void run(()=>api('/api/roster/'+selected,'DELETE',{confirm:'DELETE'}));
 };
 return <section className="x-panel x-op-card">
  <div className="x-op-cardhead"><Users size={20}/><h2>إدارة الأسماء والرتب</h2><small>إضافة · تعديل · حذف</small></div>
  <Hint review={review}/>
  <form className="x-op-form" onSubmit={submit}>
   <label>اسم الإداري<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} disabled={review||busy} placeholder="اكتب الاسم كما يظهر في اللعبة"/></label>
   <label>الرتبة<select value={rank} onChange={e=>setRank(e.target.value as Rank)} disabled={review||busy}>{RANKS.map(r=><option key={r}>{r}</option>)}</select></label>
   {selected&&<><label className="x-op-check"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} disabled={busy||review}/>نشط</label><label className="x-op-check"><input type="checkbox" checked={inReporting} onChange={e=>setInReporting(e.target.checked)} disabled={busy||review}/>يظهر في التقارير</label></>}
   <div className="x-op-actions"><button className="x-primary" type="submit" disabled={review||busy||!name.trim()}><Save size={17}/>{editing?'حفظ تعديلات الإداري':'إضافة إداري'}</button>{selected&&<><button className="x-secondary" type="button" onClick={reset}>إلغاء التعديل</button><button className="x-op-danger" type="button" onClick={remove} disabled={busy||review}><Trash2 size={16}/>حذف</button></>}</div>
  </form>
  {!!state?.admins.length&&<div className="x-op-mini-list">{state.admins.map(a=><button key={a.id} disabled={review||busy} type="button" onClick={()=>openEdit(a)}><Pencil size={13}/><b dir="auto">{a.name}</b><span>{a.rank}</span></button>)}</div>}
  {message&&<p className="x-op-success"><CheckCircle2 size={16}/>{message}</p>}{error&&<p className="x-op-error"><AlertTriangle size={16}/>{error}</p>}
 </section>;
}
export default function ExecutiveOperations({tab,state,review,onRefresh}:Props){
 const [reading,setReading]=useState<ReadForm>(emptyReading);
 const [editing,setEditing]=useState<string|null>(null);
 const [file,setFile]=useState<File|null>(null);
 const [importView,setImportView]=useState<ImportView|null>(null);
 const [acceptedImport,setAcceptedImport]=useState(false);
 const [week,setWeek]=useState<string>('');
 const [closeNote,setCloseNote]=useState('');
 const [ack,setAck]=useState(false);
 const [phrase,setPhrase]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [backupList,setBackupList]=useState<{id:string;label:string;created_at:string}[]>([]);
 const [reportType,setReportType]=useState<'summary'|'watchlist'>('summary');
 const summary=state?.summary;
 const records=(state?.readings||[]).filter(r=>r.week_start===summary?.week_start);
 const activeWeek=week||summary?.week_start||'';
 const currentWeek=state?.weeks.find(w=>w.week_start===activeWeek);
 const edit=(r:Reading)=>{setEditing(r.id);setReading({admin_id:r.admin_id,from_date:r.from_date,to_date:r.to_date,tickets_counter:r.tickets_counter,flags_counter:r.flags_counter,flags_baseline:null,hours:r.hours,rating:r.rating,note:r.note});setError('');};
 const perform=async(fn:()=>Promise<unknown>,message='تم حفظ العملية بنجاح')=>{
  if(review){setError('التعديل غير متاح في المعاينة');return;}
  setBusy(true);setError('');setSuccess('');
  try{await fn();await onRefresh();setSuccess(message);}
  catch(e){setError(e instanceof Error?e.message:'تعذّر تنفيذ العملية');}
  finally{setBusy(false);}
 };
 const submitReading=(e:FormEvent)=>{e.preventDefault();if(!reading.admin_id){setError('اختار الإداري أولًا');return;}
  if(reading.from_date>reading.to_date){setError('تاريخ البداية لا يمكن أن يلي النهاية');return;}
  void perform(async()=>{await api(editing?'/api/readings/'+editing:'/api/readings',editing?'PATCH':'POST',reading);setEditing(null);setReading(emptyReading());},'تم حفظ القراءة وإعادة حساب الفروق');
 };
 const deleteReading=(r:Reading)=>{if(review||window.prompt('حذف القراءة سيعيد حساب الفروق. اكتب DELETE للتأكيد')!=='DELETE')return;
  void perform(()=>api('/api/readings/'+r.id,'DELETE',{confirm:'DELETE'}),'حُذفت القراءة وأُعيد الحساب');
 };
 const previewExcel=async()=>{
  if(!file||review)return;
  setBusy(true);setError('');setSuccess('');setImportView(null);setAcceptedImport(false);
  try{const body=new FormData();body.append('file',file);const view=await api<ImportView>('/api/import','POST',body);setImportView(view);}
  catch(e){setError(e instanceof Error?e.message:'تعذّرت معاينة Excel');}
  finally{setBusy(false);}
 };
 const commitExcel=()=>{if(!importView||!acceptedImport||importView.warnings.length)return;
  void perform(async()=>{await api('/api/import/commit','POST',{preview_id:importView.preview_id,confirm:'IMPORT REVIEWED'});setImportView(null);setFile(null);setAcceptedImport(false);},'تم الاستيراد بعد المراجعة');
 };
 const changeWeek=(status:'open'|'closed')=>{
  if(!ack||!activeWeek)return;
  const day=new Date(activeWeek+'T00:00:00Z');
  if(Number.isNaN(day.getTime())||day.getUTCDay()!==1){setError('اختار تاريخ يوم الإثنين كبداية للأسبوع');return;}
  void perform(()=>api('/api/week','POST',{week:activeWeek,status,confirm:true,note:closeNote}),'تم تحديث حالة الأسبوع وحفظها');
 };
 const doSeed=()=>{if(window.prompt('استيراد الأسماء والرتب فقط لفريق فارغ. اكتب IMPORT NAMES للتأكيد')!=='IMPORT NAMES')return;
  void perform(()=>api('/api/seed','POST',{confirm:'IMPORT NAMES'}),'تم استيراد الأسماء فقط دون إحصائيات');
 };
 const doReset=(scope:'statistics'|'everything')=>{const required=scope==='statistics'?'RESET STATS':'DELETE ALL';if(phrase!==required)return;
  if(window.prompt('عملية خطيرة: اكتب '+required+' مرة ثانية للتأكيد')!==required)return;
  void perform(()=>api('/api/reset','POST',{scope,phrase:required}),'نُفذ التصفير بعد إنشاء نسخة احتياطية');
 };
 const loadBackups=async()=>{setBusy(true);setError('');
  try{const data=await api<{backups:{id:string;label:string;created_at:string}[]}>('/api/backup');setBackupList(data.backups);}
  catch(e){setError(e instanceof Error?e.message:'تعذر تحميل النسخ');}finally{setBusy(false);}
 };
 const exportReport=()=>{
  if(!summary||review)return;
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#080b11';ctx.fillRect(0,0,1600,900);ctx.fillStyle='#c69a55';ctx.fillRect(0,0,1600,9);
  ctx.fillStyle='#f4d99d';ctx.font='bold 48px Georgia';ctx.fillText('CHICO GENERAL TEAM',84,90);
  ctx.font='23px Arial';ctx.fillStyle='#aaa8b6';ctx.fillText('ONE STATE / CHICO ME  ·  WEEK '+summary.week_start,86,130);
  ctx.fillStyle='#fff0ce';ctx.font='bold 36px Arial';ctx.fillText(reportType==='summary'?'WEEKLY OPERATIONS':'TEAM WATCHLIST',86,215);
  const items=reportType==='summary'?[['TICKETS',fmt(summary.tickets)],['FLAGS',fmt(summary.flags)],['SERVER FLAG RATE',fmt(summary.rate)+'%'],['AVERAGE RATING',fmt(summary.rating)]]:[['TOTAL ADMINS',fmt(summary.members)],['WITH READINGS',fmt(summary.reported)],['MISSING',fmt(summary.missing)],['ALERTS',fmt(summary.alerts.length)]];
  items.forEach(([label,value],i)=>{const x=86+(i%2)*720,y=290+Math.floor(i/2)*212;ctx.fillStyle='#171c27';ctx.fillRect(x,y,680,170);ctx.strokeStyle='#6b5739';ctx.strokeRect(x,y,680,170);ctx.fillStyle='#aab1bf';ctx.font='22px Arial';ctx.fillText(label,x+26,y+48);ctx.fillStyle='#ffe3a6';ctx.font='bold 53px Arial';ctx.fillText(value,x+26,y+122);});
  ctx.font='19px Arial';ctx.fillStyle='#c7a46d';ctx.fillText('Only recorded data · Missing values are not zero · CHICO ME',86,835);
  const save=()=>{canvas.toBlob(blob=>{if(!blob)return;const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download='CHICO_'+reportType+'_'+summary.week_start+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');};
  const logo=new Image();logo.onload=()=>{ctx.drawImage(logo,1330,30,180,158);save();};logo.onerror=save;logo.src='/assets/chico-wolf-safe-512.png';
 };
 const controls=<>{error&&<p role="alert" className="x-op-error"><AlertTriangle size={17}/>{error}</p>}{success&&<p role="status" className="x-op-success"><CheckCircle2 size={17}/>{success}</p>}</>;
 if(tab==='updates')return <>
  <Head en="CHICO / GAME READINGS" title="تسجيل التحديثات" description="قراءات فعلية من اللعبة مع تاريخ بداية ونهاية لكل فترة؛ لا توزيع افتراضي على الأيام."/>
  <Hint review={review}/>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><Plus size={20}/><h2>{editing?'تعديل قراءة مسجلة':'إضافة قراءة جديدة'}</h2></div>
   <form className="x-op-form" onSubmit={submitReading}>
    <label>الإداري<select required disabled={review||busy} value={reading.admin_id} onChange={e=>setReading(v=>({...v,admin_id:e.target.value}))}><option value="">اختار إداري</option>{state?.admins.map(a=><option value={a.id} key={a.id}>{a.name} — {a.rank}</option>)}</select></label>
    {([['from_date','من تاريخ'],['to_date','إلى تاريخ']] as const).map(([key,label])=><label key={key}>{label}<input type="date" required disabled={review||busy} value={reading[key]} onChange={e=>setReading(v=>({...v,[key]:e.target.value}))}/></label>)}
    {([['tickets_counter','Tickets — العداد الحالي','1'],['flags_counter','Flags — الرصيد التراكمي','1'],['flags_baseline','رصيد Flags السابق عند البداية','1'],['hours','TIME — ساعات عشرية','0.01'],['rating','Rating من 5','0.01']] as const).map(([key,label,step])=><label key={key}>{label}<input type="number" min="0" max={key==='rating'?'5':undefined} step={step} disabled={review||busy} placeholder="غير مسجل" value={fieldValue(reading[key])} onChange={e=>setReading(v=>({...v,[key]:asNumber(e.target.value)}))}/></label>)}
    <label className="x-op-full">ملاحظات<input maxLength={600} value={reading.note} onChange={e=>setReading(v=>({...v,note:e.target.value}))} disabled={review||busy} placeholder="اختياري"/></label>
    <div className="x-op-actions"><button className="x-primary" type="submit" disabled={review||busy||!state?.admins.length}><Save size={16}/>{editing?'حفظ تعديل القراءة':'حفظ القراءة'}</button>{editing&&<button type="button" className="x-secondary" onClick={()=>{setEditing(null);setReading(emptyReading());}}>إلغاء التعديل</button>}</div>
   </form>
   <p className="x-op-footnote">الحقل الفارغ ليس صفرًا. Tickets يُصفّر يوم الإثنين؛ Flags يحتاج رصيدًا سابقًا معلومًا. TIME يُدخل كساعات عشرية.</p>
   {controls}
  </section>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><CalendarDays size={20}/><h2>سجل قراءات الأسبوع الحالي</h2><span>{records.length} قراءة</span></div>
   {records.length?<div className="x-op-table-wrap"><table className="x-op-table"><thead><tr><th>الإداري</th><th>الفترة</th><th>Tickets</th><th>Flags</th><th>TIME</th><th>Rating</th><th>تعديل</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td>{r.admin_name}</td><td><DateRange reading={r}/></td><td>{fmt(r.tickets_delta)}</td><td>{fmt(r.flags_delta)}</td><td>{fmt(r.hours)}h</td><td>{fmt(r.rating)}</td><td className="x-op-row-actions"><button type="button" disabled={review||busy} onClick={()=>edit(r)} aria-label={'تعديل قراءة '+r.admin_name}><Pencil size={17}/></button><button type="button" disabled={review||busy} onClick={()=>deleteReading(r)} aria-label={'حذف قراءة '+r.admin_name}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>:<Empty text="لا توجد قراءات حقيقية مسجلة لهذا الأسبوع"/>}
  </section>
 </>;
 if(tab==='excel')return <>
  <Head en="CHICO / XLSX REVIEW" title="استيراد Excel" description="الملف يُفحص وتُعرض صفوفه وتحذيراته قبل أي حفظ. لا إضافة أسماء تلقائية."/><Hint review={review}/>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><FileSpreadsheet size={20}/><h2>مراجعة ملف اللعبة</h2></div>
   <div className="x-op-form"><label className="x-op-full">ملف Excel بصيغة XLSX<input type="file" accept=".xlsx" disabled={review||busy} onChange={e=>{setFile(e.target.files?.[0]||null);setImportView(null);setAcceptedImport(false);}}/></label><button className="x-primary" type="button" onClick={()=>void previewExcel()} disabled={review||busy||!file}><Upload size={17}/>معاينة الملف</button></div>
   {importView&&<><p className="x-op-footnote">الملف: {importView.filename} · {importView.rows.length} صف. المعاينة لا تعني الحفظ.</p>
    <div className="x-op-table-wrap"><table className="x-op-table"><thead><tr><th>الاسم</th><th>التاريخ</th><th>Tickets</th><th>Flags</th><th>TIME</th><th>Rating</th></tr></thead><tbody>{importView.rows.map(r=><tr key={r.row}><td>{r.name}{!r.admin_id?' ⚠️':''}</td><td>{r.date||'غير صالح'}</td><td>{fmt(r.tickets_counter)}</td><td>{fmt(r.flags_counter)}</td><td>{fmt(r.hours)}</td><td>{fmt(r.rating)}</td></tr>)}</tbody></table></div>
    {importView.warnings.length>0?<div className="x-op-error"><AlertTriangle size={18}/><div><b>لا يمكن اعتماد الملف مع تحذيرات لم تُصحّح</b>{importView.warnings.map((s,i)=><p key={i}>{s}</p>)}<small>خصوصًا TIME المحوّل تلقائيًا لتاريخ؛ صحّح الملف وأعد معاينته أولًا.</small></div></div>:<label className="x-op-check"><input type="checkbox" checked={acceptedImport} onChange={e=>setAcceptedImport(e.target.checked)}/>راجعت جميع الصفوف والأرقام وأوافق على الاستيراد</label>}
    <button className="x-primary" disabled={busy||review||!acceptedImport||!!importView.warnings.length} onClick={commitExcel}>اعتماد الاستيراد بعد المراجعة</button>
   </>}
   {controls}
  </section>
 </>;
 if(tab==='server')return <>
  <Head en="CHICO / SERVER PERFORMANCE" title="أداء السيرفر" description="الأرقام من القراءات المحفوظة للأسبوع الحالي، مع فصل البيانات المفقودة عن الصفر."/><Hint review={review}/>
  <div className="x-op-metrics"><Metric label="إجمالي Tickets" value={fmt(summary?.tickets)}/><Metric label="Flags الأسبوع" value={fmt(summary?.flags)}/><Metric label="Server Flag Rate" value={summary?.rate===null||summary?.rate===undefined?'غير متاح':fmt(summary.rate)+'%'}/><Metric label="TIME المسجل" value={fmt(summary?.hours)+'h'}/><Metric label="متوسط التقييمات المسجلة" value={fmt(summary?.rating)}/><Metric label="إداريون لهم قراءة" value={fmt(summary?.reported,0)}/></div>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><BarChart3 size={20}/><h2>أفضل الإداريين حسب Tickets</h2></div>{summary?.top.length?<div className="x-op-mini-list">{summary.top.map((r,i)=><div key={r.id}><b>{i+1}. {r.name}</b><span>{r.rank} · {fmt(r.tickets)} Tickets</span></div>)}</div>:<Empty text="لا يوجد ترتيب موثّق لهذا الأسبوع"/>}<p className="x-op-footnote">الترتيب يستبعد Moderator والرتب القيادية.</p></section>
 </>;
 if(tab==='reports')return <>
  <Head en="CHICO / DISCORD STUDIO" title="التقارير" description="صورة تقرير واضحة بشعار الفريق، تُنشأ من البيانات المسجلة فقط."/><Hint review={review}/>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><Download size={20}/><h2>تقرير الأسبوع</h2></div>
   <div className="x-op-form"><label>نوع التقرير<select value={reportType} onChange={e=>setReportType(e.target.value as 'summary'|'watchlist')}><option value="summary">ملخص أداء السيرفر</option><option value="watchlist">متابعة الفريق</option></select></label>
    <button className="x-primary" type="button" onClick={exportReport} disabled={review||!summary||busy}><Download size={17}/>تصدير صورة PNG</button></div>
   <div className="x-op-metrics"><Metric label="Tickets" value={fmt(summary?.tickets)}/><Metric label="Flags" value={fmt(summary?.flags)}/><Metric label="Flag Rate" value={summary?.rate===null||summary?.rate===undefined?'غير متاح':fmt(summary.rate)+'%'}/></div>
   <p className="x-op-footnote">هذا ملخص قابل للتنزيل، لا تقرير تفصيلي لكل إداري. لا نُخرج تقريرًا رقميًا من المعاينة التجريبية.</p>
  </section>
 </>;
 if(tab==='weeks')return <>
  <Head en="CHICO / WEEKLY CONTROL" title="الأسابيع" description="إغلاق الأسبوع أو إعادة فتحه إجراء يدوي بعد مراجعة تقرير القائد."/><Hint review={review}/>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><CalendarDays size={20}/><h2>اعتماد دورة أسبوعية</h2></div>
   <div className="x-op-form"><label>بداية الأسبوع (الإثنين)<input type="date" disabled={review||busy} value={activeWeek} onChange={e=>{setWeek(e.target.value);setAck(false);}}/></label><label className="x-op-full">ملاحظة الإغلاق / إعادة الفتح<input maxLength={500} value={closeNote} onChange={e=>setCloseNote(e.target.value)} disabled={review||busy}/></label>
    <div className="x-op-full"><b>الحالة الحالية: {currentWeek?.status==='closed'?'مغلق':currentWeek?.status==='open'?'مفتوح':'لم يُغلق'}</b></div>
    <label className="x-op-check x-op-full"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} disabled={review||busy}/>راجعت بيانات الأسبوع وتقرير القائد وأوافق على هذا الإجراء</label>
    <div className="x-op-actions"><button className="x-primary" type="button" disabled={review||busy||!ack||!activeWeek} onClick={()=>changeWeek('closed')}>إغلاق الأسبوع</button><button type="button" className="x-secondary" disabled={review||busy||!ack||!activeWeek} onClick={()=>changeWeek('open')}>إعادة فتح الأسبوع</button></div>
   </div>{controls}
  </section>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><Archive size={20}/><h2>أرشيف الدورات المحفوظة</h2></div>{state?.weeks.length?<div className="x-op-mini-list">{state.weeks.map(w=><div key={w.week_start}><b>{w.week_start}</b><span>{w.status==='closed'?'مغلق':'مفتوح'}</span></div>)}</div>:<Empty text="لم تُسجّل عمليات إغلاق بعد"/>}</section>
 </>;
 if(tab==='alerts')return <>
  <Head en="CHICO / LEADERSHIP WATCH" title="التنبيهات والمتابعة" description="ملاحظات تستند إلى Flags والتقييم والقراءات المسجلة؛ لا نصنع تنبيهات وهمية."/><Hint review={review}/>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><AlertTriangle size={20}/><h2>حالات تحتاج مراجعة</h2></div>
   {summary?.alerts.length?<div className="x-op-mini-list">{summary.alerts.map((a,i)=><div key={a.id+'-'+i}><b>{a.name}</b><span>{a.message}</span></div>)}</div>:<Empty text="لا توجد تنبيهات مستمدة من القراءات الحالية"/>}
   <p className="x-op-footnote">ظهور إنذار لا يثبت مخالفة؛ القرار بعد مراجعة البيانات وسياق الإداري.</p>
  </section>
 </>;
 return <>
  <Head en="CHICO / CONTROL" title="الإعدادات" description="إعداد أسماء الفريق والنسخ الاحتياطية والإجراءات الحساسة بقرارات صريحة."/><Hint review={review}/>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><Users size={20}/><h2>استيراد الأسماء والرتب المعتمدة</h2></div><p className="x-op-footnote">فقط إذا كانت قائمة الإداريين فارغة، دون إنشاء أي إحصائيات.</p><button className="x-primary" type="button" disabled={review||busy||!!state?.admins.length} onClick={doSeed}>استيراد أسماء الفريق فقط</button>{controls}</section>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><Archive size={20}/><h2>النسخ الاحتياطية</h2></div><div className="x-op-actions"><button className="x-secondary" disabled={review||busy} type="button" onClick={()=>void perform(()=>api('/api/backup','POST'),'حُفظت نسخة احتياطية')}>إنشاء نسخة</button><button className="x-secondary" disabled={review||busy} type="button" onClick={()=>void loadBackups()}>عرض النسخ</button></div><div className="x-op-mini-list">{backupList.map(b=><div key={b.id}><b>{b.label}</b><span>{new Date(b.created_at).toLocaleString('ar-EG')}</span><a href={'/api/backup/'+b.id} download>تنزيل JSON</a></div>)}</div></section>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><Trash2 size={20}/><h2>منطقة الحذف الحساس</h2></div><p className="x-op-footnote">سيُنشئ الخادم نسخة احتياطية قبل الحذف. اكتب جملة التأكيد المناسبة، ثم أكّد مرة ثانية.</p><label className="x-op-field">جملة التأكيد<input value={phrase} onChange={e=>setPhrase(e.target.value)} disabled={review||busy} placeholder="RESET STATS أو DELETE ALL"/></label><div className="x-op-actions"><button type="button" className="x-op-danger" disabled={review||busy||phrase!=='RESET STATS'} onClick={()=>doReset('statistics')}>حذف الإحصائيات فقط</button><button type="button" className="x-op-danger" disabled={review||busy||phrase!=='DELETE ALL'} onClick={()=>doReset('everything')}>حذف الفريق وكل بياناته</button></div></section>
 </>;
}
