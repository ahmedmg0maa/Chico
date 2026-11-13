'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download,ImageIcon,ShieldCheck} from 'lucide-react';
import {weekStart} from '@/lib/rules';
import type {Admin,Reading,State} from '@/lib/types';

type Props={state:State|null;review:boolean};
type Mode='day'|'range'|'week';
type PosterRow={name:string;rank:string;tickets:number|null;flags:number|null;rating:number|null;hours:number|null;status:string;hasPartial:boolean};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const round=(v:number|null,d=0)=>v===null?'—':new Intl.NumberFormat('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
const total=(arr:(number|null)[])=>{const actual=arr.filter((n):n is number=>n!==null);return actual.length?actual.reduce((x,y)=>x+y,0):null;};
const contained=(r:Reading,start:string,end:string)=>r.from_date>=start&&r.to_date<=end;
function analyze(admin:Admin,readings:Reading[]):PosterRow{
 const mine=readings.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at));
 const flagsIncomplete=mine.some(r=>r.flags_counter!==null&&r.flags_delta===null);
 const flags=flagsIncomplete?null:total(mine.map(r=>r.flags_delta));
 const rating=mine.find(r=>r.rating!==null)?.rating??null;
 let status='لم يسجل';
 if(mine.length)status=(flagsIncomplete?'Flags غير مكتملة':flags!==null&&flags>7?'مراجعة':rating!==null&&rating<4.8?'مراجعة':'مسجل');
 return {name:admin.name,rank:admin.rank,tickets:total(mine.map(r=>r.tickets_delta)),flags,rating,hours:total(mine.map(r=>r.hours)),status,hasPartial:flagsIncomplete};
}
function drawPoster(canvas:HTMLCanvasElement,rows:PosterRow[],range:{start:string;end:string},title:string,image:HTMLImageElement|null,totalReadings:number){
 const w=1800,h=1830;canvas.width=w;canvas.height=h;const context=canvas.getContext('2d');if(!context)return;const g:CanvasRenderingContext2D=context;
 const colors={base:'#090b10',card:'#111720',card2:'#151922',gold:'#d5a75b',goldLight:'#f8deaa',muted:'#a3aab2',ivory:'#f6e8cb',line:'#6e5438',red:'#ca5860',green:'#39c983',blue:'#559ed9',purple:'#9d7ce7'};
 const grad=g.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#151019');grad.addColorStop(.43,'#090c12');grad.addColorStop(1,'#191018');g.fillStyle=grad;g.fillRect(0,0,w,h);
 const glow=g.createRadialGradient(1420,140,10,1420,140,730);glow.addColorStop(0,'rgba(191,104,58,.18)');glow.addColorStop(1,'transparent');g.fillStyle=glow;g.fillRect(0,0,w,800);
 function box(x:number,y:number,bw:number,bh:number,r:number,fill:string,border?:string){
  g.beginPath();g.roundRect(x,y,bw,bh,r);g.fillStyle=fill;g.fill();if(border){g.strokeStyle=border;g.lineWidth=2;g.stroke();}
 }
 function line(x1:number,y1:number,x2:number,y2:number,color:string,width=2){
  g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=color;g.lineWidth=width;g.stroke();
 }
 function txt(str:string,x:number,y:number,font:string,color:string,align:'left'|'right'|'center'='right'){
  g.save();g.textAlign=align;g.textBaseline='middle';g.fillStyle=color;g.font=font;g.direction=/[\u0600-\u06ff]/.test(str)?'rtl':'ltr';g.fillText(str,x,y);g.restore();
 }
 function sep(x:number,y:number,ww:number){line(x,y,x+ww,y,'#5e4633',1);}
 box(19,19,w-38,h-38,19,'rgba(10,11,15,.2)',colors.gold);box(34,34,w-68,h-68,12,'rgba(12,13,18,.25)','#463520');
 line(53,45,w-53,45,colors.gold,4);line(53,h-49,w-53,h-49,colors.gold,4);
 // Prestigious header; the authentic approved OneState and CHICO art is shown IN FULL.
 box(61,65,1678,252,18,'rgba(28,20,23,.96)',colors.line);
 if(image){const iw=572,ih=234,x=82,y=74;const s=Math.min(iw/image.width,ih/image.height),dw=image.width*s,dh=image.height*s;g.drawImage(image,x+(iw-dw)/2,y+(ih-dh)/2,dw,dh);}
 else{txt('CHICO',595,133,'bold 82px Georgia',colors.goldLight,'left');txt('GENERAL TEAM',593,201,'bold 25px Georgia',colors.gold,'left');}
 sep(698,94,2);
 txt('تقرير أداء الفريق',1702,147,'bold 57px Tajawal, Arial',colors.goldLight);
 txt('CHICO GENERAL TEAM · ONE STATE RP',1696,204,'bold 22px Arial',colors.gold,'right');
 txt(title,1688,262,'bold 25px Tajawal, Arial',colors.ivory);
 box(80,333,1640,83,12,'rgba(33,25,27,.97)','#7e613c');
 txt('تاريخ التغطية',1670,365,'bold 23px Tajawal, Arial',colors.muted);
 txt(range.start===range.end?range.start:range.start+'  —  '+range.end,1658,395,'bold 24px Arial',colors.goldLight);
 txt('البيانات من القراءات المحفوظة — دون توزيع أرقام الأيام المجمعة',1140,379,'bold 19px Tajawal, Arial',colors.ivory);
 txt(String(totalReadings)+' سجلات ضمن النطاق',505,380,'bold 20px Tajawal, Arial',colors.gold);
 const groups=[
  {title:'MODERATOR',subtitle:'قسم المودريتور',ranks:['Moderator'],x:78,width:802,accent:colors.purple},
  {title:'HELPER + SN.HELPER',subtitle:'قسم الهيلبر والسينيور',ranks:['Helper','SN.Helper'],x:920,width:802,accent:colors.green}
 ];
 function drawGroup(group:(typeof groups)[number]){
  const r=rows.filter(v=>group.ranks.includes(v.rank)).sort((a,b)=>a.rank.localeCompare(b.rank)||((b.tickets??-1)-(a.tickets??-1))||a.name.localeCompare(b.name));
  const x=group.x,y=444,gw=group.width,gh=1071;
  box(x,y,gw,gh,15,'rgba(20,23,31,.94)','#a67d43');
  box(x+8,y+8,gw-16,114,10,'#2c1722','#8c623c');
  box(x+16,y+17,6,95,3,group.accent);
  txt(group.subtitle,x+gw-25,y+53,'bold 34px Tajawal, Arial',colors.goldLight);
  txt(group.title,x+gw-29,y+94,'bold 19px Arial',group.accent);
  box(x+25,y+142,gw-50,56,6,'#40292e');
  const fields=[{t:'الإداري',x:gw-26},{t:'Tickets',x:gw-266},{t:'Flags',x:gw-380},{t:'Rating',x:gw-503},{t:'TIME',x:gw-624},{t:'الحالة',x:gw-740}];
  fields.forEach(k=>txt(k.t,x+k.x,y+170,'bold 19px Tajawal, Arial',colors.goldLight));
  const maxRows=17,rowY=y+213,rowH=47;
  r.slice(0,maxRows).forEach((v,i)=>{
   const yy=rowY+i*rowH;
   if(i%2===0)box(x+17,yy,gw-34,rowH-3,4,'#1b222c');
   else box(x+17,yy,gw-34,rowH-3,4,'#151922');
   const rankColor=v.rank==='Helper'?colors.green:v.rank==='SN.Helper'?colors.blue:colors.purple;
   box(x+gw-33,yy+8,4,rowH-20,2,rankColor);
   txt(v.name.length>17?v.name.slice(0,16)+'…':v.name,x+gw-44,yy+24,'bold 19px Arial',colors.ivory);
   txt(round(v.tickets),x+gw-273,yy+24,'bold 22px Arial',v.tickets===null?colors.muted:colors.green);
   txt(round(v.flags),x+gw-389,yy+24,'bold 22px Arial',v.flags===null?colors.muted:v.flags>7?colors.red:v.flags>5?colors.goldLight:colors.green);
   txt(round(v.rating,2),x+gw-508,yy+24,'bold 21px Arial',v.rating===null?colors.muted:v.rating<4.8?colors.red:colors.green);
   txt(round(v.hours,2),x+gw-626,yy+24,'bold 20px Arial',colors.ivory);
   txt(v.status==='مسجل'?'✓':v.status==='لم يسجل'?'—':'!',x+gw-744,yy+24,'bold 25px Arial',v.status==='مسجل'?colors.green:v.status==='لم يسجل'?colors.muted:colors.red);
  });
  if(!r.length)txt('لا يوجد إداريون بهذا التصنيف',x+gw/2,y+290,'bold 26px Tajawal, Arial',colors.muted,'center');
  const totalTickets=total(r.map(v=>v.tickets)),known=r.filter(v=>v.tickets!==null).length;
  sep(x+24,y+gh-100,gw-48);
  txt('الإجمالي المسجل: '+round(totalTickets)+' Tickets',x+gw-30,y+gh-69,'bold 23px Tajawal, Arial',colors.goldLight);
  txt('تمت قراءة '+known+' من '+r.length,x+40,y+gh-69,'bold 17px Tajawal, Arial',colors.muted,'left');
 }
 groups.forEach(drawGroup);
 // Podium from eligible helper/senior members only, as per CHICO rank policy.
 box(78,1538,1644,210,14,'rgba(26,20,25,.95)',colors.line);
 txt('أبرز المراكز — Helper / SN.Helper',1684,1578,'bold 29px Tajawal, Arial',colors.goldLight);
 const podium=rows.filter(r=>['Helper','SN.Helper'].includes(r.rank)&&r.tickets!==null).sort((a,b)=>(b.tickets??0)-(a.tickets??0)).slice(0,3);
 const names=[['المركز الأول',1],['المركز الثاني',2],['المركز الثالث',3]];
 names.forEach(([label,index],i)=>{
  const xx=1288-i*531;const row=podium[i];
  box(xx,1603,479,117,10,'#171d28',i===0?'#d2a454':i===1?'#8893a9':'#a16c45');
  box(xx+17,1623,63,63,11,i===0?'#6b4924':i===1?'#333a4f':'#4c2a27');
  txt(String(index),xx+48,1656,'bold 31px Georgia',colors.ivory,'center');
  txt(String(label),xx+450,1630,'bold 20px Tajawal, Arial',colors.gold);
  txt(row?.name||'—',xx+451,1663,'bold 24px Arial',colors.ivory);
  txt(row?.tickets==null?'لا توجد قراءة':round(row.tickets)+' Tickets',xx+451,1698,'bold 18px Arial',colors.muted);
 });
 txt('CHICO ME  •  محفوظ من التقارير الفعلية  •  لا تُستبدل القيم الفارغة بصفر',900,1783,'bold 19px Tajawal, Arial',colors.gold,'center');
}
export default function DiscordReportStudio({state,review}:Props){
 const now=useMemo(today,[]);
 const [mode,setMode]=useState<Mode>('week');
 const [start,setStart]=useState(weekStart(now));
 const [end,setEnd]=useState(now);
 const [error,setError]=useState('');
 const [downloading,setDownloading]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 const valid=start<=end&&weekStart(start)===weekStart(end);
 const matching=useMemo(()=>state?.readings.filter(r=>valid&&contained(r,start,end))||[],[state,start,end,valid]);
 const rows=useMemo(()=>state?.admins.filter(a=>a.in_reporting&&['Helper','SN.Helper','Moderator'].includes(a.rank)).map(a=>analyze(a,matching))||[],[state,matching]);
 const partial=useMemo(()=>state?.readings.filter(r=>valid&&r.from_date<=end&&r.to_date>=start&&!contained(r,start,end)).length||0,[state,start,end,valid]);
 const title=mode==='day'?'إحصائيات يومية':mode==='week'?'إحصائيات أسبوعية':'إحصائيات الفترة المحددة';
 const setPeriod=(next:Mode)=>{setMode(next);if(next==='day'){setStart(now);setEnd(now);}else if(next==='week'){setStart(weekStart(now));setEnd(now);} };
 useEffect(()=>{
  if(!canvas.current||!valid)return;
  let cancelled=false;
  (async()=>{
   try{
    await document.fonts?.ready;
    const img=new Image();img.src='/assets/chico-approved-hero.avif';
    const hero=await new Promise<HTMLImageElement|null>(resolve=>{img.onload=()=>resolve(img);img.onerror=()=>resolve(null);});
    if(!cancelled&&canvas.current)drawPoster(canvas.current,rows,{start,end},title,hero,matching.length);
   }catch{if(!cancelled&&canvas.current)drawPoster(canvas.current,rows,{start,end},title,null,matching.length);}
  })();
  return ()=>{cancelled=true;};
 },[rows,start,end,title,matching.length,valid]);
 const download=()=>{
  if(!canvas.current||review||!valid)return;
  setDownloading(true);setError('');
  canvas.current.toBlob(blob=>{
   setDownloading(false);
   if(!blob){setError('تعذر إنشاء الصورة؛ حاول مجددًا');return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='CHICO_Discord_'+start+'_'+end+'.png';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
  },'image/png');
 };
 return <section className="x-panel v9-poster-studio">
  <div className="v9-poster-intro">
   <div><small>CHICO / DISCORD REPORT STUDIO</small><h2>صورة تقرير واحدة مقسومة لقسمين</h2><p>Helper وSN.Helper معًا، وModerator في قسم مستقل. لا يظهر Administrator أو Responsible في التقرير.</p></div>
   <button type="button" className="v9-primary" disabled={review||!state||!valid||downloading} onClick={download}><Download size={19}/>{downloading?'جاري التحضير…':'تنزيل صورة Discord PNG'}</button>
  </div>
  <div className="v9-poster-filters">
   <label>نوع التقرير<select value={mode} onChange={e=>setPeriod(e.target.value as Mode)}><option value="day">يومي</option><option value="range">عدة أيام</option><option value="week">الأسبوع الحالي</option></select></label>
   <label>يغطي من<input type="date" value={start} onChange={e=>{setStart(e.target.value);if(mode==='day')setEnd(e.target.value);else setMode('range');}}/></label>
   <label>إلى<input type="date" value={end} disabled={mode==='day'} onChange={e=>{setEnd(e.target.value);setMode('range');}}/></label>
  </div>
  {!valid&&<p className="v9-warning" role="alert">اختار فترة صحيحة داخل أسبوع واحد (الإثنين إلى الأحد)، علشان عداد Tickets بيتصفر بداية كل أسبوع.</p>}
  {partial>0&&<p className="v9-warning">يوجد {partial} سجل يغطي جزءًا من الفترة المطلوبة فقط؛ لم نوزّع أرقامه على أيام غير محددة. اختار الفترة الكاملة لتضمينه.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  <div className="v9-poster-preview"><canvas ref={canvas} role="img" aria-label="معاينة التقرير الفعلي المقسوم إلى قسم Helper وSN.Helper وقسم Moderator"/></div>
  <p className="v9-poster-note">المعاينة نفسها هي ملف التصدير؛ لا توجد أرقام تجريبية أو دليل ألوان. مع عدم تسجيل قراءات تظهر علامة «—» بدل الصفر.</p>
 </section>;
}
