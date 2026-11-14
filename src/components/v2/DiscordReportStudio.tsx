'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download,Ticket} from 'lucide-react';
import {weekStart,eligibleReadings,isEvaluatedAdmin} from '@/lib/rules';
import {latestPeriod,latestSingleDay,selectPeriod,reportRows,reportTotals} from '@/lib/report-period';
import type {State} from '@/lib/types';
import {renderLuxuryPoster,loadLuxuryArt} from './PremiumPosterRenderer';

type Props={state:State|null;review:boolean};
type Mode='day'|'range'|'week';
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function DiscordReportStudio({state,review}:Props){
 const today=useMemo(cairoToday,[]);
 const eligibleRecords=useMemo(()=>eligibleReadings(state?.readings||[],state?.admins||[]),[state]);
 const latestRecord=useMemo(()=>latestPeriod(eligibleRecords),[eligibleRecords]);
 const latestDaily=useMemo(()=>latestSingleDay(eligibleRecords)?.to_date||null,[eligibleRecords]);
 const touched=useRef(false);
 const [mode,setMode]=useState<Mode>('day');
 const [start,setStart]=useState(today);
 const [end,setEnd]=useState(today);
 const [error,setError]=useState('');
 const [downloading,setDownloading]=useState(false);
 const [renderedKey,setRenderedKey]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!touched.current&&latestRecord){setStart(latestRecord.from_date);setEnd(latestRecord.to_date);setMode(latestRecord.from_date===latestRecord.to_date?'day':'range');}
 },[latestRecord]);
 const period=useMemo(()=>selectPeriod(eligibleRecords,start,end),[eligibleRecords,start,end]);
 const {valid,matching}=period;
 const partial=period.partial.length;
 const rows=useMemo(()=>reportRows(state?.admins||[],matching),[state,matching]);
 const missingCount=Math.max(0,(state?.admins.filter(isEvaluatedAdmin).length||0)-rows.length);
 const staff=state?.admins.filter(a=>a.active).length||0;
 const totals=useMemo(()=>reportTotals(matching,state?.admins||[]),[state,matching]);
 const title=mode==='day'?'إحصائيات يومية':mode==='week'?'ملخص الأسبوع حتى آخر قراءة':'إحصائيات الفترة المحددة';
 const dateLabel=start===end?start:start+'  —  '+end;
 // Prevent exporting a previous date range or the default empty 300x150 canvas.
 const renderKey=useMemo(()=>JSON.stringify({start,end,title,mode,rows,totals}),[start,end,title,mode,rows,totals]);
 const imageReady=Boolean(state&&!review&&period.canExport&&renderedKey===renderKey);
 const expandCoverage=()=>{touched.current=true;setMode('range');setStart(period.expandFrom);setEnd(period.expandTo);};
 const setPeriod=(next:Mode)=>{
  touched.current=true;setMode(next);setError('');
  if(next==='day'){const d=latestDaily||today;setStart(d);setEnd(d);}
  else if(next==='week'){const d=latestRecord?.to_date||today;setStart(weekStart(d));setEnd(d);}
 };
 useEffect(()=>{
  if(!canvas.current||!valid)return;
  let cancelled=false;
  (async()=>{
   const art=await Promise.all([
    loadLuxuryArt('/assets/chico-approved-onestate.avif'),
    loadLuxuryArt('/assets/chico-approved-wolf.avif'),
    loadLuxuryArt('/assets/chico-banner-original.png'),
    loadLuxuryArt('/assets/medal-gold.png'),
    loadLuxuryArt('/assets/medal-silver.png'),
    loadLuxuryArt('/assets/medal-bronze.png')
   ]);
   await document.fonts?.ready;
   if(!cancelled&&canvas.current){renderLuxuryPoster(canvas.current,rows,dateLabel,staff,matching.length,art,title,totals);setRenderedKey(renderKey);}
  })().catch(()=>{
   if(!cancelled&&canvas.current){try{renderLuxuryPoster(canvas.current,rows,dateLabel,staff,matching.length,[null,null,null,null,null,null],title,totals);setRenderedKey(renderKey);}catch{setError('تعذّر رسم تقرير Discord');}}
  });
  return ()=>{cancelled=true;};
 },[rows,dateLabel,staff,matching.length,title,valid,totals,renderKey]);
 const download=()=>{
  if(!canvas.current||!imageReady||downloading)return;
  setError('');setDownloading(true);
  canvas.current.toBlob(blob=>{
   setDownloading(false);
   if(!blob){setError('تعذر إنشاء صورة التقرير');return;}
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='CHICO_'+mode+'_'+start+'_'+end+'.png';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
  },'image/png');
 };
 return <section className="x-panel v9-poster-studio chico-daily-report">
  <header className="v9-poster-intro">
   <div>
    <small>CHICO / PREMIUM REPORT STUDIO</small>
    <h2>التقرير الجاهز للنشر على Discord</h2>
    <p>تقرير متغيّر بالقراءات الحقيقية: Tickets وFlags وتوب 3 لكل من Helpers وModerators.</p>
   </div>
   <button type="button" className="v9-primary" disabled={!imageReady||downloading} onClick={download}>
    <Download size={18}/>{downloading?'جاري تجهيز الصورة…':period.canExport&&!imageReady&&!review?'جاري رسم الصورة…':'تنزيل التقرير PNG'}
   </button>
  </header>
  <div className="v9-poster-filters">
   <label>نوع التقرير
    <select value={mode} onChange={e=>setPeriod(e.target.value as Mode)}>
     <option value="day">تقرير يومي</option>
     <option value="range">عدة أيام</option>
     <option value="week">تقرير أسبوعي</option>
    </select>
   </label>
   <label>يغطي من
    <input type="date" value={start} onChange={e=>{touched.current=true;setStart(e.target.value);if(mode==='day')setEnd(e.target.value);else setMode('range');}}/>
   </label>
   <label>إلى
    <input type="date" value={end} disabled={mode==='day'} onChange={e=>{touched.current=true;setEnd(e.target.value);setMode('range');}}/>
   </label>
   {latestDaily&&<button className="v9-primary" type="button" onClick={()=>setPeriod('day')}><CalendarDays size={17}/>آخر تقرير يومي</button>}
  </div>
  {!valid&&<p className="v9-warning" role="alert">الفترة لازم تكون داخل أسبوع واحد من الإثنين للأحد، لأن عداد Tickets بيتصفّر بداية الأسبوع.</p>}
  {partial>0&&<div className="v9-warning" role="alert">توجد {partial} قراءة متداخلة لكن مش داخلة في الحساب. تم إيقاف التصدير منعًا لتقرير ناقص. <button type="button" className="v9-quiet-btn" onClick={expandCoverage}>عرض فترة التغطية كاملة ({period.expandFrom} — {period.expandTo})</button></div>}
  {valid&&matching.length===0&&partial===0&&<p className="v9-warning" role="status">لا توجد قراءات محفوظة للفترة المحددة؛ علامة — تعني عدم وجود بيانات، وليس صفر.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  {review&&<p className="v9-warning" role="status">دي معاينة التصميم فقط؛ مفيش فيها قراءات محفوظة أو تنزيل حقيقي. للاستيراد والتقارير الفعلية افتح <a href="https://chicoteam.vercel.app/v2?tab=excel">الموقع الرسمي بعد تسجيل الدخول</a>.</p>}
  <div className="v9-poster-preview" style={{display:matching.length>0?'flex':'none'}}><canvas ref={canvas} role="img" aria-label={'تقرير CHICO الفاخر '+title+' للفترة '+dateLabel} style={{width:'100%',maxWidth:1100,height:'auto',aspectRatio:'auto'}}/></div>
  {matching.length===0&&partial===0&&<div className="v9-report-empty" role="status">
    <b>التقرير جاهز للعرض بمجرد حفظ القراءات</b>
    <p>مفيش بيانات مسجلة للفترة المختارة، لذلك مش هنعرض تقرير مليان شرط أو نتائج وهمية.</p>
    <a href="/v2?tab=excel">افتح استيراد Excel</a>
   </div>}
  <p className="v9-poster-note"><Ticket size={15} style={{verticalAlign:'middle'}}/> الصورة بتعرض أصحاب القراءات فقط، بنفس ترتيب الملف الأصلي عند توافره؛ {missingCount>0?`${missingCount} إداريين بدون قراءات مش ظاهرين بالصورة لكن موجودين في الفريق. `:''}Top 3 للـModerators منفصل عن Helpers وSN.Helpers، بالـTickets المسجّلة فقط.</p>
 </section>;
}
