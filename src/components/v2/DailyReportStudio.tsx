'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download} from 'lucide-react';
import type {Admin,Reading,State} from '@/lib/types';
import {summarizeReadings,weekStart} from '@/lib/rules';

type Props={state:State|null;review:boolean};
export type LuxuryPosterRow={id:string;name:string;rank:string;order:number;tickets:number|null;flags:number|null;rating:number|null;flagsIncomplete:boolean};
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=(n:number|null,dec=0)=>n===null?'—':n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const sum=(values:(number|null)[])=>{const present=values.filter((n):n is number=>n!==null);return present.length?present.reduce((a,b)=>a+b,0):null;};
const eligible=(a:Admin)=>a.active&&a.in_reporting&&['Helper','SN.Helper','Moderator'].includes(a.rank);
function dailyRow(admin:Admin,readings:Reading[]):LuxuryPosterRow{
 const own=readings.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const flagsIncomplete=own.some(r=>r.flags_counter!==null&&r.flags_delta===null);
 return {id:admin.id,name:admin.name,rank:admin.rank,order:admin.sort_order,
  tickets:sum(own.map(r=>r.tickets_delta)),
  flags:flagsIncomplete?null:sum(own.map(r=>r.flags_delta)),
  rating:own.find(r=>r.rating!==null)?.rating??null,flagsIncomplete};
}
function orderRows(rows:LuxuryPosterRow[]):LuxuryPosterRow[]{
 return [...rows].sort((a,b)=>{
  if((a.tickets===null)!==(b.tickets===null))return a.tickets===null?1:-1;
  if(a.tickets!==null&&b.tickets!==null&&a.tickets!==b.tickets)return b.tickets-a.tickets;
  return a.order-b.order||a.name.localeCompare(b.name,'en');
 });
}
export function loadLuxuryArt(path:string):Promise<HTMLImageElement|null>{
 return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=path;});
}
export type PremiumTotals={tickets:number|null;flags:number|null;rating:number|null};
export function renderLuxuryPoster(
 canvas:HTMLCanvasElement,rows:LuxuryPosterRow[],date:string,staff:number,readingsCount:number,
 art:(HTMLImageElement|null)[],title='إحصائيات يومية',serverTotals?:PremiumTotals
){
 const groups=[
  {name:'HELPERS + SN.HELPERS',rows:orderRows(rows.filter(r=>r.rank==='Helper'||r.rank==='SN.Helper')),x:45},
  {name:'MODERATORS',rows:orderRows(rows.filter(r=>r.rank==='Moderator')),x:763}
 ];
 const count=Math.max(16,...groups.map(g=>g.rows.length));
 const W=1500,tableY=632,rowH=47,tableH=count*rowH+240;
 const podiumY=tableY+tableH+37,H=podiumY+350;
 canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const g=ctx;
 const P={gold:'#f2b94b',bright:'#ffe5a3',cream:'#fff4dc',red:'#b12121',green:'#54eb8a',dim:'#a99a86',silver:'#e2eaf1',bronze:'#f3ac6e'};
 const rgb=(color:string,alpha:number)=>color.startsWith('#')?('rgba('+parseInt(color.slice(1,3),16)+','+parseInt(color.slice(3,5),16)+','+parseInt(color.slice(5,7),16)+','+alpha+')'):color;
 const text=(value:string,x:number,y:number,size:number,color:string|CanvasGradient=P.cream,align:CanvasTextAlign='center',max?:number,weight='bold')=>{
  g.save();g.fillStyle=color;g.textAlign=align;g.textBaseline='middle';g.direction=/[\u0600-\u06ff]/.test(value)?'rtl':'ltr';
  g.font=weight+' '+size+'px '+(/[\u0600-\u06ff]/.test(value)?'Arial, sans-serif':'Georgia, Arial, sans-serif');
  g.shadowBlur=2;g.shadowColor='rgba(0,0,0,.85)';
  if(max)g.fillText(value,x,y,max);else g.fillText(value,x,y);
  g.restore();
 };
 const line=(x:number,y:number,x2:number,y2:number,color:string=P.gold,width=2)=>{
  g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.strokeStyle=color;g.lineWidth=width;g.stroke();
 };
 const rect=(x:number,y:number,w:number,h:number,r=10,color:string|CanvasGradient='#0d0b10',stroke?:string|CanvasGradient,lw=2)=>{
  g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=color;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}
 };
 const metallic=(x:number,y:number,w:number,h:number)=>{
  const z=g.createLinearGradient(x,y,x+w,y+h);
  z.addColorStop(0,'#955016');z.addColorStop(.14,'#ffe4a1');z.addColorStop(.34,'#9a5614');z.addColorStop(.64,'#ffd17a');z.addColorStop(.84,'#8b4710');z.addColorStop(1,'#ffe5a3');return z;
 };
 const panel=(x:number,y:number,w:number,h:number,r=14)=>{
  g.save();g.shadowColor='rgba(255,163,37,.29)';g.shadowBlur=14;g.shadowOffsetY=3;
  const fill=g.createLinearGradient(x,y,x+w,y+h);fill.addColorStop(0,'#340909');fill.addColorStop(.21,'#1b0c11');fill.addColorStop(.55,'#06080a');fill.addColorStop(1,'#310909');
  rect(x,y,w,h,r,fill,metallic(x,y,w,h),5);g.restore();
  rect(x+8,y+8,w-16,h-16,Math.max(3,r-5),'rgba(0,0,0,.10)','rgba(255,208,128,.40)',1);
 };
 const ellipse=(x:number,y:number,rx:number,ry:number,color:string|CanvasGradient)=>{
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill();
 };
 const fit=(value:string,max:number,size:number)=>{
  g.save();g.font='bold '+size+'px Arial';
  let trimmed=value;while(trimmed.length>2&&g.measureText(trimmed).width>max)trimmed=trimmed.slice(0,-1);
  g.restore();return trimmed===value?trimmed:trimmed+'…';
 };
 const imageContain=(img:HTMLImageElement|null,x:number,y:number,w:number,h:number)=>{
  if(!img?.naturalWidth)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
  g.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
 };
 const imageCover=(img:HTMLImageElement|null,x:number,y:number,w:number,h:number)=>{
  if(!img?.naturalWidth)return false;
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const sw=w/scale,sh=h/scale;
  g.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x,y,w,h);
  return true;
 };
 const ticket=(x:number,y:number,s:number)=>{
  g.save();g.translate(x,y);g.rotate(-.38);g.scale(s/60,s/60);
  g.beginPath();g.moveTo(-25,-16);g.lineTo(25,-16);g.lineTo(25,-7);
  g.arc(25,0,7,-Math.PI/2,Math.PI/2,true);g.lineTo(25,16);g.lineTo(-25,16);
  g.lineTo(-25,7);g.arc(-25,0,7,Math.PI/2,-Math.PI/2,true);g.closePath();
  const grad=g.createLinearGradient(-20,-20,20,20);
  grad.addColorStop(0,'#ffecb1');grad.addColorStop(.55,'#d48a17');grad.addColorStop(1,'#fff1bf');
  g.fillStyle=grad;g.fill();g.lineWidth=3;g.strokeStyle='#693b0d';g.stroke();
  g.setLineDash([4,4]);line(0,-12,0,12,'#66330c',2);g.setLineDash([]);g.restore();
 };
 const star=(x:number,y:number,r:number,color:string)=>{
  g.save();g.beginPath();for(let i=0;i<10;i++){const radius=i%2?r*.44:r,ang=Math.PI*i/5-Math.PI/2;
   const xx=x+Math.cos(ang)*radius,yy=y+Math.sin(ang)*radius;if(i===0)g.moveTo(xx,yy);else g.lineTo(xx,yy);
  }g.closePath();g.fillStyle=color;g.fill();g.restore();
 };
 // Dark marble with thin gold veins and dramatic red corners.
 const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#030508');bg.addColorStop(.35,'#141114');bg.addColorStop(.66,'#07080b');bg.addColorStop(1,'#0b0306');
 g.fillStyle=bg;g.fillRect(0,0,W,H);
 for(let i=0;i<230;i++){
  const x=(i*353+17)%W,y=(i*997+31)%H;
  line(x,y,x+((i*97)%160)-80,y+((i*61)%100)-50,i%3===0?'rgba(241,178,63,.18)':'rgba(230,211,171,.055)',i%7===0?2:1);
 }
 const halo=g.createRadialGradient(W/2,90,3,W/2,90,770);
 halo.addColorStop(0,'rgba(204,43,29,.23)');halo.addColorStop(1,'rgba(110,12,19,0)');
 g.fillStyle=halo;g.fillRect(0,0,W,1000);
 for(const d of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]] as const){
  g.save();g.translate(d[0],d[1]);g.rotate(Math.atan2(d[3],d[2]));
  rect(-25,-42,350,45,0,'#67060c',metallic(-25,-42,350,45),7);
  rect(-25,14,312,16,0,'#e73323',P.bright,2);g.restore();
 }
 rect(17,17,W-34,H-34,22,'rgba(7,8,12,.20)',metallic(17,17,W-34,H-34),8);
 rect(28,28,W-56,H-56,17,'rgba(0,0,0,.06)','rgba(255,211,126,.66)',2);
 // Hero built with the actual approved team banner, never a fabricated logo.
 panel(45,47,1410,244,22);
 g.save();g.beginPath();g.roundRect(57,58,1386,223,13);g.clip();
 if(!imageCover(art[2]||null,57,58,1386,223)){
  imageContain(art[0]||null,102,65,240,207);
  imageContain(art[1]||null,1154,65,240,207);
  text('♛',750,78,55,P.bright);
  text('CHICO',750,161,123,P.bright);
  text('G E N E R A L   T E A M',750,244,27,P.gold);
 }
 g.restore();
 panel(275,303,950,97,12);
 const titleGrad=g.createLinearGradient(0,311,0,390);titleGrad.addColorStop(0,'#fff7d8');titleGrad.addColorStop(.5,'#ffd06f');titleGrad.addColorStop(1,'#ba7218');
 text(title,750,351,65,titleGrad as unknown as string,'center',890);
 panel(504,405,492,46,10);
 text('✦  CHICO ME  ✦  '+date+'  ✦',750,427,24,P.bright,'center',460);
 // Bigger KPI ribbon with meaningful color and ticket-only glyph.
 const rated=rows.filter(r=>r.rating!==null);
 const calculatedRate=rated.length?rated.reduce((n,r)=>n+(r.rating??0),0)/rated.length:null;
 const incompletes=rows.some(r=>r.flagsIncomplete);
 const format=(v:number|null,dp=0)=>v===null?'—':v.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp});
 const metrics=[
  {label:'TOTAL STAFF',value:String(staff),icon:'staff'},
  {label:'TICKETS',value:format(serverTotals?serverTotals.tickets:sum(rows.map(r=>r.tickets))),icon:'ticket'},
  {label:'FLAGS',value:format(serverTotals?serverTotals.flags:(incompletes?null:sum(rows.map(r=>r.flags)))),icon:'flag'},
  {label:'AVG. RATE',value:format(serverTotals?serverTotals.rating:calculatedRate,2),icon:'rate'}
 ];
 metrics.forEach((m,i)=>{
  const x=45+i*358,y=468;panel(x,y,336,139,13);
  text(m.label,x+190,y+33,25,P.bright,'center',262);
  const vg=g.createLinearGradient(x,y+75,x+300,y+110);vg.addColorStop(0,'#6d0809');vg.addColorStop(.55,'#240408');vg.addColorStop(1,'#8b090b');
  rect(x+122,y+74,195,49,15,vg,P.gold,2);
  text(m.value,x+222,y+98,37,P.cream,'center',180);
  if(m.icon==='ticket')ticket(x+73,y+99,68);
  else if(m.icon==='rate')star(x+74,y+97,35,P.gold);
  else if(m.icon==='flag'){line(x+56,y+127,x+56,y+69,P.bright,5);rect(x+58,y+67,47,27,2,P.gold);}
  else {for(let j=0;j<3;j++)ellipse(x+57+j*21,y+97+(j===1?-8:3),13,15,P.gold);}
  line(x+14,y+13,x+322,y+13,'rgba(255,214,127,.43)',1.4);
 });
 // Tables emphasize readable type, aligned columns and colored rate/flag pills.
 const drawTable=(group:{name:string;rows:LuxuryPosterRow[];x:number})=>{
  const {x}=group,w=692;panel(x,tableY,w,tableH,17);
  panel(x+16,tableY+15,w-32,74,11);
  text(group.name,x+w/2,tableY+52,32,P.bright,'center',w-90);
  const hy=tableY+103,col={num:x+47,name:x+105,ticket:x+425,flag:x+528,rate:x+628};
  const hd=g.createLinearGradient(x,hy,x+w,hy+48);hd.addColorStop(0,'#52240e');hd.addColorStop(.52,'#210e0e');hd.addColorStop(1,'#5c2b11');
  rect(x+18,hy,w-36,47,5,hd,'#e8a743',1.8);
  text('#',col.num,hy+23,24,P.cream);
  text('NAME',col.name,hy+23,24,P.cream,'left');
  text('TICKETS',col.ticket,hy+23,22,P.cream);
  text('FLAGS',col.flag,hy+23,21,P.cream);
  text('RATE',col.rate,hy+23,22,P.cream);
  for(let i=0;i<group.rows.length;i++){
   const r=group.rows[i],y=hy+56+i*rowH;
   rect(x+18,y,w-36,rowH-3,3,i%2===0?'rgba(14,16,21,.93)':'rgba(36,25,23,.93)');
   text(String(i+1),col.num,y+22,22,P.gold);
   const label=r.rank==='SN.Helper'?'◆ '+r.name:r.name;
   text(fit(label,307,26),col.name,y+22,26,P.cream,'left',302);
   const tColor=r.tickets===null?P.dim:'#baffcc';
   rect(col.ticket-55,y+8,110,31,10,r.tickets===null?'#1e191b':'#064627');
   text(format(r.tickets),col.ticket,y+23,24,tColor);
   const fc=r.flags===null?P.dim:r.flags>7?'#ff7f70':r.flags>5?'#ffdd7f':r.flags===0?P.green:P.cream;
   rect(col.flag-40,y+8,80,31,9,r.flags===null?'#1e191b':r.flags>7?'#600f1a':'#242019');
   text(format(r.flags),col.flag,y+23,22,fc);
   const rateCol=r.rating===null?P.dim:r.rating>=4.8?P.green:'#ff7d78';
   rect(col.rate-40,y+8,80,31,9,r.rating===null?'#1e191b':r.rating>=4.8?'#063f27':'#68121a');
   text(format(r.rating,2),col.rate,y+23,21,rateCol);
  }
  if(!group.rows.length)text('لا يوجد إداريون في هذه الفئة',x+w/2,hy+93,24,P.dim);
  const fy=tableY+tableH-46;
  line(x+25,fy-24,x+w-25,fy-24,P.gold,2);
  text('TOTAL TICKETS',x+42,fy,24,P.bright,'left');
  text(format(sum(group.rows.map(r=>r.tickets))),x+w-45,fy,30,P.cream,'right');
 };
 groups.forEach(drawTable);
 // Horizontal awards: only display populated awards; no empty podium winners.
 const medals=[P.bright,P.silver,P.bronze];
 const award=(group:{name:string;rows:LuxuryPosterRow[];x:number})=>{
  const {x}=group,w=692;panel(x,podiumY,w,306,17);
  panel(x+18,podiumY+17,w-36,62,9);
  text('TOP 3 — '+group.name,x+w/2,podiumY+49,31,P.bright,'center',w-70);
  const winners=group.rows.filter(r=>r.tickets!==null).slice(0,3);
  if(winners.length===0){
   text('لا توجد نتائج مسجلة لهذه الفترة',x+w/2,podiumY+178,27,P.dim);
   return;
  }
  for(let i=0;i<winners.length;i++){
   const r=winners[i],cx=x+121+i*226,cy=podiumY+156;
   g.save();g.shadowColor=rgb(medals[i],.72);g.shadowBlur=28;
   if(art[3+i])imageContain(art[3+i],cx-77,cy-71,154,139);
   else {
    const gr=g.createRadialGradient(cx-17,cy-20,4,cx,cy,63);
    gr.addColorStop(0,'#fffbe8');gr.addColorStop(.46,medals[i]);gr.addColorStop(1,'#84430b');
    ellipse(cx,cy,62,62,gr as unknown as string);
    text('#'+(i+1),cx,cy+3,48,'#29130d');
   }
   g.restore();
   rect(cx-104,podiumY+231,208,35,9,'#110b11',P.gold,2);
   text(fit(r.name,195,25),cx,podiumY+249,25,P.cream,'center',198);
   ticket(cx-45,podiumY+283,29);
   text(format(r.tickets),cx+24,podiumY+282,25,P.bright,'center',115);
  }
 };
 groups.forEach(award);
 const footerY=H-42;
 line(65,footerY-25,W-65,footerY-25,P.gold,2);
 text('CHICO GENERAL TEAM  •  ONE STATE RP  •  '+readingsCount+' READINGS',W/2,footerY,22,P.bright);
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
 const totals=useMemo(()=>{const allowed=new Set(state?.admins.filter(a=>a.rank!=='Responsible'&&a.in_reporting).map(a=>a.id)||[]);
  const metrics=summarizeReadings(readings.filter(r=>allowed.has(r.admin_id)));
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
  if(!canvas.current||!state||review||downloading||!valid)return;
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
   <button className="v9-primary" type="button" disabled={review||!state||!valid||downloading} onClick={download}><Download size={18}/>{downloading?'جاري تجهيز الصورة…':'تنزيل التقرير PNG'}</button>
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
  <div className="v9-poster-preview"><canvas ref={canvas} role="img" aria-label={'تقرير CHICO '+label} style={{width:'100%',maxWidth:1100,height:'auto',aspectRatio:'auto'}}/></div>
  <p className="v9-poster-note">General قائد الفريق يظهر في عدد الأعضاء، لكنه خارج التقييم والترتيب. الأسماء والبيانات مأخوذة من القراءات الفعلية. كل Top 3 مبني على Tickets فقط.</p>
 </section>;
}
