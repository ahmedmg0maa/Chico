'use client';

import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Activity,CalendarDays,CheckCircle2,Clock3,History,Pencil,Shield,Ticket,Flag,Star,X} from 'lucide-react';
import type {Rank,Reading} from '@/lib/types';

type Member={id:string;name:string;rank:Rank;admin_level?:number|null;shift_label?:string|null;active:boolean;in_reporting:boolean;tickets:number|null;flags:number|null;hours:number|null;rating:number|null;lastUpdate:string|null;periodFrom?:string|null};
type RankEntry={previous_rank:string|null;new_rank:string;changed_at:string};
type Tab='overview'|'readings'|'rank'|'shift';
const formatted=(v:number|null|undefined)=>v===null||v===undefined?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
export default function ExecutiveProfile({member,readings,review,mark,onClose,onEdit}:{member:Member;readings:Reading[];review:boolean;mark:ReactNode;onClose:()=>void;onEdit:()=>void}){
 const [tab,setTab]=useState<Tab>('overview');
 const [history,setHistory]=useState<RankEntry[]>([]);
 const [loading,setLoading]=useState(!review);
 const [error,setError]=useState('');
 const memberReadings=useMemo(()=>readings.filter(r=>r.admin_id===member.id).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)),[readings,member.id]);
 useEffect(()=>{if(review)return;let cancelled=false;setLoading(true);setError('');
  void fetch('/api/admin-profile/'+encodeURIComponent(member.id),{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('تعذّر قراءة سجل الرتب');return r.json();}).then(data=>{if(!cancelled)setHistory(data.rank_history||[]);}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'تعذر تحميل السجل');}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};
 },[member.id,review]);
 const tabs:{id:Tab;title:string}[]=[{id:'overview',title:'الملخص'},{id:'readings',title:'القراءات'},{id:'rank',title:'سجل الرتب'},{id:'shift',title:'المناوبة'}];
 return <div className="x-detail-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <aside className="x-detail-card x-profile-v3" role="dialog" aria-modal="true" aria-label={'ملف الإداري '+member.name}>
   <div className="x-profile-heading"><span>CHICO / ADMIN DIRECTORY</span><button className="x-detail-close" onClick={onClose} aria-label="إغلاق ملف الإداري"><X size={21}/></button></div>
   <div className="x-profile-identity"><div className="x-profile-seal">{mark}</div><div><span className="x-kicker">ADMINISTRATOR PROFILE</span><h2 dir="auto">{member.name}</h2><p>{member.rank} · Level {member.admin_level||'—'}</p><span className={member.active?'x-profile-active':'x-profile-inactive'}>{member.active?'نشط':'غير نشط'}</span></div></div>
   <button type="button" className="x-profile-edit" onClick={onEdit}><Pencil size={16}/>تعديل بيانات الإداري أو حذفه</button>
   <nav className="x-profile-tabs" aria-label="أقسام ملف الإداري">{tabs.map(t=><button type="button" key={t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.title}</button>)}</nav>
   {tab==='overview'&&<div className="x-profile-body">
    <div className="x-profile-metrics">{[['Tickets',formatted(member.tickets)],['Flags',formatted(member.flags)],['Rating',formatted(member.rating)],['TIME',member.hours===null?'—':formatted(member.hours)+' h']].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
    <div className="x-profile-facts"><p><span>الرتبة الحالية</span><b>{member.rank}</b></p><p><span>المستوى الإداري</span><b>{member.admin_level||'غير مسجل'}</b></p><p><span>حالة المشاركة في التقارير</span><b>{member.in_reporting?'مشمول':'غير مشمول'}</b></p><p><span>المناوبة الثابتة</span><b>{member.shift_label||'لم يتم تعيين مناوبة'}</b></p><p><span>آخر قراءة</span><b>{member.lastUpdate||'لا توجد قراءات مسجلة'}</b></p></div>
   </div>}
   {tab==='readings'&&<div className="x-profile-body"><div className="x-profile-section-heading"><Ticket size={18}/>سجل القراءات الحقيقي</div>
    {memberReadings.length?memberReadings.slice(0,35).map(r=><div className="x-profile-event" key={r.id}><div><b>{r.from_date===r.to_date?r.to_date:r.from_date+' — '+r.to_date}</b><span>{r.note||'قراءة محفوظة'}</span></div><div><small>Tickets {formatted(r.tickets_delta)}</small><small>Flags {formatted(r.flags_delta)}</small><small>Rating {formatted(r.rating)}</small><small>TIME {r.hours===null?'—':formatted(r.hours)+' h'}</small></div></div>):<div className="x-profile-empty"><Activity size={26}/><b>لا توجد قراءات مسجلة لهذا الإداري</b><p>ستظهر هنا جميع فترات القراءات التي تحفظها لاحقًا، بدون تقديرات.</p></div>}
   </div>}
   {tab==='rank'&&<div className="x-profile-body"><div className="x-profile-section-heading"><History size={18}/>تاريخ الرتب</div>
    {loading?<p className="x-profile-hint">جارٍ تحميل السجل…</p>:error?<p className="x-profile-hint">{error}</p>:history.length?history.map((r,i)=><div className="x-profile-event" key={i}><div><b>{r.previous_rank?r.previous_rank+' ← '+r.new_rank:r.new_rank}</b><span>{new Date(r.changed_at).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})}</span></div></div>):<div className="x-profile-empty"><History size={26}/><b>لم يُسجل تاريخ تغييرات الرتب</b><p>{review?'ملف Excel يحتوي على الرتبة الحالية فقط.':'أول تغيير رتبة يتم حفظه يظهر هنا تلقائيًا.'}</p></div>}
   </div>}
   {tab==='shift'&&<div className="x-profile-body"><div className="x-profile-section-heading"><Clock3 size={18}/>المناوبة الثابتة</div>
    <div className="x-profile-shift"><CalendarDays size={24}/><strong>{member.shift_label||'لم تُحدد مناوبة بعد'}</strong><p>المناوبة إعداد مستمر للإداري ولا تُنشأ من جديد كل يوم. يتغير الجدول فقط عند تعديلك له.</p></div>
   </div>}
   <footer className="x-profile-footer"><Shield size={16}/>{review?'بيانات الأسماء من Excel المعتمد. الإحصائيات غير مسجلة.':'معلومات محمية · CHICO ME'}</footer>
  </aside>
 </div>;
}
