'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Activity,CalendarDays,Clock3,History,Pencil,Plus,Shield,Ticket,Flag,Star,X} from 'lucide-react';
import type {Admin,Rank,Reading} from '@/lib/types';
import {RankLabel} from './ChicoVisualLanguage';
import ModalPortal from './ModalPortal';

type Member={id:string;name:string;rank:Rank;admin_level?:number|null;shift_label?:string|null;full_name?:string|null;notes?:string|null;timezone?:string|null;supervisor_id?:string|null;joined_on?:string|null;active:boolean;in_reporting:boolean;tickets:number|null;flags:number|null;hours:number|null;rating:number|null;lastUpdate:string|null;periodFrom?:string|null};
type RankEvent={previous_rank:string|null;new_rank:string;changed_at:string};
type ShiftEvent={previous_shift:string|null;new_shift:string|null;changed_at:string};
type Tab='performance'|'readings'|'details';
const n=(v:number|null|undefined,digits=0)=>v==null?'—':v.toLocaleString('en-US',{maximumFractionDigits:digits});
const sum=(xs:(number|null)[])=>{const v=xs.filter((x):x is number=>x!==null);return v.length?v.reduce((a,b)=>a+b,0):null;};
const when=(date:string)=>date?new Date(date).toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'}):'—';
const coverage=(r:Reading)=>r.from_date===r.to_date?r.to_date:r.from_date+' — '+r.to_date;

