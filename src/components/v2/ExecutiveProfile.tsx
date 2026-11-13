'use client';

import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Activity,CalendarDays,CheckCircle2,Clock3,History,Pencil,Shield,Ticket,Flag,Star,X} from 'lucide-react';
import type {Rank,Reading,Admin} from '@/lib/types';
import {LOCAL_ROSTER_HISTORY_KEY,type LocalRosterEvent} from '@/lib/localRoster';

type Member={id:string;name:string;rank:Rank;admin_level?:number|null;shift_label?:string|null;full_name?:string|null;notes?:string|null;timezone?:string|null;supervisor_id?:string|null;joined_on?:string|null;active:boolean;in_reporting:boolean;tickets:number|null;flags:number|null;hours:number|null;rating:number|null;lastUpdate:string|null;periodFrom?:string|null};
type RankEntry={previous_rank:string|null;new_rank:string;changed_at:string};
type ShiftEntry={previous_shift:string|null;new_shift:string|null;changed_at:string};
type Tab='overview'|'readings'|'rank'|'shift'|'notes';
const formatted=(v:number|null|undefined)=>v===null||v===undefined?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
export default function ExecutiveProfile({member,readings,admins=[],review,mark,onClose,onEdit}:{member:Member;readings:Reading[];admins?:Admin[];review:boolean;mark:ReactNode;onClose:()=>void;onEdit:()=>void}){
 const [tab,setTab]=useState<Tab>('overview');
 const [history,setHistory]=useState<RankEntry[]>([]);
 const [shiftHistory,setShiftHistory]=useState<ShiftEntry[]>([]);
 const [loading,setLoading]=useState(!review);
 const [readingsLimit,setReadingsLimit]=useState(20);
 const supervisor=admins.find(a=>a.id===member.supervisor_id);
 const [error,setError]=useState('');
 const memberReadings=useMemo(()=>readings.filter(r=>r.admin_id===member.id).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)),[readings,member.id]);
 useEffect(()=>{
  if(review){
    try{
      const data=JSON.parse(localStorage.getItem(LOCAL_ROSTER_HISTORY_KEY)||'[]') as LocalRosterEvent[];
      const valid=Array.isArray(data)?data.filter(e=>e.admin_id===member.id):[];
      setHistory(valid.filter(e=>e.kind==='rank').map(e=>({previous_rank:e.previous,new_rank:e.next||'',changed_at:e.changed_at})).reverse());
      setShiftHistory(valid.filter(e=>e.kind==='shift').map(e=>({previous_shift:e.previous,new_shift:e.next,changed_at:e.changed_at})).reverse());
    }catch{setHistory([]);setShiftHistory([]);}
    setLoading(false);
    return;
  }
  let cancelled=false;setLoading(true);setError('');
  void fetch('/api/admin-profile/'+encodeURIComponent(member.id),{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('تعذّر قراءة سجل الرتب');return r.json();}).then(data=>{if(!cancelled){setHistory(data.rank_history||[]);setShiftHistory(data.shift_history||[]);}}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'تعذر تحميل السجل');}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};
 },[member.id,review]);
 const tabs:{id:Tab;title:string}[]=[{id:'overview',title:'الملخص'},{id:'readings',title:'القراءات'},{id:'rank',title:'سجل الرتب'},{id:'shift',title:'المناوبة'},{id:'notes',title:'معلومات إضافية'}];
 return <div className="x-detail-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <aside className="x-detail-card x-profile-v3" role="dialog" aria-modal="true" aria-label={'ملف الإداري '+member.name}>
   <div className="x-profile-heading"><span>CHICO / ADMIN DIRECTORY</span><button className="x-detail-close" onClick={onClose} aria-label="إغلاق ملف الإداري"><X size={21}/></button></div>
   <div className="x-profile-identity"><div className="x-profile-seal">{mark}</div><div><span className="x-kicker">ADMINISTRATOR PROFILE</span><h2 dir="auto">{member.name}</h2><p>{member.rank} · المستوى {member.admin_level||'—'}</p>{member.full_name&&<small className="v7-profile-fullname">{member.full_name}</small>}<span className={member.active?'x-profile-active':'x-profile-inactive'}>{member.active?'نشط':'غير نشط'}</span></div></div>
   <button type="button" className="x-profile-edit" onClick={onEdit}><Pencil size={16}/>تعديل بيانات الإداري أو حذفه</button>
   <nav className="x-profile-tabs" aria-label="أقسام ملف الإداري">{tabs.map(t=><button type="button" key={t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.title}</button>)}</nav>
   {tab==='overview'&&<div className="x-profile-body">
    <div className="x-profile-metrics">{[['Tickets',formatted(member.tickets)],['Flags',formatted(member.flags)],['Rating',formatted(member.rating)],['TIME',member.hours===null?'—':formatted(member.hours)+' h']].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
    <div className="x-profile-facts"><p><span>الاسم الكامل</span><b>{member.full_name||'غير مسجل'}</b></p><p><span>تاريخ الانضمام</span><b>{member.joined_on||'غير مسجل'}</b></p><p><span>المشرف المباشر</span><b>{supervisor?.name||'غير محدد'}</b></p><p><span>المنطقة الزمنية</span><b>{member.timezone||'Africa/Cairo'}</b></p><p><span>الرتبة الحالية</span><b>{member.rank}</b></p><p><span>المستوى الإداري</span><b>{member.admin_level||'غير مسجل'}</b></p><p><span>حالة المشاركة في التقارير</span><b>{member.in_reporting?'مشمول':'غير مشمول'}</b></p><p><span>المناوبة الثابتة</span><b>{member.shift_label||'لم يتم تعيين مناوبة'}</b></p><p><span>آخر قراءة</span><b>{member.lastUpdate||'لا توجد قراءات مسجلة'}</b></p></div>
   </div>}
   {tab==='readings'&&<div className="x-profile-body"><div className="x-profile-section-heading"><Ticket size={18}/>سجل القراءات الحقيقي</div>
    {memberReadings.length?memberReadings.slice(0,readingsLimit).map(r=><div className="x-profile-event" key={r.id}><div><b>{r.from_date===r.to_date?r.to_date:r.from_date+' — '+r.to_date}</b><span>{r.note||'قراءة محفوظة'}</span></div><div><small>Tickets {formatted(r.tickets_delta)}</small><small>Flags {formatted(r.flags_delta)}</small><small>Rating {formatted(r.rating)}</small><small>TIME {r.hours===null?'—':formatted(r.hours)+' h'}</small></div></div>):<div className="x-profile-empty"><Activity size={26}/><b>لا توجد قراءات مسجلة لهذا الإداري</b><p>ستظهر هنا جميع فترات القراءات التي تحفظها لاحقًا، بدون تقديرات.</p></div>}
   {memberReadings.length>readingsLimit&&<button type="button" className="v7-btn v7-btn-muted" onClick={()=>setReadingsLimit(v=>v+20)}>عرض المزيد من القراءات ({memberReadings.length-readingsLimit})</button>}
   </div>}
   {tab==='rank'&&<div className="x-profile-body"><div className="x-profile-section-heading"><History size={18}/>تاريخ الرتب</div>
    {loading?<p className="x-profile-hint">جارٍ تحميل السجل…</p>:error?<p className="x-profile-hint">{error}</p>:history.length?history.map((r,i)=><div className="x-profile-event" key={i}><div><b>{r.previous_rank?r.previous_rank+' ← '+r.new_rank:r.new_rank}</b><span>{new Date(r.changed_at).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})}</span></div></div>):<div className="x-profile-empty"><History size={26}/><b>لم يُسجل تاريخ تغييرات الرتب</b><p>{review?'ملف Excel يحتوي على الرتبة الحالية فقط.':'أول تغيير رتبة يتم حفظه يظهر هنا تلقائيًا.'}</p></div>}
   </div>}
   {tab==='shift'&&<div className="x-profile-body"><div className="x-profile-section-heading"><Clock3 size={18}/>المناوبة الثابتة</div>
    <div className="x-profile-shift"><CalendarDays size={24}/><strong>{member.shift_label||'لم تُحدد مناوبة بعد'}</strong><p>المناوبة إعداد مستمر للإداري ولا تُنشأ من جديد كل يوم. يتغير الجدول فقط عند تعديلك له.</p></div>
    <div className="x-profile-section-heading" style={{marginTop:22}}><History size={18}/>تاريخ تعديل المناوبة</div>
    {shiftHistory.length?shiftHistory.map((event,i)=><div className="x-profile-event" key={i}><div><b>{event.new_shift||'تم إلغاء المناوبة'}</b><span>{event.previous_shift?'بدلًا من '+event.previous_shift:'أول تعيين'}</span><span>{new Date(event.changed_at).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})}</span></div></div>):<p className="x-profile-hint">لا توجد تغييرات مناوبة مسجلة حتى الآن.</p>}
   </div>}
   {tab==='notes'&&<div className="x-profile-body">
    <div className="x-profile-section-heading"><Shield size={18}/>معلومات العضو والملاحظات</div>
    <div className="x-profile-facts">
     <p><span>اسم الحساب</span><b>{member.name}</b></p>
     <p><span>الاسم الكامل</span><b>{member.full_name||'غير مسجل'}</b></p>
     <p><span>المنطقة الزمنية</span><b>{member.timezone||'Africa/Cairo'}</b></p>
     <p><span>المشرف المباشر</span><b>{supervisor?.name||'غير محدد'}</b></p>
     <p><span>تاريخ الانضمام</span><b>{member.joined_on||'غير مسجل'}</b></p>
     <p><span>حالة الفريق</span><b>{member.active?'نشط':'غير نشط'}</b></p>
     <p><span>يظهر في التقارير</span><b>{member.in_reporting?'نعم':'لا'}</b></p>
    </div>
    <div className="v7-profile-notes"><b>ملاحظات إدارية</b><p>{member.notes||'لم تُسجّل ملاحظات لهذا الإداري.'}</p></div>
    <button type="button" className="v7-btn v7-btn-muted" onClick={onEdit}><Pencil size={16}/>تعديل الملف والملاحظات</button>
   </div>}
   <footer className="x-profile-footer"><Shield size={16}/>{review?'بيانات الأسماء من Excel المعتمد. الإحصائيات غير مسجلة.':'معلومات محمية · CHICO ME'}</footer>
  </aside>
 </div>;
}
