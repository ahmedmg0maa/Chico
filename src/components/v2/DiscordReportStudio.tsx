'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download,ImageIcon,ShieldCheck} from 'lucide-react';
import {weekStart} from '@/lib/rules';
import type {Admin,Reading,State} from '@/lib/types';

type Props={state:State|null;review:boolean};
type Mode='day'|'range'|'week';
type PosterRow={name:string;rank:string;order:number;tickets:number|null;flags:number|null;rating:number|null;hours:number|null;status:string;hasPartial:boolean};
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
 return {name:admin.name,rank:admin.rank,order:admin.sort_order??999,tickets:total(mine.map(r=>r.tickets_delta)),flags,rating,hours:total(mine.map(r=>r.hours)),status,hasPartial:flagsIncomplete};
}

function drawPoster(
 canvas:HTMLCanvasElement,rows:PosterRow[],range:{start:string;end:string},
 title:string,image:HTMLImageElement|null,totalReadings:number
){
 const W=1800,H=1620;
 canvas.width=W;canvas.height=H;
 const context=canvas.getContext('2d');
 if(!context)return;
 const g:CanvasRenderingContext2D=context;
 const C={
  gold:'#d9aa61',goldPale:'#ffe3ac',ink:'#080a0f',border:'#8e602e',
  cream:'#fff2d9',muted:'#a9a6a8',green:'#36d484',blue:'#67b8fa',
  purple:'#ae8bfa',red:'#ec6c74',row:'#161b25',silver:'#bbc6d8',
  bronze:'#d5a077'
 };
 type G={name:string;rankSet:string[];x:number;w:number;accent:string;rowMax:number};
 const groups:G[]=[
  {name:'HELPER + SN.HELPER',rankSet:['Helper','SN.Helper'],x:55,w:1020,accent:C.green,rowMax:17},
  {name:'MODERATORS',rankSet:['Moderator'],x:1091,w:654,accent:C.purple,rowMax:10}
 ];
 const panelBG=g.createLinearGradient(0,0,W,H);
 panelBG.addColorStop(0,'#171017');panelBG.addColorStop(.42,'#080b12');panelBG.addColorStop(1,'#170d13');
 g.fillStyle=panelBG;g.fillRect(0,0,W,H);
 const light=g.createRadialGradient(1640,70,15,1640,70,880);
 light.addColorStop(0,'rgba(193,57,34,.17)');light.addColorStop(1,'rgba(193,57,34,0)');
 g.fillStyle=light;g.fillRect(0,0,W,H);
 function rect(x:number,y:number,w:number,h:number,r=0,fill:string|CanvasGradient='#10131b',stroke?:string,sw=2){
  g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke();}
 }
 function ln(x:number,y:number,x2:number,y2:number,stroke=C.gold,sw=2){
  g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.lineWidth=sw;g.strokeStyle=stroke;g.stroke();
 }
 function text(s:string,x:number,y:number,font:string,color=C.cream,align:CanvasTextAlign='left',maxWidth?:number){
  g.save();g.font=font;g.textAlign=align;g.textBaseline='middle';
  g.direction=/[\u0600-\u06ff]/.test(s)?'rtl':'ltr';g.fillStyle=color;
  if(maxWidth)g.fillText(s,x,y,maxWidth);else g.fillText(s,x,y);g.restore();
 }
 function limit(s:string,max:number,font:string){
  g.save();g.font=font;
  if(g.measureText(s).width<=max){g.restore();return s;}
  let t=s;while(t.length>1&&g.measureText(t+'…').width>max)t=t.slice(0,-1);
  g.restore();return t+'…';
 }
 function jewel(x:number,y:number,r=8){
  g.save();g.translate(x,y);g.rotate(Math.PI/4);
  rect(-r/2,-r/2,r,r,1,'#f2c273','#b97833',1);
  g.restore();
 }
 function titleRibbon(x:number,y:number,w:number,label:string,accent:string){
  const grad=g.createLinearGradient(x,y,x+w,y+64);
  grad.addColorStop(0,'#34151d');grad.addColorStop(.54,'#110e16');grad.addColorStop(1,'#471b21');
  rect(x,y,w,69,10,grad,'#ca994d',2);
  ln(x+12,y+6,x+w-12,y+6,'#f3d291',1.5);
  rect(x+13,y+18,5,33,2,accent);
  text(label,x+w/2,y+37,'bold 31px Georgia, Arial',C.goldPale,'center',w-86);
 }
 function drawTicketIcon(cx:number,cy:number,size=48){
  // Ticket stub; intentionally not a phone/Calls glyph.
  g.save();g.translate(cx-size/2,cy-size/2);g.scale(size/64,size/64);
  g.beginPath();g.moveTo(6,10);g.lineTo(58,10);g.lineTo(58,24);
  g.arc(58,32,8,-Math.PI/2,Math.PI/2,true);
  g.lineTo(58,54);g.lineTo(6,54);g.lineTo(6,40);
  g.arc(6,32,8,Math.PI/2,-Math.PI/2,true);g.closePath();
  g.strokeStyle=C.goldPale;g.lineWidth=3.5;g.stroke();
  g.setLineDash([5,5]);ln(33,16,33,48,'#f4c979',2);g.setLineDash([]);
  g.restore();
 }
 function rankAccent(rank:string){return rank==='SN.Helper'?C.blue:rank==='Moderator'?C.purple:C.green;}
 function sorted(rs:PosterRow[]){
  return [...rs].sort((a,b)=>{
   const ak=a.tickets!==null,bk=b.tickets!==null;
   if(ak!==bk)return ak?-1:1;
   if(ak&&bk&&a.tickets!==b.tickets)return (b.tickets??0)-(a.tickets??0);
   return (a.order??999)-(b.order??999)||a.name.localeCompare(b.name,'en');
  });
 }
 function best(rs:PosterRow[]){
  return sorted(rs).filter(r=>r.tickets!==null).slice(0,3);
 }
 function cardBackground(x:number,y:number,w:number,h:number){
  const grad=g.createLinearGradient(x,y,x+w,y+h);
  grad.addColorStop(0,'rgba(26,28,38,.98)');
  grad.addColorStop(1,'rgba(9,13,21,.99)');
  rect(x,y,w,h,14,grad,'rgba(206,158,84,.62)',2);
  ln(x+14,y+11,x+w-14,y+11,'rgba(244,207,143,.24)',1);
 }
 // Decorative chrome / black marble. No hard crop or stretching of the approved logo.
 rect(20,20,W-40,H-40,23,'rgba(11,12,18,.40)',C.gold,2);
 rect(32,32,W-64,H-64,16,'rgba(6,8,13,.08)','#4f3428',1);
 ln(52,39,1748,39,'#ecbf79',4);
 ln(52,H-43,1748,H-43,'#ecbf79',4);
 for(const corner of [[52,53],[1748,53],[52,H-57],[1748,H-57]]){
  jewel(corner[0],corner[1],11);
 }
 // Hero artwork at its original aspect ratio.
 cardBackground(55,55,1690,214);
 if(image){
  const iw=779,ih=199,xx=64,yy=64,scale=Math.min(iw/image.width,ih/image.height);
  const dw=image.width*scale,dh=image.height*scale;
  g.drawImage(image,xx+(iw-dw)/2,yy+(ih-dh)/2,dw,dh);
 }else{
  text('CHICO',135,132,'bold 100px Georgia',C.goldPale);
  text('GENERAL TEAM',150,208,'bold 34px Georgia',C.gold);
 }
 ln(861,86,861,239,'rgba(228,172,92,.40)',2);
 text('CHICO GENERAL TEAM',1702,107,'bold 29px Georgia',C.goldPale,'right');
 text(title,1702,164,'bold 53px Tajawal, Arial',C.cream,'right',815);
 text('ONE STATE RP    •    CHICO ME',1702,228,'bold 24px Arial',C.gold,'right');
 // Date + four compact, differentiated summary cards, real readings only.
 const groupRows=rows.filter(r=>['Helper','SN.Helper','Moderator'].includes(r.rank));
 const staff=groupRows.length;
 const tickets=total(groupRows.map(r=>r.tickets));
 const anyIncomplete=groupRows.some(r=>r.hasPartial);
 const flags=anyIncomplete?null:total(groupRows.map(r=>r.flags));
 const rated=groupRows.filter(r=>r.rating!==null);
 const average=rated.length?rated.reduce((acc,r)=>acc+(r.rating??0),0)/rated.length:null;
 const stats=[
  {name:'IN REPORT',value:String(staff),kind:'staff'},
  {name:'TICKETS',value:round(tickets),kind:'tickets'},
  {name:'FLAGS',value:round(flags),kind:'flags'},
  {name:'AVG. RATING',value:round(average,2),kind:'rating'}
 ];
 stats.forEach((v,i)=>{
  const w=409,x=55+i*427,y=285;
  const fill=g.createLinearGradient(x,y,x+w,y+102);
  fill.addColorStop(0,'#28131b');fill.addColorStop(.46,'#11121a');fill.addColorStop(1,'#2a111c');
  rect(x,y,w,113,11,fill,'#ba873d',2);
  rect(x+13,y+13,383,87,7,'rgba(2,5,10,.25)');
  text(v.name,x+26,y+33,'bold 18px Georgia, Arial',C.goldPale);
  text(v.value,x+w-28,y+75,'bold 44px Georgia, Arial',C.cream,'right',260);
  if(v.kind==='tickets')drawTicketIcon(x+64,y+78,48);
  else if(v.kind==='staff'){
   g.fillStyle=C.gold;g.beginPath();g.arc(x+47,y+76,12,0,Math.PI*2);g.fill();
   rect(x+27,y+89,40,9,5,C.gold);
  }else if(v.kind==='flags'){
   ln(x+41,y+52,x+41,y+101,C.goldPale,3);
   g.beginPath();g.moveTo(x+44,y+54);g.lineTo(x+83,y+54);g.lineTo(x+72,y+75);g.lineTo(x+44,y+76);g.closePath();
   g.fillStyle=C.gold;g.fill();
  }else{
   text('★',x+44,y+79,'bold 54px Georgia',C.goldPale,'left');
  }
 });
 // No tutorial captions on the picture. One tidy date band.
 rect(55,407,1690,38,8,'#1e151a','#674c35',1);
 jewel(79,426,7);
 text(range.start===range.end?range.start:range.start+'  —  '+range.end,105,426,'bold 22px Georgia',C.goldPale);
 text('CHICO ME  •  '+String(totalReadings)+' READINGS',1698,426,'bold 18px Georgia',C.gold,'right');
 const splitY=466;
 function table(rs:PosterRow[],group:G){
  const list=sorted(rs);
  const x=group.x,w=group.w,max=group.rowMax;
  const bottom=group.name.startsWith('HELPER')?1275:1045;
  cardBackground(x,splitY,w,bottom-splitY);
  titleRibbon(x+12,splitY+13,w-24,group.name,group.accent);
  const headY=splitY+96;
  rect(x+13,headY,w-26,52,6,'#402323','#c08b4c',1);
  const col={number:x+47,name:x+106,tickets:x+w-312,flags:x+w-194,rating:x+w-79};
  const f='bold 20px Georgia,Arial';
  text('#',col.number,headY+27,f,C.goldPale,'center');
  text('NAME',col.name,headY+27,f,C.goldPale);
  text('TICKETS',col.tickets,headY+27,'bold 18px Arial',C.goldPale,'center');
  text('FLAGS',col.flags,headY+27,'bold 18px Arial',C.goldPale,'center');
  text('RATING',col.rating,headY+27,'bold 18px Arial',C.goldPale,'center');
  const yStart=headY+61,rowH=33;
  list.slice(0,max).forEach((r,i)=>{
   const ry=yStart+i*rowH;
   rect(x+14,ry,w-28,rowH-3,4,i%2===0?'#1d2028':'#101720');
   rect(x+17,ry+8,4,21,1,rankAccent(r.rank));
   text(String(i+1),col.number,ry+19,'bold 18px Georgia',C.goldPale,'center');
   const maxName=col.tickets-col.name-76;
   text(limit(r.name,maxName,'bold 21px Arial'),col.name,ry+19,'bold 21px Arial',C.cream);
   if(r.rank==='SN.Helper')rect(col.tickets-72,ry+10,4,16,1,C.blue);
   const ticketColor=r.tickets===null?C.muted:r.tickets===0?C.goldPale:C.green;
   text(round(r.tickets),col.tickets,ry+19,'bold 22px Arial',ticketColor,'center');
   const flagColor=r.flags===null?C.muted:r.flags>7?C.red:r.flags>5?C.goldPale:C.green;
   text(round(r.flags),col.flags,ry+19,'bold 21px Arial',flagColor,'center');
   const ratingColor=r.rating===null?C.muted:r.rating>=4.8?C.green:C.red;
   text(round(r.rating,2),col.rating,ry+19,'bold 21px Arial',ratingColor,'center');
  });
  if(!list.length)text('—',x+w/2,yStart+70,'bold 32px Arial',C.muted,'center');
  const last=bottom-58;
  ln(x+20,last,x+w-20,last,'#5e442a',2);
  text('TOTAL TICKETS',x+28,last+28,'bold 20px Georgia',C.goldPale);
  text(round(total(list.map(r=>r.tickets))),x+w-34,last+28,'bold 27px Georgia',C.cream,'right');
 }
 const helper=rows.filter(r=>['Helper','SN.Helper'].includes(r.rank));
 const moderator=rows.filter(r=>r.rank==='Moderator');
 table(helper,groups[0]);
 table(moderator,groups[1]);
 // Distinct, accurate top-three within each requested rank pool.
 const rankColors=[C.goldPale,C.silver,C.bronze];
 function awardCard(x:number,y:number,w:number,h:number,index:number,row:PosterRow|undefined,vertical=false){
  const metallic=rankColors[index];
  const grad=g.createLinearGradient(x,y,x+w,y+h);
  grad.addColorStop(0,index===0?'#39271d':'#25232a');
  grad.addColorStop(1,'#101620');
  rect(x,y,w,h,11,grad,metallic,2);
  ln(x+11,y+10,x+w-11,y+10,'rgba(255,230,177,.25)',1);
  const cx=x+42,cy=y+(vertical?h/2:50);
  g.save();g.beginPath();g.arc(cx,cy,24,0,Math.PI*2);
  g.fillStyle=index===0?'#a66b23':index===1?'#526073':'#825032';g.fill();
  g.strokeStyle=metallic;g.lineWidth=3;g.stroke();g.restore();
  text(String(index+1),cx,cy+1,'bold 30px Georgia',C.cream,'center');
  const font=vertical?'bold 23px Arial':'bold 22px Arial';
  text(limit(row?.name||'—',w-116,font),x+82,y+(vertical?37:48),font,C.cream);
  text(row?.tickets===null||!row?'—':round(row.tickets)+' Tickets',
   x+82,y+(vertical?81:94),'bold 19px Arial',row?.tickets===null||!row?C.muted:C.goldPale);
  if(!vertical){
   rect(x+17,y+h-13,w-34,2,1,metallic);
  }
 }
 // Helpers and Senior Helpers combined — shared T1/T2/T3, no separate senior podium.
 const helperBest=best(helper);
 cardBackground(55,1292,1020,251);
 text('TOP 3',92,1329,'bold 27px Georgia',C.goldPale);
 text('HELPER + SN.HELPER',1028,1329,'bold 23px Georgia',C.gold,'right');
 ln(80,1356,1052,1356,'#72502e',2);
 for(let i=0;i<3;i++)awardCard(77+i*327,1370,313,143,i,helperBest[i]);
 // Independent moderator podium (same 1/2/3 tickets-based ranking).
 const moderatorBest=best(moderator);
 cardBackground(1091,1061,654,482);
 text('TOP 3',1130,1097,'bold 27px Georgia',C.goldPale);
 text('MODERATORS',1699,1097,'bold 23px Georgia',C.gold,'right');
 ln(1115,1125,1721,1125,'#72502e',2);
 for(let i=0;i<3;i++)awardCard(1112,1142+i*127,610,113,i,moderatorBest[i],true);
 // Subtle signature; strictly no phone / Calls imagery.
 text('CHICO GENERAL TEAM  •  ONE STATE RP',900,1573,'bold 21px Georgia',C.gold,'center');
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
 const rows=useMemo(()=>state?.admins.filter(a=>a.active&&a.in_reporting&&['Helper','SN.Helper','Moderator'].includes(a.rank)).map(a=>analyze(a,matching))||[],[state,matching]);
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
   <div><small>CHICO / DISCORD REPORT STUDIO</small><h2>تقرير Discord الأسبوعي</h2><p>ترتيب Tickets مع أفضل ثلاثة من Helper وSN.Helper معًا، وأفضل ثلاثة من Moderator.</p></div>
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
  <div className="v9-poster-preview"><canvas ref={canvas} role="img" aria-label="معاينة تقرير CHICO مع ترتيب Tickets وتوب ثلاثة لكل فئة"/></div>
  <p className="v9-poster-note">المعاينة نفسها هي ملف التصدير؛ لا توجد أرقام تجريبية أو دليل ألوان. مع عدم تسجيل قراءات تظهر علامة «—» بدل الصفر.</p>
 </section>;
}
