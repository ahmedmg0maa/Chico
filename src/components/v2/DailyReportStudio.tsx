'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download} from 'lucide-react';
import type {Admin,Reading,State} from '@/lib/types';

type Props={state:State|null;review:boolean};
type DailyRow={id:string;name:string;rank:string;order:number;tickets:number|null;flags:number|null;rating:number|null;flagsIncomplete:boolean};
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=(n:number|null,dec=0)=>n===null?'—':n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const sum=(values:(number|null)[])=>{const present=values.filter((n):n is number=>n!==null);return present.length?present.reduce((a,b)=>a+b,0):null;};
const eligible=(a:Admin)=>a.active&&a.in_reporting&&['Helper','SN.Helper','Moderator'].includes(a.rank);
function dailyRow(admin:Admin,readings:Reading[]):DailyRow{
 const own=readings.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const flagsIncomplete=own.some(r=>r.flags_counter!==null&&r.flags_delta===null);
 return {id:admin.id,name:admin.name,rank:admin.rank,order:admin.sort_order,
  tickets:sum(own.map(r=>r.tickets_delta)),
  flags:flagsIncomplete?null:sum(own.map(r=>r.flags_delta)),
  rating:own.find(r=>r.rating!==null)?.rating??null,flagsIncomplete};
}
function orderRows(rows:DailyRow[]):DailyRow[]{
 return [...rows].sort((a,b)=>{
  if((a.tickets===null)!==(b.tickets===null))return a.tickets===null?1:-1;
  if(a.tickets!==null&&b.tickets!==null&&a.tickets!==b.tickets)return b.tickets-a.tickets;
  return a.order-b.order||a.name.localeCompare(b.name,'en');
 });
}
function loadArt(path:string):Promise<HTMLImageElement|null>{
 return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=path;});
}
function drawDailyPoster(
 canvas:HTMLCanvasElement,rows:DailyRow[],date:string,staff:number,readingsCount:number,
 art:(HTMLImageElement|null)[]
){
 const helpers=orderRows(rows.filter(r=>r.rank==='Helper'||r.rank==='SN.Helper'));
 const mods=orderRows(rows.filter(r=>r.rank==='Moderator'));
 const W=1300,tableY=548,rowHeight=40,visibleRows=Math.max(14,helpers.length,mods.length);
 const tableH=205+visibleRows*rowHeight;
 const topY=tableY+tableH+34,H=topY+355;
 canvas.width=W;canvas.height=H;
 const g=canvas.getContext('2d');if(!g)return;
 const gold='#f2c36c',pale='#fff0ca',deep='#b87427',red='#a01d1a',green='#43f18c',muted='#a7a5a7',white='#fff7e9';
 const metallic=(x:number,y:number,w:number,h:number)=>{
  const v=g.createLinearGradient(x,y,x+w,y+h);
  v.addColorStop(0,'#6c3910');v.addColorStop(.18,'#ffdc89');v.addColorStop(.42,'#b8781b');v.addColorStop(.7,'#ffe2a2');v.addColorStop(1,'#7b3c12');return v;
 };
 const panel=(x:number,y:number,w:number,h:number,r=14,stroke=true)=>{
  const gr=g.createLinearGradient(x,y,x+w,y+h);
  gr.addColorStop(0,'#270c0c');gr.addColorStop(.38,'#100c0e');gr.addColorStop(.68,'#09080b');gr.addColorStop(1,'#301010');
  g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=gr;g.fill();
  if(stroke){g.lineWidth=5;g.strokeStyle=metallic(x,y,w,h);g.stroke();}
 };
 const line=(x:number,y:number,xx:number,yy:number,c=gold,l=2)=>{
  g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.lineWidth=l;g.strokeStyle=c;g.stroke();
 };
 const txt=(s:string,x:number,y:number,size:number,color=white,align:CanvasTextAlign='center',max?:number,bold=true)=>{
  g.save();g.font=(bold?'bold ':'')+size+'px '+(/[\u0600-\u06ff]/.test(s)?'Arial, sans-serif':'Georgia, Arial, sans-serif');
  g.textAlign=align;g.textBaseline='middle';g.direction=/[\u0600-\u06ff]/.test(s)?'rtl':'ltr';
  g.fillStyle=color;g.shadowColor='rgba(0,0,0,.65)';g.shadowBlur=3;
  if(max)g.fillText(s,x,y,max);else g.fillText(s,x,y);g.restore();
 };
 const fit=(s:string,max:number,size:number)=>{
  g.save();g.font='bold '+size+'px Arial';let out=s;
  while(out.length>2&&g.measureText(out).width>max)out=out.slice(0,-1);
  g.restore();return out===s?s:out+'…';
 };
 const glow=(x:number,y:number,r=75)=>{
  const gr=g.createRadialGradient(x,y,1,x,y,r);
  gr.addColorStop(0,'rgba(255,222,148,.50)');gr.addColorStop(.15,'rgba(248,162,38,.2)');gr.addColorStop(1,'rgba(255,150,0,0)');
  g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);
 };
 const contain=(img:HTMLImageElement|null,x:number,y:number,w:number,h:number)=>{
  if(!img||!img.naturalWidth)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  g.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
 };
 const ticket=(x:number,y:number,size=38)=>{
  g.save();g.translate(x,y);g.rotate(-.42);g.scale(size/50,size/50);
  g.beginPath();g.moveTo(-23,-12);g.lineTo(23,-12);g.lineTo(23,-5);
  g.arc(23,0,5,-Math.PI/2,Math.PI/2,true);g.lineTo(23,12);g.lineTo(-23,12);
  g.lineTo(-23,5);g.arc(-23,0,5,Math.PI/2,-Math.PI/2,true);g.closePath();
  g.fillStyle='#e9ad3f';g.fill();g.strokeStyle='#fff0b8';g.lineWidth=3;g.stroke();
  line(0,-10,0,10,'#6d3413',2);g.restore();
 };
 const flag=(x:number,y:number)=>{
  line(x-18,y+23,x-18,y-22,gold,5);
  g.beginPath();g.moveTo(x-16,y-20);g.lineTo(x+20,y-15);g.lineTo(x+11,y+5);g.lineTo(x-16,y);g.closePath();
  g.fillStyle=gold;g.fill();
 };
 // Black marble and red/gold corner beams: decorative only, never part of the statistics.
 const bg=g.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,'#08090b');bg.addColorStop(.55,'#100d0d');bg.addColorStop(1,'#040507');
 g.fillStyle=bg;g.fillRect(0,0,W,H);
 for(let i=0;i<105;i++){
  const sx=(i*547+39)%W,sy=(i*907+123)%H,ex=sx+((i*37)%130)-65,ey=sy+((i*71)%170)-85;
  line(sx,sy,ex,ey,i%4===0?'rgba(184,110,31,.22)':'rgba(195,174,130,.07)',i%7===0?2:1);
 }
 g.save();g.globalAlpha=.65;
 for(let i=0;i<4;i++){
  const side=i%2?W:0,top=i<2?0:H;
  line(side,top,side+(side===0?260:-260),top+(top===0?265:-265),i%2?'#e53b24':'#cd7c24',32);
  line(side,top,side+(side===0?205:-205),top+(top===0?215:-215),gold,11);
 }
 g.restore();
 g.beginPath();g.roundRect(23,21,W-46,H-43,23);g.lineWidth=7;g.strokeStyle=metallic(23,21,W-46,H-43);g.stroke();
 g.beginPath();g.roundRect(34,32,W-68,H-65,17);g.lineWidth=2;g.strokeStyle='rgba(255,213,130,.65)';g.stroke();
 // CHICO masthead with original approved insignias.
 panel(48,48,W-96,202,20);
 line(300,95,1000,95,gold,3);line(320,213,980,213,gold,2);
 contain(art[0],76,60,185,177);contain(art[1],1038,56,185,180);
 txt('♛',650,63,65,gold);
 txt('CHICO',650,143,98,pale,'center',680);
 txt('G E N E R A L   T E A M',650,209,24,gold);
 // Daily heading, not a screenshot with fixed weekly numbers.
 panel(241,265,818,95,15);
 txt('إحصائيات يومية',650,311,60,gold);
 panel(418,360,464,43,10);
 txt('CHICO   ✦   '+date+'   ✦',650,382,23,pale);
 // Dynamically calculated KPI row.
 const rated=rows.filter(r=>r.rating!==null),avg=rated.length?rated.reduce((v,r)=>v+(r.rating??0),0)/rated.length:null;
 const anyPartial=rows.some(r=>r.flagsIncomplete||(r.tickets!==null&&r.flags===null));
 const metrics=[
  {label:'TOTAL STAFF',value:String(staff),kind:'staff'},
  {label:'TICKETS',value:fmt(sum(rows.map(r=>r.tickets))),kind:'tickets'},
  {label:'FLAGS',value:fmt(anyPartial?null:sum(rows.map(r=>r.flags))),kind:'flags'},
  {label:'AVG. RATE',value:fmt(avg,2),kind:'rating'}
 ];
 metrics.forEach((m,i)=>{
  const x=34+i*315,y=418;panel(x,y,289,113,12);
  line(x+18,y+19,x+271,y+19,'rgba(255,229,155,.35)',1);
  txt(m.label,x+182,y+34,22,gold,'center',197);
  panel(x+120,y+57,147,42,8,false);
  txt(m.value,x+193,y+78,35,white,'center',135);
  if(m.kind==='tickets')ticket(x+70,y+77,53);
  else if(m.kind==='flags')flag(x+71,y+79);
  else txt(m.kind==='rating'?'★':'♟',x+70,y+77,59,gold);
  glow(x+10,y+10,38);
 });
 const drawTable=(title:string,arr:DailyRow[],x:number,w:number)=>{
  panel(x,tableY,w,tableH,17);
  const hy=tableY+17;
  panel(x+12,hy,w-24,60,9,false);txt(title,x+w/2,hy+30,28,gold,'center',w-42);
  line(x+20,hy+58,x+w-20,hy+58,deep,2);
  const headY=tableY+86;
  const col={index:x+38,name:x+84,tickets:x+w-214,flags:x+w-126,rate:x+w-51};
  g.fillStyle='#67310e';g.fillRect(x+18,headY,w-36,37);
  txt('#',col.index,headY+19,18,pale);
  txt('NAME',col.name,headY+19,18,pale,'left');
  txt('TICKETS',col.tickets,headY+19,15,pale);
  txt('FLAGS',col.flags,headY+19,15,pale);
  txt('RATE',col.rate,headY+19,16,pale);
  arr.forEach((r,i)=>{
   const y=headY+41+i*rowHeight;
   g.fillStyle=i%2?'rgba(8,9,11,.83)':'rgba(37,27,22,.88)';g.fillRect(x+18,y,w-36,rowHeight-2);
   txt(String(i+1),col.index,y+20,21,gold);
   txt(fit(r.name,w-324,21),col.name,y+20,21,white,'left',w-324);
   if(r.rank==='SN.Helper'){g.fillStyle='#72b8fc';g.fillRect(x+68,y+12,3,15);}
   const tk=r.tickets===null?muted:r.tickets>0?green:pale;
   const fc=r.flags===null?muted:r.flags>7?'#ff6b62':r.flags>5?gold:r.flags===0?green:pale;
   const rc=r.rating===null?muted:r.rating>=4.8?green:'#ff716d';
   txt(fmt(r.tickets),col.tickets,y+20,22,tk);
   txt(fmt(r.flags),col.flags,y+20,21,fc);
   txt(fmt(r.rating,2),col.rate,y+20,20,rc);
   line(x+18,y+rowHeight-2,x+w-18,y+rowHeight-2,'rgba(237,174,84,.24)',1);
  });
  if(!arr.length)txt('لا توجد أسماء مسجلة لهذه الرتبة',x+w/2,headY+79,19,muted);
  const fy=tableY+tableH-27;
  line(x+20,fy-24,x+w-20,fy-24,gold,2);
  txt('TOTAL TICKETS',x+35,fy,19,gold,'left');
  txt(fmt(sum(arr.map(r=>r.tickets))),x+w-38,fy,26,pale,'right');
 };
 drawTable('HELPERS + SN.HELPERS',helpers,32,605);
 drawTable('MODERATORS',mods,663,605);
 // Two separate ticket-only podiums, including the combined senior/helper category.
 const podium=(title:string,rs:DailyRow[],x:number,w:number)=>{
  panel(x,topY,w,278,14);
  panel(x+15,topY+14,w-30,52,8,false);
  txt(title,x+w/2,topY+40,27,gold,'center',w-45);
  const top=rs.filter(r=>r.tickets!==null).slice(0,3);
  const ranks=['#1','#2','#3'],colors=['#ffda68','#dbe5ec','#e6a56a'];
  for(let i=0;i<3;i++){
   const cx=x+104+i*195,yy=topY+124;
   g.save();g.shadowColor=colors[i];g.shadowBlur=23;
   const gr=g.createRadialGradient(cx-10,yy-12,6,cx,yy,53);
   gr.addColorStop(0,'#fff6d0');gr.addColorStop(.5,colors[i]);gr.addColorStop(1,'#6a3618');
   g.beginPath();g.arc(cx,yy,54,0,Math.PI*2);g.fillStyle=gr;g.fill();g.lineWidth=5;g.strokeStyle=colors[i];g.stroke();
   g.restore();
   txt('♛',cx,yy-66,35,colors[i]);
   txt(ranks[i],cx,yy+2,43,'#20140c');
   panel(cx-87,topY+191,174,32,8,false);
   txt(fit(top[i]?.name||'—',160,19),cx,topY+207,19,pale,'center',164);
   panel(cx-76,topY+232,152,31,8,false);
   ticket(cx-54,topY+248,23);
   txt(top[i]?fmt(top[i].tickets):'—',cx+16,topY+247,21,pale,'center',105);
  }
 };
 // The top ranking uses tickets_delta only. Not phone calls, ratings or cumulative weekly counters.
 podium('HELPERS + SN.HELPERS',helpers,32,605);
 podium('MODERATORS',mods,663,605);
 line(60,H-56,W-60,H-56,gold,2);
 txt('CHICO GENERAL TEAM    •    ONE STATE RP    •    '+readingsCount+' READINGS',W/2,H-35,19,gold);
 for(const p of [[37,38],[W-37,38],[37,H-39],[W-37,H-39]])glow(p[0],p[1],35);
}

