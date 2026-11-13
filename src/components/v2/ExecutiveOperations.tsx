'use client';

import {useState, type FormEvent} from 'react';
import ReadingEntryStudio from './ReadingEntryStudio';
import DiscordReportStudio from './DiscordReportStudio';
import {Activity, AlertTriangle, Archive, BarChart3, CalendarDays, CheckCircle2, Download, FileSpreadsheet, Flag, Pencil, Plus, Save, Shield, Ticket, Trash2, Upload, Users} from 'lucide-react';
import type {Admin, Reading, State, Rank} from '@/lib/types';
import {RANKS} from '@/lib/types';
import {applyLocalRosterChange,LOCAL_ROSTER_HISTORY_KEY,type LocalRosterAction,type LocalRosterEvent} from '@/lib/localRoster';

export type OperationTab = 'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings';
type Props = {tab:OperationTab;state:State|null;review:boolean;onRefresh:()=>Promise<void>;initialAdminId?:string|null};
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
 const art=en.includes('GAME READINGS')?'updates':en.includes('XLSX')?'excel':en.includes('SERVER PERFORMANCE')?'server':en.includes('DISCORD STUDIO')?'reports':en.includes('WEEKLY CONTROL')?'weeks':en.includes('LEADERSHIP WATCH')?'alerts':'settings';
 const visual=art==='settings'?'login':art;
 return <section className={'x-titleband x-art-'+art+' x-illustrated-head'}>
   <img className="x-illustrated-banner" src={'/assets/chico-illustrated-'+visual+'.avif'} alt="" loading="lazy" decoding="async"/>
   <div className="x-illustrated-copy"><span className="x-kicker">{en}</span><h1>{title}</h1><p>{description}</p></div>
 </section>;
}
function Empty({text}:{text:string}){return <div className="x-empty"><Activity size={25}/><b>{text}</b></div>;}
function Hint({review}:{review:boolean}){return review?<div className="x-op-hint"><Shield size={18}/>هذه معاينة بيانات الأسماء المعتمدة. عمليات القراءات والاستيراد لا تُحفظ قبل تجهيز قاعدة اختبار مستقلة.</div>:null;}
function DateRange({reading}:{reading:Reading}){return <span className="x-op-date">{reading.from_date===reading.to_date?reading.to_date:reading.from_date+' — '+reading.to_date}</span>;}
function Metric({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="x-op-metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;}

export function ExecutiveTeamManager({state,review,onRefresh,previewAdmins,onPreviewAdminsChange}:{state:State|null;review:boolean;onRefresh:()=>Promise<void>;previewAdmins?:Admin[];onPreviewAdminsChange?:(items:Admin[])=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 const [name,setName]=useState('');
 const [rank,setRank]=useState<Rank>('Helper');
 const [adminLevel,setAdminLevel]=useState(1);
 const [shiftLabel,setShiftLabel]=useState('');
 const [active,setActive]=useState(true);
 const [inReporting,setInReporting]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const currentAdmins=review?(previewAdmins||[]):(state?.admins||[]);
 const editing=currentAdmins.find(a=>a.id===selected);
 const openEdit=(a:Admin)=>{setSelected(a.id);setName(a.name);setRank(a.rank);setAdminLevel(a.admin_level||1);setShiftLabel(a.shift_label||'');setActive(a.active);setInReporting(a.in_reporting);setError('');setMessage('');};
 const reset=()=>{setSelected(null);setName('');setRank('Helper');setAdminLevel(1);setShiftLabel('');setActive(true);setInReporting(true);};
 const run=async(fn:()=>Promise<unknown>,localChange?:()=>void)=>{
  setBusy(true);setError('');setMessage('');
  try{if(review){localChange?.();}else{await fn();await onRefresh();}reset();setMessage(review?'تم تحديث نسخة المعاينة المحلية فقط':'تم حفظ التغيير ومراجعة البيانات المحدثة');}
  catch(e){setError(e instanceof Error?e.message:'تعذّر الحفظ');}
  finally{setBusy(false);}
 };
 const applyLocal=(action:LocalRosterAction)=>{
   const result=applyLocalRosterChange(currentAdmins,action,new Date().toISOString());
   onPreviewAdminsChange?.(result.admins);
   if(result.events.length){
     try{
       const existing=JSON.parse(localStorage.getItem(LOCAL_ROSTER_HISTORY_KEY)||'[]') as LocalRosterEvent[];
       const safe=Array.isArray(existing)?existing.filter(e=>typeof e.admin_id==='string'&&typeof e.kind==='string'):[];
       localStorage.setItem(LOCAL_ROSTER_HISTORY_KEY,JSON.stringify([...safe,...result.events].slice(-500)));
     }catch{localStorage.setItem(LOCAL_ROSTER_HISTORY_KEY,JSON.stringify(result.events));}
   }
 };
 const submit=(e:FormEvent)=>{
   e.preventDefault();
   if(currentAdmins.some(a=>a.name.toLocaleLowerCase()===name.trim().toLocaleLowerCase()&&a.id!==selected)){setError('الاسم موجود بالفعل');return;}
   const input={name:name.trim(),rank,admin_level:adminLevel,shift_label:shiftLabel.trim()||null,active,in_reporting:inReporting};
   const op:LocalRosterAction=selected?{kind:'edit',id:selected,input}:{kind:'add',id:'local-'+crypto.randomUUID(),input:{...input,active:true,in_reporting:true}};
   void run(()=>api(selected?'/api/roster/'+selected:'/api/roster',selected?'PATCH':'POST',selected?input:{name:input.name,rank,admin_level:adminLevel}),()=>applyLocal(op));
 };
 const remove=()=>{
   if(!selected)return;
   if(window.prompt(review?'حذف من المعاينة المحلية فقط. اكتب DELETE للتأكيد':'سيُحذف الإداري وسجلاته بعد حفظ نسخة احتياطية. اكتب DELETE للتأكيد')!=='DELETE')return;
   const action:LocalRosterAction={kind:'delete',id:selected};
   void run(()=>api('/api/roster/'+selected,'DELETE',{confirm:'DELETE'}),()=>applyLocal(action));
 };

 return <section className="x-panel x-op-card" id="chico-team-editor">
  <div className="x-op-cardhead"><Users size={20}/><h2>إدارة الأسماء والرتب</h2><small>إضافة · تعديل · حذف</small></div>
  {review&&<div className="x-op-hint"><Shield size={18}/>يمكنك تجربة الإضافة والتعديل والحذف هنا. التغييرات تُحفظ على هذا الجهاز فقط، ولا تغيّر بيانات السيرفر.</div>}
  <form className="x-op-form" onSubmit={submit}>
   <label>اسم الإداري<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} disabled={busy} placeholder="اكتب الاسم كما يظهر في اللعبة"/></label>
   <label>الرتبة<select value={rank} onChange={e=>setRank(e.target.value as Rank)} disabled={busy}>{RANKS.map(r=><option key={r}>{r}</option>)}</select></label>
   <label>المستوى الإداري<select value={adminLevel} onChange={e=>setAdminLevel(Number(e.target.value))} disabled={busy}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
   {selected&&<label className="x-op-full">المناوبة الثابتة<input maxLength={120} disabled={busy} value={shiftLabel} onChange={e=>setShiftLabel(e.target.value)} placeholder="تظل كما هي حتى تغيّرها بنفسك، مثال: السبت 20:00–22:00"/></label>}
   {selected&&<><label className="x-op-check"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} disabled={busy}/>نشط</label><label className="x-op-check"><input type="checkbox" checked={inReporting} onChange={e=>setInReporting(e.target.checked)} disabled={busy}/>يظهر في التقارير</label></>}
   <div className="x-op-actions"><button className="x-primary" type="submit" disabled={busy||!name.trim()}><Save size={17}/>{editing?'حفظ تعديلات الإداري':'إضافة إداري'}</button>{selected&&<><button className="x-secondary" type="button" onClick={reset}>إلغاء التعديل</button><button className="x-op-danger" type="button" onClick={remove} disabled={busy}><Trash2 size={16}/>حذف</button></>}</div>
  </form>
   {!!currentAdmins.length&&<div className="x-op-mini-list">{currentAdmins.map(a=><button key={a.id} disabled={busy} type="button" onClick={()=>openEdit(a)} data-chico-edit-id={a.id}><Pencil size={13}/><b dir="auto">{a.name}</b><span>{a.rank} · المستوى {a.admin_level||'—'}</span></button>)}</div>}
  {review&&<button type="button" className="x-secondary" onClick={()=>{localStorage.removeItem('chico-approved-roster-local-v1');localStorage.removeItem(LOCAL_ROSTER_HISTORY_KEY);location.reload();}}>استعادة قائمة الفريق المعتمدة</button>}
  {message&&<p className="x-op-success"><CheckCircle2 size={16}/>{message}</p>}{error&&<p className="x-op-error"><AlertTriangle size={16}/>{error}</p>}
 </section>;
}
export default function ExecutiveOperations({tab,state,review,onRefresh,initialAdminId}:Props){
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
 const edit=(r:Reading)=>{setEditing(r.id);setReading({admin_id:r.admin_id,from_date:r.from_date,to_date:r.to_date,tickets_counter:r.tickets_counter,flags_counter:r.flags_counter,flags_baseline:r.flags_baseline,hours:r.hours,rating:r.rating,note:r.note});setError('');};
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
  const logo=new Image();logo.onload=()=>{ctx.drawImage(logo,1330,30,180,158);save();};logo.onerror=save;logo.src='/assets/chico-approved-wolf.avif';
 };
 const controls=<>{error&&<p role="alert" className="x-op-error"><AlertTriangle size={17}/>{error}</p>}{success&&<p role="status" className="x-op-success"><CheckCircle2 size={17}/>{success}</p>}</>;
 if(tab==='updates')return <ReadingEntryStudio state={state} review={review} onRefresh={onRefresh} initialAdminId={initialAdminId}/>;
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
  <div className="x-op-metrics"><Metric label="إجمالي Tickets" value={fmt(summary?.tickets)}/><Metric label="Flags الأسبوع" value={fmt(summary?.flags)}/><Metric label="Server Flag Rate" value={summary?.rate===null||summary?.rate===undefined?'غير متاح':fmt(summary.rate)+'%'}/><Metric label="TIME المسجل" value={summary?.hours===null||summary?.hours===undefined?'—':fmt(summary.hours)+' h'}/><Metric label="متوسط التقييمات المسجلة" value={fmt(summary?.rating)}/><Metric label="إداريون لهم قراءة" value={fmt(summary?.reported,0)}/></div>
  <section className="x-panel x-op-card"><div className="x-op-cardhead"><BarChart3 size={20}/><h2>أفضل الإداريين حسب Tickets</h2></div>{summary?.top.length?<div className="x-op-mini-list">{summary.top.map((r,i)=><div key={r.id}><b>{i+1}. {r.name}</b><span>{r.rank} · {fmt(r.tickets)} Tickets</span></div>)}</div>:<Empty text="لا يوجد ترتيب موثّق لهذا الأسبوع"/>}<p className="x-op-footnote">الترتيب يستبعد Moderator والرتب القيادية.</p></section>
 </>;
 if(tab==='reports')return <><DiscordReportStudio state={state} review={review}/>
    <section className="x-panel v9-export-extras"><h3>ملفات بيانات إضافية</h3><p>للمراجعة خارج Discord، تقدر تطلع Excel أو CSV من نفس البيانات المحفوظة.</p>
      <div className="v9-export-links">{review?<span>التصدير يحتاج الدخول الحقيقي</span>:<>
       <a download href="/api/export?scope=team&format=xlsx"><FileSpreadsheet size={16}/> كشف الفريق Excel</a>
       <a download href="/api/export?scope=readings&format=xlsx"><FileSpreadsheet size={16}/> سجل القراءات Excel</a>
       <a download href="/api/export?scope=team&format=csv"><Download size={16}/> CSV</a>
       <a target="_blank" rel="noopener noreferrer" href="/api/export?scope=team&format=print"><Download size={16}/> طباعة PDF</a>
      </>}</div></section></>;
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
