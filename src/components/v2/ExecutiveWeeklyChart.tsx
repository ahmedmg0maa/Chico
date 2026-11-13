'use client';
import {useMemo,useState} from 'react';
import {Activity,BarChart3,CalendarDays} from 'lucide-react';
import type {Reading} from '@/lib/types';

export default function ExecutiveWeeklyChart({readings}:{readings:Reading[]}){
 const [limit,setLimit]=useState(8);
 const buckets=useMemo(()=>{
  const byWeek=new Map<string,{tickets:number;flags:number;count:number}>();
  for(const r of readings){
   const week=r.week_start;
   const entry=byWeek.get(week)||{tickets:0,flags:0,count:0};
   if(r.tickets_delta!==null)entry.tickets+=r.tickets_delta;
   if(r.flags_delta!==null)entry.flags+=r.flags_delta;
   entry.count++;
   byWeek.set(week,entry);
  }
  return [...byWeek.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-limit).map(([week,data])=>({week,...data}));
 },[readings,limit]);
 const max=Math.max(1,...buckets.map(b=>b.tickets));
 const x=(i:number)=>buckets.length<=1?340:48+(i/(buckets.length-1))*572;
 const y=(n:number)=>203-n/max*145;
 const points=buckets.map((b,i)=>x(i)+','+y(b.tickets)).join(' ');
 const area=buckets.length?x(0)+',203 '+points+' '+x(buckets.length-1)+',203':'';
 return <section className="v7-chart-card">
  <header className="v7-chart-head">
   <div><BarChart3 size={22}/><span><b>أداء الفريق خلال الأسابيع الأخيرة</b><small>WEEKLY PERFORMANCE · TICKETS</small></span></div>
   <label><CalendarDays size={17}/><select value={limit} onChange={e=>setLimit(Number(e.target.value))} aria-label="فترة الرسم البياني"><option value={4}>آخر 4 أسابيع مسجلة</option><option value={8}>آخر 8 أسابيع مسجلة</option></select></label>
  </header>
  {buckets.length?
   <div className="v7-chart-area">
    <svg viewBox="0 0 680 260" aria-label="رسم بياني لعدد Tickets الفعلية لكل أسبوع مسجل" role="img" preserveAspectRatio="xMidYMid meet">
     <defs><linearGradient id="chico-v7-line" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#d8a85c"/><stop offset=".5" stopColor="#f8d995"/><stop offset="1" stopColor="#e2b65e"/></linearGradient>
      <linearGradient id="chico-v7-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#923a47" stopOpacity=".46"/><stop offset="1" stopColor="#923a47" stopOpacity="0"/></linearGradient></defs>
     {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="48" x2="648" y1={y(max*t)} y2={y(max*t)} stroke="currentColor" opacity=".15" strokeWidth="1"/><text x="35" y={y(max*t)+4} fontSize="12" fill="currentColor" textAnchor="end">{Math.round(max*t)}</text></g>)}
     {buckets.map((b,i)=><line key={b.week} x1={x(i)} x2={x(i)} y1="48" y2="203" stroke="currentColor" strokeWidth=".6" opacity=".08"/>)}
     {buckets.length>1&&<polygon points={area} fill="url(#chico-v7-fill)"/>}
     {buckets.length>1&&<polyline points={points} stroke="url(#chico-v7-line)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" className="v7-chart-line"/>}
     {buckets.map((b,i)=><g key={b.week}><circle cx={x(i)} cy={y(b.tickets)} r="5" stroke="#ffe4a7" strokeWidth="2" fill="#a95042"><title>{b.week}: {b.tickets} Tickets</title></circle><text x={x(i)} y="232" fill="currentColor" fontSize="11" textAnchor="middle">{b.week.slice(5)}</text></g>)}
    </svg>
    <p>الأسابيع التي لا تحتوي على قراءات لا تُعرض كنقاط افتراضية. كل نقطة مجموع Tickets المسجل للأسبوع.</p>
   </div>:
   <div className="v7-chart-empty"><Activity size={32}/><b>لا توجد بيانات أسبوعية للرسم</b><p>سيظهر الرسم تلقائيًا بعد إدخال قراءات فعلية، بدون أي أرقام تجريبية.</p></div>}
 </section>;
}
