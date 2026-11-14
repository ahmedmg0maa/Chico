'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download} from 'lucide-react';
import type {State} from '@/lib/types';
import {latestPeriod,selectPeriod,reportRows,reportTotals} from '@/lib/report-period';
import {eligibleReadings,isEvaluatedAdmin} from '@/lib/rules';
import {renderLuxuryPoster,loadLuxuryArt,type LuxuryPosterRow} from './PremiumPosterRenderer';
export {renderLuxuryPoster,loadLuxuryArt};
export type {LuxuryPosterRow,PremiumTotals} from './PremiumPosterRenderer';

type Props={state:State|null;review:boolean};
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function DailyReportStudio({state,review}:Props){
 const today=useMemo(cairoToday,[]);
 const eligibleRecords=useMemo(()=>eligibleReadings(state?.readings||[],state?.admins||[]),[state]);
 const latestRecord=useMemo(()=>latestPeriod(eligibleRecords),[eligibleRecords]);
 const touched=useRef(false);
 const [from,setFrom]=useState(today),[to,setTo]=useState(today);
 const [error,setError]=useState(''),[downloading,setDownloading]=useState(false);
 const [renderedKey,setRenderedKey]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(latestRecord&&!touched.current){setFrom(latestRecord.from_date);setTo(latestRecord.to_date);}
 },[latestRecord]);
 const period=useMemo(()=>selectPeriod(eligibleRecords,from,to),[eligibleRecords,from,to]);
 const {valid,matching:readings}=period;
 const partial=period.partial.length;
 const rows=useMemo(()=>reportRows(state?.admins||[],readings),[state,readings]);
 const missingCount=Math.max(0,(state?.admins.filter(isEvaluatedAdmin).length||0)-rows.length);
 const staff=state?.admins.filter(a=>a.active).length||0;
 const totals=useMemo(()=>reportTotals(readings,state?.admins||[]),[state,readings]);
 const label=from===to?from:from+'  —  '+to;
 const title=from===to?'إحصائيات يومية':'إحصائيات الفترة المجمعة';
 // A report can only be downloaded after the exact selected rows and dates are drawn.
 const renderKey=useMemo(()=>JSON.stringify({from,to,title,rows,totals}),[from,to,title,rows,totals]);
 const imageReady=Boolean(state&&!review&&period.canExport&&renderedKey===renderKey);
 useEffect(()=>{
  if(!canvas.current||!period.canExport)return;
  let cancelled=false;
  const paths=['/assets/chico-approved-onestate.avif','/assets/chico-approved-wolf.avif','/assets/chico-banner-original.png','/assets/medal-gold.png','/assets/medal-silver.png','/assets/medal-bronze.png'];
  (async()=>{const art=await Promise.all(paths.map(loadLuxuryArt));await document.fonts?.ready;
   if(!cancelled&&canvas.current){renderLuxuryPoster(canvas.current,rows,label,staff,readings.length,art,title,totals);setRenderedKey(renderKey);}
  })().catch(()=>{if(!cancelled&&canvas.current){try{renderLuxuryPoster(canvas.current,rows,label,staff,readings.length,[null,null,null,null,null,null],title,totals);setRenderedKey(renderKey);}catch{setError('تعذّر رسم التقرير');}}});
  return ()=>{cancelled=true;};
 },[rows,label,staff,readings.length,title,totals,valid,renderKey,period.canExport]);
 const download=()=>{
  if(!canvas.current||!imageReady||downloading)return;
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
   <button className="v9-primary" type="button" disabled={!imageReady||downloading} onClick={download}><Download size={18}/>{downloading?'جاري تجهيز الصورة…':period.canExport&&!imageReady&&!review?'جاري رسم الصورة…':'تنزيل التقرير PNG'}</button>
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
  {review&&<p className="v9-warning" role="status">دي معاينة التصميم فقط، بدون بيانات حية أو تصدير. رفع Excel واستخدام التقارير الفعلية من <a href="https://chicoteam.vercel.app/v2?tab=excel">الموقع الرسمي بعد تسجيل الدخول</a>.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  <div className="v9-poster-preview" style={{display:period.canExport?'flex':'none'}}><canvas ref={canvas} role="img" aria-label={'تقرير CHICO '+label} style={{width:'100%',maxWidth:1100,height:'auto',aspectRatio:'auto'}}/></div>
  {readings.length===0&&partial===0&&<div className="v9-report-empty" role="status">
    <b>التقرير جاهز للعرض بمجرد حفظ القراءات</b>
    <p>مفيش بيانات مسجلة للفترة المختارة، لذلك مش هنعرض تقرير مليان شرط أو نتائج وهمية.</p>
    <a href="/v2?tab=excel">افتح استيراد Excel</a>
   </div>}
  <p className="v9-poster-note">الصورة تضم الإداريين اللي عندهم قراءات محفوظة في الفترة فقط، بترتيبهم الأصلي من Excel عند توفره. {missingCount>0&&<>هناك {missingCount} من أعضاء التقييم بلا قراءة خلال الفترة؛ ما اتشالوش من قائمة الفريق.</>} General وAdministrator خارج التقييم، وترتيب Top 3 حسب Tickets.</p>
 </section>;
}
