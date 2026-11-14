'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download,Ticket} from 'lucide-react';
import {weekStart,summarizeReadings,isEvaluatedAdmin,eligibleReadings} from '@/lib/rules';
import type {Admin,Reading,State} from '@/lib/types';
import {renderLuxuryPoster,loadLuxuryArt,type LuxuryPosterRow} from './DailyReportStudio';

type Props={state:State|null;review:boolean};
type Mode='day'|'range'|'week';
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const sum=(arr:(number|null)[])=>{
 const present=arr.filter((x):x is number=>x!==null);
 return present.length?present.reduce((a,b)=>a+b,0):null;
};
const contained=(r:Reading,start:string,end:string)=>r.from_date>=start&&r.to_date<=end;
function reportRow(admin:Admin,readings:Reading[]):LuxuryPosterRow{
 const own=readings.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at));
 const incomplete=own.some(r=>r.flags_counter!==null&&r.flags_delta===null);
 return {
  id:admin.id,name:admin.name,rank:admin.rank,order:admin.sort_order,
  tickets:sum(own.map(r=>r.tickets_delta)),
  flags:incomplete?null:sum(own.map(r=>r.flags_delta)),
  rating:own.find(r=>r.rating!==null)?.rating??null,
  flagsIncomplete:incomplete
 };
}
export default function DiscordReportStudio({state,review}:Props){
 const today=useMemo(cairoToday,[]);
 const latestRecord=useMemo(()=>[...(state?.readings||[])].sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at))[0]||null,[state]);
 const latestDaily=latestRecord?.from_date===latestRecord?.to_date?latestRecord.to_date:null;
 const touched=useRef(false);
 const [mode,setMode]=useState<Mode>('day');
 const [start,setStart]=useState(today);
 const [end,setEnd]=useState(today);
 const [error,setError]=useState('');
 const [downloading,setDownloading]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!touched.current&&latestRecord){setStart(latestRecord.from_date);setEnd(latestRecord.to_date);setMode(latestRecord.from_date===latestRecord.to_date?'day':'range');}
 },[latestRecord]);
 const valid=Boolean(start&&end)&&start<=end&&weekStart(start)===weekStart(end);
 const matching=useMemo(()=>state?.readings.filter(r=>valid&&contained(r,start,end))||[],[state,start,end,valid]);
 const partial=useMemo(()=>state?.readings.filter(r=>valid&&r.from_date<=end&&r.to_date>=start&&!contained(r,start,end)).length||0,[state,start,end,valid]);
 const rows=useMemo(()=>state?.admins.filter(isEvaluatedAdmin).map(a=>reportRow(a,matching))||[],[state,matching]);
 const staff=state?.admins.filter(a=>a.active).length||0;
 const totals=useMemo(()=>{const summary=summarizeReadings(eligibleReadings(matching,state?.admins||[]));return {tickets:summary.tickets,flags:summary.flags,rating:summary.rating};},[state,matching]);
 const title=mode==='day'?'إحصائيات يومية':mode==='week'?'إحصائيات أسبوعية':'إحصائيات الفترة المحددة';
 const dateLabel=start===end?start:start+'  —  '+end;
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
   if(!cancelled&&canvas.current)renderLuxuryPoster(canvas.current,rows,dateLabel,staff,matching.length,art,title,totals);
  })().catch(()=>{
   if(!cancelled&&canvas.current)renderLuxuryPoster(canvas.current,rows,dateLabel,staff,matching.length,[null,null,null,null,null,null],title,totals);
  });
  return ()=>{cancelled=true;};
 },[rows,dateLabel,staff,matching.length,title,valid,totals]);
 const download=()=>{
  if(!canvas.current||!valid||!state||review||matching.length===0||downloading)return;
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
   <button type="button" className="v9-primary" disabled={!valid||!state||review||matching.length===0||downloading} onClick={download}>
    <Download size={18}/>{downloading?'جاري تجهيز الصورة…':'تنزيل التقرير PNG'}
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
  {partial>0&&<p className="v9-warning" role="status">{partial} قراءة مجمّعة تغطي جزءًا من الفترة المحددة. مش هنوزّع أرقامها على أيام افتراضيًا؛ اختار فترة تغطي القراءة كاملة.</p>}
  {valid&&matching.length===0&&<p className="v9-warning" role="status">لا توجد قراءات محفوظة للفترة المحددة؛ علامة — تعني عدم وجود بيانات، وليس صفر.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  <div className="v9-poster-preview" style={{display:matching.length>0?'flex':'none'}}><canvas ref={canvas} role="img" aria-label={'تقرير CHICO الفاخر '+title+' للفترة '+dateLabel} style={{width:'100%',maxWidth:1100,height:'auto'}}/></div>
  {matching.length===0&&<div className="v9-report-empty" role="status">
    <b>التقرير جاهز للعرض بمجرد حفظ القراءات</b>
    <p>مفيش بيانات مسجلة للفترة المختارة، لذلك مش هنعرض تقرير مليان شرط أو نتائج وهمية.</p>
    <a href="/v2?tab=excel">افتح استيراد Excel</a>
   </div>}
  <p className="v9-poster-note"><Ticket size={15} style={{verticalAlign:'middle'}}/> Top 3 للـModerators منفصل عن Top 3 للـHelpers وSN.Helpers معًا، والترتيب حسب Tickets فقط. التقرير يستخدم الفروق المسجّلة ولا يختلق بيانات.</p>
 </section>;
}