export default function ExecutiveProfile({member,readings,admins=[],review,mark,onClose,onEdit,onAddReading,light=false}:{member:Member;readings:Reading[];admins?:Admin[];review:boolean;mark:ReactNode;onClose:()=>void;onEdit:()=>void;onAddReading?:()=>void;light?:boolean}){
 const [tab,setTab]=useState<Tab>('performance');
 const [page,setPage]=useState(20);
 const [rankEvents,setRankEvents]=useState<RankEvent[]>([]);
 const [shiftEvents,setShiftEvents]=useState<ShiftEvent[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(review){setRankEvents([]);setShiftEvents([]);return;}
  let mounted=true;setLoading(true);setError('');
  fetch('/api/admin-profile/'+encodeURIComponent(member.id),{credentials:'same-origin',cache:'no-store'})
   .then(async response=>{if(!response.ok)throw Error('تعذر تحميل سجل الرتبة والمناوبة');return response.json() as Promise<{rank_history:RankEvent[];shift_history:ShiftEvent[]}>;})
   .then(data=>{if(mounted){setRankEvents(data.rank_history||[]);setShiftEvents(data.shift_history||[]);}})
   .catch(err=>{if(mounted)setError(err instanceof Error?err.message:'تعذر تحميل السجل');})
   .finally(()=>{if(mounted)setLoading(false);});
  return ()=>{mounted=false;};
 },[member.id,review]);
 const memberReadings=useMemo(()=>readings.filter(r=>r.admin_id===member.id).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)),[readings,member.id]);
 const tickets=sum(memberReadings.map(r=>r.tickets_delta));
 const hours=sum(memberReadings.map(r=>r.hours));
 const flags=memberReadings.some(r=>r.flags_counter!==null&&r.flags_delta===null)?null:sum(memberReadings.map(r=>r.flags_delta));
 const lastRating=memberReadings.find(r=>r.rating!==null)?.rating??null;
 const topChart=[...memberReadings].reverse().slice(-10);
 const max=Math.max(1,...topChart.map(r=>r.tickets_delta??0));
 const supervisor=admins.find(a=>a.id===member.supervisor_id)?.name||'غير محدد';
 const lastRecord=memberReadings[0];
 return <ModalPortal light={light} onEscape={onClose}><div className="v9-profile-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="v9-profile-modal" role="dialog" aria-modal="true" aria-label={'الملف الإداري '+member.name}>
   <div className="v9-profile-topbar"><span>CHICO / ADMIN PROFILE</span><button type="button" onClick={onClose} aria-label="إغلاق الملف"><X size={21}/></button></div>
   <header className="v9-profile-header">
    <div className="v9-profile-identity"><span className="v9-profile-mark">{mark}</span>
     <div><small>الملف الإداري</small><h2>{member.name}</h2><div className="v9-profile-line"><RankLabel rank={member.rank}/><span>المستوى {member.admin_level??'—'}</span><span className={member.active?'v9-online':'v9-offline'}>{member.active?'نشط':'غير نشط'}</span></div></div>
    </div>
    <div className="v9-profile-actions"><button type="button" className="v9-quiet-btn" onClick={onEdit}><Pencil size={18}/>تعديل البيانات</button>{onAddReading&&<button type="button" className="v9-primary" onClick={onAddReading}><Plus size={18}/>إضافة قراءة</button>}</div>
   </header>
   <div className="v9-profile-kpis">
    <div><Ticket size={18}/><small>Tickets في السجل</small><b>{n(tickets)}</b></div>
    <div><Flag size={18}/><small>Flags في السجل</small><b>{n(flags)}</b></div>
    <div><Clock3 size={18}/><small>TIME المسجل</small><b>{n(hours,2)}{hours===null?'':' h'}</b></div>
    <div><Star size={18}/><small>آخر Rating</small><b>{n(lastRating,2)}</b></div>
   </div>
   <nav className="v9-profile-tabs" aria-label="أقسام ملف الإداري">
    <button type="button" className={tab==='performance'?'selected':''} onClick={()=>setTab('performance')}><Activity size={17}/>الأداء</button>
    <button type="button" className={tab==='readings'?'selected':''} onClick={()=>setTab('readings')}><CalendarDays size={17}/>سجل الأيام ({memberReadings.length})</button>
    <button type="button" className={tab==='details'?'selected':''} onClick={()=>setTab('details')}><Shield size={17}/>البيانات والسجل الإداري</button>
   </nav>
   <div className="v9-profile-content">
    {tab==='performance'&&<>
     <section className="v9-profile-section"><div className="v9-profile-section-heading"><h3>متابعة الأداء المحفوظ</h3><small>المقارنة بين فترات التقارير الفعلية</small></div>
      {topChart.length?<div className="v9-performance-chart">{topChart.map(r=><div key={r.id} className="v9-performance-bar" title={'الفترة: '+coverage(r)+' | Tickets: '+n(r.tickets_delta)}>
       <span>{n(r.tickets_delta)}</span><div className="v9-performance-track"><div style={{height:r.tickets_delta===null?3:Math.max(3,Math.round((r.tickets_delta/max)*100))+'%'}}/></div>
       <small>{r.to_date.slice(5)}</small>
      </div>)}</div>:<div className="v9-empty"><History size={26}/><b>لسه مفيش أداء محفوظ</b><span>أول ما تدخل قراءة، هتظهر هنا باليوم أو الفترة اللي غطتها.</span></div>}
      {topChart.length>0&&<p className="v9-subtle-note">كل عمود يمثل قراءة مسجلة لفترة محددة. لو تقرير بيغطي 3 أيام مش بنقسم مجموعه على الأيام الثلاثة.</p>}
     </section>
     {lastRecord&&<section className="v9-profile-section"><h3>آخر تقرير</h3>
      {lastRecord?<div className="v9-last-report"><div><small>الفترة المغطاة</small><b>{coverage(lastRecord)}</b></div><div><small>تاريخ إضافة التقرير</small><b>{lastRecord.report_entered_on}</b></div><div><small>الحفظ الفعلي بالنظام</small><b>{when(lastRecord.created_at)}</b></div></div>:<p className="v9-subtle-note">لم يتم تسجيل تقرير بعد.</p>}
     </section>}
    </>}
    {tab==='readings'&&<section className="v9-profile-section"><div className="v9-profile-section-heading"><h3>كل الأيام والفترات المحفوظة</h3><small>مرتبة من الأحدث للأقدم</small></div>
     {memberReadings.slice(0,page).map(r=><div className="v9-profile-reading" key={r.id}>
      <div><b>{coverage(r)}</b><span>{r.from_date!==r.to_date?'قراءة مجمعة · ':''}أُضيفت بتاريخ {r.report_entered_on}</span><small title={'وقت الحفظ الفعلي: '+r.created_at}>{r.note||'لا توجد ملاحظات'}</small></div>
      <div className="v9-reading-stats"><span>Tickets <b>{n(r.tickets_delta)}</b></span><span>Flags <b>{n(r.flags_delta)}</b></span><span>TIME <b>{n(r.hours,2)}</b></span><span>Rating <b>{n(r.rating,2)}</b></span></div>
     </div>)}
     {memberReadings.length>page&&<button type="button" className="v9-quiet-btn" onClick={()=>setPage(p=>p+20)}>عرض سجلات أقدم ({memberReadings.length-page})</button>}
     {!memberReadings.length&&<div className="v9-empty">مفيش قراءات محفوظة للإداري ده.</div>}
    </section>}
    {tab==='details'&&<div className="v9-details-layout">
     <section className="v9-profile-section"><h3>بيانات الإداري</h3><dl className="v9-admin-facts">
       <div><dt>اسم الحساب</dt><dd>{member.name}</dd></div><div><dt>الاسم الكامل</dt><dd>{member.full_name||'غير مسجل'}</dd></div>
       <div><dt>الرتبة</dt><dd><RankLabel rank={member.rank}/></dd></div><div><dt>المستوى</dt><dd>{member.admin_level??'—'}</dd></div>
       <div><dt>المناوبة الثابتة</dt><dd>{member.shift_label||'غير محددة'}</dd></div><div><dt>المشرف</dt><dd>{supervisor}</dd></div>
       <div><dt>الانضمام</dt><dd>{member.joined_on||'غير مسجل'}</dd></div><div><dt>التقارير</dt><dd>{member.in_reporting?'مشمول':'مستبعد'}</dd></div>
      </dl><div className="v9-admin-notes"><b>ملاحظات</b><p>{member.notes||'مفيش ملاحظات مسجلة.'}</p></div></section>
     <section className="v9-profile-section"><h3>تغييرات الرتب والمناوبات</h3>{loading?<p>جاري تحميل السجل…</p>:error?<p role="alert">{error}</p>:<>
       <h4>تاريخ الرتب</h4>{rankEvents.length?rankEvents.slice(0,15).map((e,i)=><p key={i} className="v9-history-event">{e.previous_rank||'تعيين أولي'} ← {e.new_rank}<small>{when(e.changed_at)}</small></p>):<p className="v9-subtle-note">لا توجد تغييرات مسجلة.</p>}
       <h4>المناوبات</h4>{shiftEvents.length?shiftEvents.slice(0,10).map((e,i)=><p key={i} className="v9-history-event">{e.new_shift||'إلغاء المناوبة'}<small>{when(e.changed_at)}</small></p>):<p className="v9-subtle-note">لا توجد تغييرات.</p>}
      </>}</section>
    </div>}
   </div>
  </section>
 </div></ModalPortal>;
}
