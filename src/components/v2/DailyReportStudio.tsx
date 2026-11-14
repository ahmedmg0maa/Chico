'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download} from 'lucide-react';
import type {State} from '@/lib/types';
import {latestPeriod,selectPeriod,reportRows,reportTotals} from '@/lib/report-period';
import {renderLuxuryPoster,loadLuxuryArt,type LuxuryPosterRow} from './PremiumPosterRenderer';
export {renderLuxuryPoster,loadLuxuryArt};
export type {LuxuryPosterRow,PremiumTotals} from './PremiumPosterRenderer';

type Props={state:State|null;review:boolean};
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function DailyReportStudio({state,review}:Props){
 const today=useMemo(cairoToday,[]);
 const latestRecord=useMemo(()=>latestPeriod(state?.readings||[]),[state]);
 const touched=useRef(false);
 const [from,setFrom]=useState(today),[to,setTo]=useState(today);
 const [error,setError]=useState(''),[downloading,setDownloading]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(latestRecord&&!touched.current){setFrom(latestRecord.from_date);setTo(latestRecord.to_date);}
 },[latestRecord]);
 const period=useMemo(()=>selectPeriod(state?.readings||[],from,to),[state,from,to]);
 const {valid,matching:readings}=period;
 const partial=period.partial.length;
 const rows=useMemo(()=>reportRows(state?.admins||[],readings),[state,readings]);
 const staff=state?.admins.filter(a=>a.active).length||0;
 const totals=useMemo(()=>reportTotals(readings,state?.admins||[]),[state,readings]);
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
  if(!canvas.current||!state||review||!period.canExport||downloading)return;
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
 const expandCoverage=()=>{touched.current=true;setFrom(period.expandFrom);setTo(period.expandTo);};
 return <section className="x-panel v9-poster-studio chico-daily-report">
  <header className="v9-poster-intro">
   <div><small>CHICO / PREMIUM STATISTICS</small><h2>التقرير اليومي</h2>
    <p>تقرير بصري متغيّر حسب البيانات المحفوظة. إذا كان الملف يغطي أكثر من يوم، تظهر فترة التغطية الكاملة من غير اختراع توزيع يومي.</p>
   </div>
   <button className="v9-primary" type="button" disabled={review||!state||!period.canExport||downloading} onClick={download}><Download size={18}/>{downloading?'جاري تجهيز الصورة…':'تنزيل التقرير PNG'}</button>
  </header>
  <div className="v9-poster-filters">
   <label>من تاريخ<input type="date" value={from} onChange={e=>{touched.current=true;setFrom(e.target.value);}}/></label>
   <label>إلى تاريخ<input type="date" value={to} onChange={e=>{touched.current=true;setTo(e.target.value);}}/></label>
   <button type="button" className="v9-primary" onClick={()=>single(today)}>اليوم فقط</button>
   {latestRecord&&<button type="button" className="v9-primary" onClick={()=>{touched.current=true;setFrom(latestRecord.from_date);setTo(latestRecord.to_date);}}><CalendarDays size={16}/>آخر تقرير مسجّل</button>}
  </div>
  {!valid&&<p className="v9-warning" role="alert">يجب اختيار فترة صحيحة داخل أسبوع واحد؛ Tickets يُصفّر يوم الإثنين.</p>}
  {partial>0&&<div className="v9-warning" role="alert">توجد {partial} قراءة تبدأ قبل الفترة المختارة أو تنتهي بعدها. إظهار بقية الأرقام وحدها هيطلع تقرير ناقص، لذلك التصدير متوقف. <button type="button" className="v9-quiet-btn" onClick={expandCoverage}>عرض فترة التغطية الكاملة ({period.expandFrom} — {period.expandTo})</button></div>}
  {valid&&readings.length===0&&partial===0&&<p className="v9-warning" role="status">مفيش قراءات محفوظة للفترة المختارة. اختر آخر تقرير مسجّل لعرض بيانات حقيقية.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  <div className="v9-poster-preview" style={{display:readings.length>0?'flex':'none'}}><canvas ref={canvas} role="img" aria-label={'تقرير CHICO '+label} style={{width:'100%',maxWidth:1100,height:'auto',aspectRatio:'auto'}}/></div>
  {readings.length===0&&partial===0&&<div className="v9-report-empty" role="status">
    <b>التقرير جاهز للعرض بمجرد حفظ القراءات</b>
    <p>مفيش بيانات مسجلة للفترة المختارة، لذلك مش هنعرض تقرير مليان شرط أو نتائج وهمية.</p>
    <a href="/v2?tab=excel">افتح استيراد Excel</a>
   </div>}
  <p className="v9-poster-note">General قائد الفريق خارج التقييم والترتيب. الأسماء والبيانات مأخوذة من القراءات الفعلية. كل Top 3 مبني على Tickets فقط.</p>
 </section>;
}
