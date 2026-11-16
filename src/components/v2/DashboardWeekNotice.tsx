'use client';

import type {PreviousRecordedWeek} from '@/lib/dashboard-history';

type Props={
 currentWeek:string;
 previous:PreviousRecordedWeek|null;
 onReadReports:()=>void;
 onRecord:()=>void;
};
type MarkType='status'|'ticket'|'flag'|'roster'|'archive';

const amount=(n:number|null)=>n===null?'—':n.toLocaleString('en-US',{maximumFractionDigits:2});

/** Original geometric CHICO command emblems, not a generic icon-library set. */
function CommandEmblem({kind}:{kind:MarkType}){
 const symbol=()=>{
  switch(kind){
   case 'ticket': return <>
    <path d="M8 13h28v7c-2.8 0-4.5 1.9-4.5 4S33.2 28 36 28v7H8v-7c2.8 0 4.5-1.9 4.5-4S10.8 20 8 20z"/>
    <path d="M17 15v18" strokeDasharray="2.5 4"/>
    <path d="m25 19 1.3 3.4 3.5 1.3-3.5 1.3-1.3 3.5-1.3-3.5-3.4-1.3 3.4-1.3z"/>
   </>;
   case 'flag': return <>
    <path d="M13 37V8M13 11c7-4 12 5 22 .5v17c-10 4.5-15-5-22-.5"/>
    <path d="M17 16c5-1.5 9 3.5 14 1.7" opacity=".6"/>
    <path d="M9 38h9"/>
   </>;
   case 'roster': return <>
    <path d="M15 20c3.2 0 5.6-2.5 5.6-5.6s-2.4-5.4-5.6-5.4-5.6 2.3-5.6 5.4S11.8 20 15 20z"/>
    <path d="M24.5 17.5c2.6 0 4.3-1.8 4.3-4.3s-1.7-4.2-4.3-4.2"/>
    <path d="M6.5 33v-2.9c0-6.4 17-6.4 17 0V33zM27 25c6.5 0 10.5 2.5 10.5 5.9V33h-8.5"/>
   </>;
   case 'archive': return <>
    <path d="M12 9h21v28H12zM12 15H8v22h4M17 16h10M17 22h10M17 28h7"/>
    <path d="m27 30 2.5 2.5 4.5-5"/>
   </>;
   default: return <>
    <path d="M22 5 37 13v18L22 39 7 31V13z"/>
    <path d="m16 23 4 4 9-11"/>
    <path d="M13 12h18" opacity=".4"/>
   </>;
  }
 };
 return <span className={`v14-command-emblem v14-command-emblem--${kind}`} aria-hidden="true">
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
   <path className="v14-emblem-outline" d="M22 2 41 12v20L22 42 3 32V12z"/>
   <g className="v14-emblem-symbol" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">{symbol()}</g>
  </svg>
 </span>;
}

export default function DashboardWeekNotice({currentWeek,previous,onReadReports,onRecord}:Props){
 const stats=previous?[
  {label:'TICKETS',value:amount(previous.tickets),kind:'ticket' as const},
  {label:'FLAGS',value:amount(previous.flags),kind:'flag' as const},
  {label:'الإداريون',value:amount(previous.members),kind:'roster' as const},
  {label:'القراءات',value:amount(previous.records),kind:'archive' as const}
 ]:[];
 return <section className="v13-week-notice v14-command-panel" role="region" aria-label="حالة الأسبوع الحالي والتقرير السابق">
  <div className="v14-panel-topline"><span>CHICO / COMMAND STATUS</span><span>WEEKLY REPORT</span></div>
  <div className="v13-week-intro v14-status-row">
   <CommandEmblem kind="status"/>
   <div className="v13-week-copy">
    <span className="v13-week-kicker">الأسبوع الحالي <bdi>{currentWeek}</bdi></span>
    <h2>لا توجد قراءات بعد</h2>
   </div>
   <span className="v14-status-tag"><span className="v14-status-dot"/> غير مسجّل</span>
   <button type="button" className="v13-week-action v14-primary-action" onClick={onRecord}>تسجيل قراءة <span aria-hidden="true">↗</span></button>
  </div>
  {previous?<div className="v13-previous-week v14-archive-panel">
   <div className="v13-previous-heading v14-archive-heading">
    <div className="v14-archive-title"><span>آخر فترة محفوظة</span><strong><bdi>{previous.from} — {previous.to}</bdi></strong></div>
    <span className="v14-archive-label">الفترة السابقة</span>
   </div>
   <div className="v13-previous-metrics v14-command-metrics" aria-label="إحصائيات الفترة السابقة فقط">
    {stats.map(stat=><div className="v14-metric" key={stat.kind}>
     <CommandEmblem kind={stat.kind}/>
     <span>{stat.label}</span>
     <strong>{stat.value}</strong>
    </div>)}
   </div>
   <div className="v13-previous-footer v14-archive-footer">
    <small>إحصائيات الفترة السابقة فقط، وليست للأسبوع الحالي.</small>
    <button type="button" onClick={onReadReports}>عرض التقرير <span aria-hidden="true">↗</span></button>
   </div>
  </div>:<div className="v13-previous-empty v14-empty-history">
   <span>لا توجد تقارير سابقة.</span>
   <button type="button" onClick={onReadReports}>عرض التقارير <span aria-hidden="true">↗</span></button>
  </div>}
 </section>;
}
