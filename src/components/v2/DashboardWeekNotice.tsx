'use client';

import {ArrowLeft,CalendarDays,FileClock,Plus,Ticket,Flag,Users} from 'lucide-react';
import type {PreviousRecordedWeek} from '@/lib/dashboard-history';

type Props={
 currentWeek:string;
 previous:PreviousRecordedWeek|null;
 onReadReports:()=>void;
 onRecord:()=>void;
};
const count=(number:number|null)=>number===null?'—':number.toLocaleString('en-US',{maximumFractionDigits:2});

export default function DashboardWeekNotice({currentWeek,previous,onReadReports,onRecord}:Props){
 return <section className="v13-week-notice" role="status" aria-label="حالة تسجيل الأسبوع الحالي">
  <div className="v13-week-intro">
   <div className="v13-week-symbol" aria-hidden="true"><FileClock size={26}/></div>
   <div className="v13-week-copy">
    <span className="v13-week-kicker">حالة الأسبوع الحالي <bdi>{currentWeek}</bdi></span>
    <h2>لسه مفيش قراءات أداء مسجلة للأسبوع ده</h2>
    <p>إحصائيات الأسبوع الحالي هتظهر بمجرد تسجيل أول قراءة مؤهلة للتقييم. مش هننقل أرقام أي أسبوع سابق مكانها.</p>
   </div>
   <button type="button" className="v13-week-action" onClick={onRecord}><Plus size={16}/> تسجيل قراءة <ArrowLeft size={16}/></button>
  </div>
  {previous?<div className="v13-previous-week">
    <div className="v13-previous-heading">
     <div><span>آخر أسبوع له قراءات محفوظة</span><strong><CalendarDays size={16}/><bdi>{previous.weekStart}</bdi></strong></div>
     <div className="v13-previous-coverage">نطاق القراءات المحفوظة: <bdi>{previous.from} — {previous.to}</bdi></div>
    </div>
    <div className="v13-previous-metrics" aria-label="ملخص الفترة السابقة فقط">
     <div><Ticket size={16}/><span>Tickets</span><strong>{count(previous.tickets)}</strong></div>
     <div><Flag size={16}/><span>Flags</span><strong>{count(previous.flags)}</strong></div>
     <div><Users size={16}/><span>إداريون لديهم قراءات</span><strong>{count(previous.members)}</strong></div>
     <div><FileClock size={16}/><span>قراءات محفوظة</span><strong>{count(previous.records)}</strong></div>
    </div>
    <div className="v13-previous-footer">
     <p>الأرقام دي تخص الأسبوع السابق المعروض فقط، ومش داخلة في مؤشرات الأسبوع الحالي. نطاق التواريخ لا يعني وجود قراءة منفصلة لكل يوم، والقيم غير المكتملة تظهر (—).</p>
     <button type="button" onClick={onReadReports}>استعراض التقرير المحفوظ <ArrowLeft size={15}/></button>
    </div>
   </div>:<div className="v13-previous-empty">
    <span>لا توجد قراءات أداء سابقة للإداريين الموجودين داخل التقييم حاليًا.</span>
    <button type="button" onClick={onReadReports}>فتح التقارير <ArrowLeft size={15}/></button>
   </div>}
 </section>;
}
