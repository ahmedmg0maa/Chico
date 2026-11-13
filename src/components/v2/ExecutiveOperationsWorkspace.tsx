'use client';
import {useEffect,useMemo,useState} from 'react';
import {
 Activity,AlertCircle,ArrowLeft,ArrowUpRight,BarChart3,CalendarDays,CheckCircle2,
 ChevronLeft,Clock3,Download,FileSpreadsheet,Flag,FolderKanban,History,LayoutDashboard,
 ListChecks,Plus,RefreshCw,Server,Shield,Ticket,Users
} from 'lucide-react';
import type {State} from '@/lib/types';
import ExecutiveOperations,{type OperationTab} from './ExecutiveOperations';

type Props={state:State|null;review:boolean;onRefresh:()=>Promise<void>;onNavigate:(tab:'dashboard'|'team'|'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings')=>void};
type Event={id:string;action:string;summary:string;created_at:string};
const actions:{id:OperationTab;label:string;en:string;icon:typeof Plus}[]=[
 {id:'updates',label:'تسجيل القراءات',en:'LOG READINGS',icon:Plus},
 {id:'excel',label:'استيراد Excel',en:'EXCEL IMPORT',icon:FileSpreadsheet},
 {id:'server',label:'أداء السيرفر',en:'SERVER',icon:BarChart3},
 {id:'reports',label:'التقارير',en:'REPORTS',icon:Download},
 {id:'weeks',label:'الضبط الأسبوعي',en:'WEEKLY CYCLES',icon:CalendarDays},
 {id:'alerts',label:'التنبيهات',en:'ALERTS',icon:AlertCircle}
];
const number=(n:number|null|undefined,round=0)=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:round});
const actionName=(action:string)=>{
 const dict:Record<string,string>={ADMIN_ADD:'إضافة إداري',ADMIN_EDIT:'تعديل بيانات إداري',ADMIN_DELETE:'حذف إداري',
  XLSX_IMPORT:'استيراد ملف Excel',READING_ADD:'إضافة قراءة',READING_EDIT:'تعديل قراءة',READING_DELETE:'حذف قراءة',
  WEEK_CLOSE:'إغلاق أسبوع',WEEK_OPEN:'إعادة فتح أسبوع',ROSTER_SEED:'إدخال قائمة الفريق',RESET:'تصفير البيانات'};
 return dict[action]||action.replaceAll('_',' ');
};
export default function ExecutiveOperationsWorkspace({state,review,onRefresh,onNavigate}:Props){
 const [selected,setSelected]=useState<OperationTab>('updates');
 const [events,setEvents]=useState<Event[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const summary=state?.summary;
 const recent=useMemo(()=>[...(state?.readings||[])].sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)).slice(0,8),[state]);
 const currentWeek=summary?state?.weeks.find(w=>w.week_start===summary.week_start):undefined;
 useEffect(()=>{
  if(review)return;
  let alive=true;setLoading(true);
  fetch('/api/activity',{cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw Error('تعذّر تحميل سجل النشاط');return r.json() as Promise<{ok:boolean;items:Event[]}>;})
   .then(j=>{if(alive){setEvents(j.items||[]);setError('');}})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:'تعذر تحميل السجل');})
   .finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[review,state?.readings.length,state?.admins.length,state?.weeks.length]);
 const switchOp=(id:OperationTab)=>{
  setSelected(id);document.getElementById('chico-v7-operation-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
 };
 return <div className="v7-operations">
  <header className="v7-workspace-hero">
   <img src="/assets/chico-approved-hero.avif" alt="" className="v7-workspace-hero-image"/>
   <div className="v7-workspace-hero-copy"><small>CHICO GENERAL TEAM / OPERATIONS WORKSPACE</small><h1>مساحة إدارة العمليات</h1><p>البيانات والتحديثات والتقارير والضبط الأسبوعي — في مركز واحد</p></div>
  </header>
  <nav className="v7-workspace-tabs" aria-label="الانتقال بين أدوات العمليات">{actions.map(a=><button key={a.id} type="button" className={selected===a.id?'active':''} onClick={()=>switchOp(a.id)}><a.icon size={21}/><span>{a.label}<small>{a.en}</small></span></button>)}</nav>
  <div className="v7-workspace-cards">
   <section className="v7-workspace-card v7-server-card">
    <header><span><Server size={21}/> أداء السيرفر</span><span className="v7-live-tag"><i/>بيانات السجلات</span></header>
    <div className="v7-server-metrics">
     <div className="v7-server-main"><span>Server Flag Rate</span><strong>{summary?.rate==null?'—':number(summary.rate,2)+'%'}</strong><small>Flags الأسبوع / Tickets الأسبوع × 100</small></div>
     <div className="v7-server-side">
      <p><Ticket size={17}/> Tickets هذا الأسبوع <b>{number(summary?.tickets)}</b></p>
      <p><Flag size={17}/> Flags هذا الأسبوع <b>{number(summary?.flags)}</b></p>
      <p><Users size={17}/> الإداريون <b>{number(state?.admins.length)}</b></p>
      <p><Activity size={17}/> لهم قراءة <b>{number(summary?.reported)}</b></p>
     </div>
    </div>
    <footer><span>تُعرض البيانات الفعلية فقط — غير المسجل ليس صفرًا</span><button type="button" onClick={()=>switchOp('server')}>التفاصيل <ArrowLeft size={15}/></button></footer>
   </section>
   <section className="v7-workspace-card v7-import-card">
    <header><span><FileSpreadsheet size={21}/> استيراد وتحديث Excel</span><span>SAFE REVIEW</span></header>
    <div className="v7-import-visual"><FileSpreadsheet size={52}/><h3>استيراد آمن مع معاينة</h3><p>اختر ملف Excel ثم راجع الأسماء وTIME والتواريخ قبل أي حفظ.</p><button type="button" className="v7-btn v7-btn-primary" onClick={()=>switchOp('excel')}><FileSpreadsheet size={18}/> فتح استيراد Excel</button></div>
    <div className="v7-workspace-checks"><span><CheckCircle2 size={14}/> معاينة أولًا</span><span><Shield size={14}/> مراجعة التحذيرات</span><span><CheckCircle2 size={14}/> حفظ بعد التأكيد</span></div>
   </section>
   <section className="v7-workspace-card v7-feed-card">
    <header><span><History size={21}/> سجل آخر العمليات</span><button onClick={()=>void onRefresh()} title="تحديث" aria-label="تحديث"><RefreshCw size={17}/></button></header>
    {loading?<div className="v7-workspace-empty">جاري تحميل سجل العمليات…</div>:error?<div className="v7-workspace-empty">{error}</div>:events.length?<ol>{events.slice(0,6).map(e=><li key={e.id}><span className="v7-feed-dot"/><div><b>{actionName(e.action)}</b><small dir="auto">{e.summary}</small></div><time>{new Date(e.created_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</time></li>)}</ol>:<div className="v7-workspace-empty"><History size={24}/><b>لا يوجد نشاط مسجل بعد</b><p>العمليات المحفوظة تظهر هنا تلقائيًا.</p></div>}
   </section>
  </div>
  <div className="v7-workspace-secondary">
   <section className="v7-workspace-card v7-week-card">
    <header><span><CalendarDays size={21}/> الضبط الأسبوعي</span><span className={currentWeek?.status==='closed'?'v7-week-closed':'v7-week-open'}>{currentWeek?.status==='closed'?'مغلق':'مفتوح'}</span></header>
    <div><span>بداية الأسبوع الحالي</span><strong>{summary?.week_start||'—'}</strong></div>
    <p>العداد يبدأ من جديد يوم الإثنين. الإغلاق يدوي ولا يتم تقسيم القراءات المتأخرة افتراضيًا.</p>
    <button type="button" onClick={()=>switchOp('weeks')} className="v7-btn v7-btn-muted">مراجعة وإغلاق الأسبوع <ArrowLeft size={16}/></button>
   </section>
   <section className="v7-workspace-card v7-export-card">
    <header><span><Download size={21}/> التقارير والتصدير</span><span>CHICO REPORT STUDIO</span></header>
    <p>أنشئ تقريرًا بالصورة مع شعار الفريق، من الأرقام المسجلة فقط.</p>
    <div className="v7-export-options"><button onClick={()=>switchOp('reports')}><BarChart3 size={24}/> تقرير الأداء</button><button onClick={()=>switchOp('reports')}><Users size={24}/> متابعة الفريق</button><button onClick={()=>onNavigate('team')}><ListChecks size={24}/> كشف الإداريين</button></div>
   </section>
  </div>
  <section className="v7-workspace-card v7-recent-card">
   <header><span><Clock3 size={21}/> آخر القراءات المسجلة</span><button type="button" onClick={()=>switchOp('updates')}>إدارة القراءات <ArrowLeft size={16}/></button></header>
   {recent.length?<div className="v7-table-scroll"><table className="v7-directory-table"><thead><tr><th>الإداري</th><th>نطاق القراءة</th><th>Tickets</th><th>Flags</th><th>TIME</th><th>Rating</th></tr></thead><tbody>{recent.map(r=><tr key={r.id}><td>{r.admin_name}</td><td dir="ltr">{r.from_date===r.to_date?r.to_date:r.from_date+' — '+r.to_date}</td><td>{number(r.tickets_delta)}</td><td>{number(r.flags_delta)}</td><td>{r.hours==null?'—':number(r.hours,2)+' h'}</td><td>{number(r.rating,2)}</td></tr>)}</tbody></table></div>:<div className="v7-workspace-empty"><Activity size={23}/><b>لا توجد قراءات محفوظة بعد</b><p>استخدم «تسجيل القراءات» لإضافة أول قراءة فعلية.</p></div>}
  </section>
  <section id="chico-v7-operation-panel" className="v7-workspace-editor">
   <header><span>OPERATIONS CONTROL PANEL</span><h2>{actions.find(a=>a.id===selected)?.label}</h2><p>واجهة فعلية متصلة بالنظام، وليست تصميمًا تجريبيًا</p></header>
   <ExecutiveOperations tab={selected} state={state} review={review} onRefresh={onRefresh}/>
  </section>
 </div>;
}
