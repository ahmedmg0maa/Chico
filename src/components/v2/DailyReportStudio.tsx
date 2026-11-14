'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download} from 'lucide-react';
import type {Admin,Reading,State} from '@/lib/types';
import {summarizeReadings,weekStart,isEvaluatedAdmin,eligibleReadings} from '@/lib/rules';
import {renderLuxuryPoster,loadLuxuryArt,type LuxuryPosterRow} from './PremiumPosterRenderer';
export {renderLuxuryPoster,loadLuxuryArt};
export type {LuxuryPosterRow,PremiumTotals} from './PremiumPosterRenderer';

type Props={state:State|null;review:boolean};
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const sum=(values:(number|null)[])=>{const present=values.filter((n):n is number=>n!==null);return present.length?present.reduce((a,b)=>a+b,0):null;};
const eligible=isEvaluatedAdmin;
function dailyRow(admin:Admin,readings:Reading[]):LuxuryPosterRow{
 const own=readings.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const flagsIncomplete=own.some(r=>r.flags_counter!==null&&r.flags_delta===null);
 return {id:admin.id,name:admin.name,rank:admin.rank,order:admin.sort_order,
  tickets:sum(own.map(r=>r.tickets_delta)),
  flags:flagsIncomplete?null:sum(own.map(r=>r.flags_delta)),
  rating:own.find(r=>r.rating!==null)?.rating??null,flagsIncomplete};
}
export default function DailyReportStudio({state,review}:Props){
 const today=useMemo(cairoToday,[]);
 const latestRecord=useMemo(()=>[...(state?.readings||[])].sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at))[0]||null,[state]);
 const touched=useRef(false);
 const [from,setFrom]=useState(today),[to,setTo]=useState(today);
 const [error,setError]=useState(''),[downloading,setDownloading]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(latestRecord&&!touched.current){setFrom(latestRecord.from_date);setTo(latestRecord.to_date);}
 },[latestRecord]);
 const valid=Boolean(from&&to)&&from<=to&&weekStart(from)===weekStart(to);
 const readings=useMemo(()=>state?.readings.filter(r=>valid&&r.from_date>=from&&r.to_date<=to)||[],[state,from,to,valid]);
 const partial=useMemo(()=>state?.readings.filter(r=>valid&&r.from_date<=to&&r.to_date>=from&&(r.from_date<from||r.to_date>to)).length||0,[state,from,to,valid]);
 const rows=useMemo(()=>state?.admins.filter(eligible).map(a=>dailyRow(a,readings))||[],[state,readings]);
 const staff=state?.admins.filter(a=>a.active).length||0;
 const totals=useMemo(()=>{const metrics=summarizeReadings(eligibleReadings(readings,state?.admins||[]));
  return {tickets:metrics.tickets,flags:metrics.flags,rating:metrics.rating};
 },[state,readings]);
 const label=from===to?from:from+'  —  '+to;
 const title=from===to?'إحصائيات يومية':'إحصائيات الفترة المجمعة';
 useEffect(()=>{
  if(!canvas.current||!valid)return;
  let cancelled=false;
  const paths=['/assets/chico-approved-onestate.avif','/assets/chico-approved-wolf.avif','/assets/chico-banner-original.png','/assets/medal-gold.png','/assets/medal-silver.png','/assets/medal-bronze.png'];
  (async()=>{const art=await Promise.all(paths.map(loadLuxuryArt));await document.fonts?.ready;
   if(!cancelled&&canvas.current)renderLuxuryPoster(canvas.current,rows,label,staff,readings.length,art,title,totals);
  })().catch(()=>{if(!cancelled&&canvas.current)renderLuxuryPoster(canvas.current,rows,label,staff,readings.length,[null,null,null,null,null,null],title,totals);});
  return ()=>{cancelled=true;};
 },[rows,label,staff,readings.length,title,totals,valid]);
 const download=()=>{
  if(!canvas.current||!state||review||readings.length===0||downloading||!valid)return;
  setDownloading(true);setError('');
  canvas.current.toBlob(blob=>{
   setDownloading(false);
   if(!blob){setError('تعذّر إنشاء صورة التقرير');return;}
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='CHICO_Report_'+from+'_'+to+'.png';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
  },'image/png');
 };
 const single=(date:string)=>{touched.current=true;setFrom(date);setTo(date);};
 return <section className="x-panel v9-poster-studio chico-daily-report">
  <header className="v9-poster-intro">
   <div><small>CHICO / PREMIUM STATISTICS</small><h2>التقرير اليومي</h2>
    <p>تقرير بصري متغيّر حسب البيانات المحفوظة. إذا كان الملف يغطي أكثر من يوم، تظهر فترة التغطية الكاملة من غير اختراع توزيع يومي.</p>
   </div>
   <button className="v9-primary" type="button" disabled={review||!state||!valid||readings.length===0||downloading} onClick={download}><Download size={18}/>{downloading?'جاري تجهيز الصورة…':'تنزيل التقرير PNG'}</button>
  </header>
  <div className="v9-poster-filters">
   <label>من تاريخ<input type="date" value={from} onChange={e=>{touched.current=true;setFrom(e.target.value);}}/></label>
   <label>إلى تاريخ<input type="date" value={to} onChange={e=>{touched.current=true;setTo(e.target.value);}}/></label>
   <button type="button" className="v9-primary" onClick={()=>single(today)}>اليوم فقط</button>
   {latestRecord&&<button type="button" className="v9-primary" onClick={()=>{touched.current=true;setFrom(latestRecord.from_date);setTo(latestRecord.to_date);}}><CalendarDays size={16}/>آخر تقرير مسجّل</button>}
  </div>
  {!valid&&<p className="v9-warning" role="alert">يجب اختيار فترة صحيحة داخل أسبوع واحد؛ Tickets يُصفّر يوم الإثنين.</p>}
  {partial>0&&<p className="v9-warning" role="status">يوجد {partial} سجل يغطّي جزءًا من الفترة فقط، ولم تُوزّع قيمه على أيام غير محددة.</p>}
  {valid&&readings.length===0&&<p className="v9-warning" role="status">مفيش قراءات محفوظة للفترة المختارة. اختر آخر تقرير مسجّل لعرض بيانات حقيقية.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  <div className="v9-poster-preview" style={{display:readings.length>0?'flex':'none'}}><canvas ref={canvas} role="img" aria-label={'تقرير CHICO '+label} style={{width:'100%',maxWidth:1100,height:'auto',aspectRatio:'auto'}}/></div>
  {readings.length===0&&<div className="v9-report-empty" role="status">
    <b>التقرير جاهز للعرض بمجرد حفظ القراءات</b>
    <p>مفيش بيانات مسجلة للفترة المختارة، لذلك مش هنعرض تقرير مليان شرط أو نتائج وهمية.</p>
    <a href="/v2?tab=excel">افتح استيراد Excel</a>
   </div>}
  <p className="v9-poster-note">General قائد الفريق خارج التقييم والترتيب. الأسماء والبيانات مأخوذة من القراءات الفعلية. كل Top 3 مبني على Tickets فقط.</p>
 </section>;
}