export default function DailyReportStudio({state,review}:Props){
 const [date,setDate]=useState(cairoToday);
 const touched=useRef(false);
 const [error,setError]=useState('');
 const [downloading,setDownloading]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 const dates=useMemo(()=>[...new Set((state?.readings||[]).filter(r=>r.from_date===r.to_date).map(r=>r.to_date))].sort().reverse(),[state]);
 const latest=dates[0]||null;
 useEffect(()=>{if(latest&&!touched.current)setDate(latest);},[latest]);
 const readings=useMemo(()=>state?.readings.filter(r=>r.from_date===date&&r.to_date===date)||[],[state,date]);
 const partial=useMemo(()=>state?.readings.filter(r=>r.from_date<=date&&r.to_date>=date&&r.to_date!==r.from_date).length||0,[state,date]);
 const rows=useMemo(()=>state?.admins.filter(eligible).map(a=>dailyRow(a,readings))||[],[state,readings]);
 const staff=state?.admins.filter(a=>a.active).length||0;
 useEffect(()=>{
  let cancelled=false;
  const paths=['/assets/chico-approved-onestate.avif','/assets/chico-approved-wolf.avif'];
  (async()=>{const art=await Promise.all(paths.map(loadArt));await document.fonts?.ready;
   if(!cancelled&&canvas.current)drawDailyPoster(canvas.current,rows,date,staff,readings.length,art);
  })().catch(()=>{if(!cancelled&&canvas.current)drawDailyPoster(canvas.current,rows,date,staff,readings.length,[null,null]);});
  return ()=>{cancelled=true;};
 },[rows,date,staff,readings.length]);
 const download=()=>{
  if(!canvas.current||review||!state||downloading)return;
  setDownloading(true);setError('');
  canvas.current.toBlob(blob=>{
   setDownloading(false);
   if(!blob){setError('تعذر إنشاء الصورة');return;}
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='CHICO_Daily_Report_'+date+'.png';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
  },'image/png');
 };
 return <section className="x-panel v9-poster-studio chico-daily-report">
  <header className="v9-poster-intro">
   <div><small>CHICO / DAILY STATISTICS</small><h2>التقرير اليومي</h2>
    <p>نفس تصميم CHICO الأسود والذهبي، بأسماء وأرقام تتغيّر حسب تاريخ التقرير المحفوظ، وأفضل 3 لكل مجموعة حسب Tickets.</p>
   </div>
   <button type="button" className="v9-primary" disabled={!state||review||downloading} onClick={download}><Download size={18}/>{downloading?'تجهيز الصورة…':'تنزيل التقرير PNG'}</button>
  </header>
  <div className="v9-poster-filters">
   <label>تاريخ التقرير <input type="date" value={date} onChange={e=>{touched.current=true;setDate(e.target.value);}}/></label>
   {latest&&<button className="v9-primary" type="button" onClick={()=>{touched.current=true;setDate(latest);}}><CalendarDays size={16}/>آخر تاريخ مسجّل</button>}
  </div>
  {partial>0&&<p className="v9-warning" role="status">يوجد {partial} قراءات مجمّعة تغطي اليوم ده ضمن عدة أيام. مش بنوزّعها على يوم واحد تلقائيًا، ولذلك مش داخلة في أرقامه.</p>}
  {readings.length===0&&<p className="v9-warning" role="status">مفيش قراءات يومية محفوظة للتاريخ ده؛ العلامة — معناها بيانات غير متاحة، مش صفر.</p>}
  {error&&<p className="v9-warning" role="alert">{error}</p>}
  <div className="v9-poster-preview"><canvas ref={canvas} role="img" aria-label={'تقرير CHICO اليومي بتاريخ '+date} style={{width:'100%',maxWidth:1100,height:'auto',aspectRatio:'auto'}}/></div>
  <p className="v9-poster-note">Tickets وFlags هنا فروق القراءة الخاصة باليوم المختار وليست الأرصدة التراكمية. الترتيب لا يشمل الرتب القيادية، والـHelper والـSN.Helper معًا. لا توجد أرقام تجريبية داخل التقرير.</p>
 </section>;
}
