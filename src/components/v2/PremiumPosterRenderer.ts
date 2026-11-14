'use client';

import {buildReportGroups} from '@/lib/report-groups';

/**
 * CHICO report image v3.
 * High-resolution, single-image, data-bound Canvas renderer for both report studios.
 * Intentional negative space and typography replace the previous ornamental frames.
 * No sample values, false zeros, fake ranks, or empty winner placeholders.
 */
export type LuxuryPosterRow={
 id:string;name:string;rank:string;order:number;tickets:number|null;
 flags:number|null;rating:number|null;flagsIncomplete:boolean
};
export type PremiumTotals={tickets:number|null;flags:number|null;rating:number|null};

export function loadLuxuryArt(path:string):Promise<HTMLImageElement|null>{
 return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=path;});
}

export function renderLuxuryPoster(
 canvas:HTMLCanvasElement,rows:LuxuryPosterRow[],date:string,_staff:number,_readingsCount:number,
 art:(HTMLImageElement|null)[],title='إحصائيات يومية',serverTotals?:PremiumTotals
):void{
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const groups=buildReportGroups(rows);
 const MAX=Math.max(10,...groups.map(group=>group.rows.length));
 const ROW=Math.max(52,Math.min(76,Math.ceil(900/MAX)));
 const W=1560,M=60,GAP=26,COL=(W-2*M-GAP)/2;
 const tableY=620,thead=88,cols=53,rowsH=MAX*ROW,tableH=thead+cols+rowsH+28;
 const podiumY=tableY+tableH+27,podiumH=300;
 const H=podiumY+podiumH+116;
 canvas.width=W;canvas.height=H;
 const c=ctx;
 const C={
  background:'#090c12',surface:'#151b25',surfaceAlt:'#1b202a',
  surfaceHi:'#202631',ivory:'#f5f1e9',muted:'#b4b6c0',
  quiet:'#818a98',line:'#414044',gold:'#cda36a',lightGold:'#f2d69a',
  green:'#6bd5a0',blue:'#85bcf1',purple:'#bba2ed',red:'#fa8a89',
  amber:'#e7bb6e'
 };
 const rgba=(hex:string,a:number)=>{
  const h=hex.replace('#','');return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';
 };
 const box=(x:number,y:number,w:number,h:number,r:number,fill:string|CanvasGradient,stroke?:string,lw=1)=>{
  c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
 };
 const rule=(x:number,y:number,x2:number,y2:number,color:string=C.line,width=1)=>{
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();
 };
 const type=(str:string,x:number,y:number,size:number,color:string,opts:{
  align?:CanvasTextAlign;weight?:number;family?:string;maxWidth?:number;direction?:CanvasDirection
 }={})=>{
  c.save();c.fillStyle=color;c.textBaseline='middle';c.textAlign=opts.align||'left';
  const arabic=/[\u0600-\u06ff]/.test(str);
  c.direction=opts.direction||(arabic?'rtl':'ltr');
  const family=opts.family||(arabic?'"Tajawal","Arial",sans-serif':'"Inter","Arial",sans-serif');
  c.font=(opts.weight||700)+' '+size+'px '+family;
  if(opts.maxWidth)c.fillText(str,x,y,opts.maxWidth);else c.fillText(str,x,y);
  c.restore();
 };
 const nameFit=(str:string,max:number,base=25)=>{
  c.save();c.font='700 '+base+'px "Inter",Arial,sans-serif';
  let s=str.trim();if(!s){c.restore();return '—';}
  if(c.measureText(s).width<=max){c.restore();return s;}
  while(s.length>1&&c.measureText(s+'…').width>max)s=s.slice(0,-1);
  c.restore();return s+'…';
 };
 const num=(n:number|null,digits=0)=>n===null||!Number.isFinite(n)?'—':n.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
 const image=(img:HTMLImageElement|null,x:number,y:number,w:number,h:number,alpha=1)=>{
  if(!img?.naturalWidth)return;
  c.save();c.globalAlpha=alpha;
  const sc=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  const iw=img.naturalWidth*sc,ih=img.naturalHeight*sc;
  c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);c.restore();
 };
 const panel=(x:number,y:number,w:number,h:number,r=18)=>{
  const fill=c.createLinearGradient(x,y,x+w,y+h);
  fill.addColorStop(0,'#1e242f');fill.addColorStop(.45,'#151920');fill.addColorStop(1,'#12151d');
  box(x,y,w,h,r,fill,'rgba(202,163,109,.34)',1.5);
 };
 const ticket=(x:number,y:number,color=C.gold)=>{
  c.save();c.translate(x,y);c.beginPath();c.moveTo(-30,-20);c.lineTo(30,-20);
  c.lineTo(30,-9);c.arc(30,0,9,-Math.PI/2,Math.PI/2,true);
  c.lineTo(30,20);c.lineTo(-30,20);c.lineTo(-30,9);c.arc(-30,0,9,Math.PI/2,-Math.PI/2,true);
  c.closePath();c.lineWidth=3;c.strokeStyle=color;c.stroke();
  c.setLineDash([4,6]);rule(0,-16,0,16,color,2);c.setLineDash([]);
  c.restore();
 };
 const flag=(x:number,y:number,color=C.gold)=>{
  c.save();rule(x-17,y-22,x-17,y+24,color,3);
  c.beginPath();c.moveTo(x-16,y-22);c.quadraticCurveTo(x+1,y-29,x+22,y-17);
  c.lineTo(x+22,y+7);c.quadraticCurveTo(x+1,y-3,x-16,y+4);c.closePath();
  c.fillStyle=rgba(color,.2);c.fill();c.lineWidth=2.5;c.strokeStyle=color;c.stroke();c.restore();
 };
 // Background: restrained warm metal and dark charcoal, no noisy fake marble or oversized frame.
 const bg=c.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,'#121318');bg.addColorStop(.43,C.background);bg.addColorStop(1,'#110e13');
 c.fillStyle=bg;c.fillRect(0,0,W,H);
 const halo=c.createRadialGradient(780,80,35,780,120,850);
 halo.addColorStop(0,'rgba(109,42,39,.23)');halo.addColorStop(1,'rgba(109,42,39,0)');
 c.fillStyle=halo;c.fillRect(0,0,W,1050);
 // Quiet corner strokes establish brand without stealing space from actual data.
 rule(M,49,W-M,49,rgba(C.gold,.62),2);
 box(M,49,112,5,0,C.gold);
 rule(M,H-67,W-M,H-67,rgba(C.gold,.55),1);
 // Authentic brand assets from the checked-in CHICO art collection.
 image(art[1]||art[0]||null,84,83,188,181);
 image(art[0]||null,W-282,99,184,148,.85);
 type('CHICO',305,163,89,C.ivory,{family:'Georgia,serif',weight:700});
 type('GENERAL TEAM',308,220,28,C.gold,{weight:800});
 type('ONE STATE  /  EXECUTIVE REPORT',W-88,265,20,C.muted,{align:'right',weight:650});
 rule(M,304,W-M,304,rgba(C.gold,.25),1);
 type(title,W/2,364,49,C.ivory,{align:'center',weight:900,maxWidth:1250});
 type(date,W/2,415,26,C.gold,{align:'center',weight:700,family:'"Inter",Arial,sans-serif'});
 // Primary metrics only: no Total Staff or Average Rate at user request.
 const included=rows.some(r=>r.flagsIncomplete);
 const getTotals=()=>({
  tickets:serverTotals?serverTotals.tickets:sum(rows.map(x=>x.tickets)),
  flags:serverTotals?serverTotals.flags:included?null:sum(rows.map(x=>x.flags))
 });
 function sum(ns:(number|null)[]):number|null{
  const known=ns.filter((v):v is number=>v!==null&&Number.isFinite(v));
  return known.length?known.reduce((s,v)=>s+v,0):null;
 }
 const totals=getTotals();
 const kpis=[
  {name:'TICKETS',value:num(totals.tickets),glyph:ticket},
  {name:'FLAGS',value:num(totals.flags),glyph:flag}
 ];
 const metricsY=459,metricsH=132;
 kpis.forEach((item,i)=>{
  const x=M+i*(COL+GAP);
  panel(x,metricsY,COL,metricsH,16);
  box(x+20,metricsY+18,4,metricsH-36,2,C.gold);
  item.glyph(x+94,metricsY+69,C.gold);
  type(item.name,x+152,metricsY+43,22,C.muted,{weight:800});
  type(item.value,x+153,metricsY+94,57,C.ivory,{weight:850,maxWidth:COL-212});
 });
 type('الفريق والإحصائيات',W-M,600,16,C.quiet,{align:'right',weight:700});
 // Entire section is one balanced grid. Rows never stretch apart to fill missing moderator staff.
 const drawList=(index:number)=>{
  const data=groups[index],x=M+index*(COL+GAP);
  const w=COL;panel(x,tableY,w,tableH,16);
  const accent=index===0?C.green:C.purple;
  box(x+22,tableY+21,5,46,2,accent);
  type(index===0?'HELPERS':'MODERATORS',x+43,tableY+48,32,C.ivory,{weight:850});
  type(String(data.rows.length).padStart(2,'0'),x+w-34,tableY+48,25,C.muted,{align:'right'});
  rule(x+24,tableY+87,x+w-24,tableY+87,rgba(C.gold,.28),1);
  const hd=tableY+thead;
  box(x+20,hd,w-40,cols-7,8,'rgba(195,160,104,.11)');
  type('NAME',x+87,hd+23,19,C.muted,{weight:800});
  type('TICKETS',x+443,hd+23,17,C.muted,{align:'center',weight:800});
  type('FLAGS',x+544,hd+23,17,C.muted,{align:'center',weight:800});
  type('RATE',x+642,hd+23,17,C.muted,{align:'center',weight:800});
  const rY=hd+cols;
  if(data.rows.length===0){
   type('لا توجد بيانات مسجلة',x+w/2,rY+ROW*2,28,C.muted,{align:'center',maxWidth:w-80});
  }
  const itemHeight=rowsH/Math.max(data.rows.length,1);
  data.rows.forEach((row,i)=>{
   const itemY=rY+i*itemHeight;
   const alt=i%2===0?'rgba(255,255,255,.026)':'rgba(255,255,255,.008)';
   box(x+20,itemY+2,w-40,itemHeight-4,7,alt);
   box(x+21,itemY+10,3,itemHeight-20,2,
    row.rank==='SN.Helper'?C.blue:row.rank==='Moderator'?C.purple:C.green);
   type(String(i+1).padStart(2,'0'),x+39,itemY+itemHeight/2,18,C.quiet);
   type(nameFit(row.name,218,24),x+86,itemY+itemHeight/2,24,C.ivory,{weight:700,maxWidth:218});
   const tag=row.rank==='SN.Helper'?'SN':row.rank==='Moderator'?'M':'H';
   const color=row.rank==='SN.Helper'?C.blue:row.rank==='Moderator'?C.purple:C.green;
   box(x+319,itemY+itemHeight/2-15,38,30,8,rgba(color,.14),rgba(color,.45));
   type(tag,x+338,itemY+itemHeight/2,17,color,{align:'center',weight:800});
   type(num(row.tickets),x+443,itemY+itemHeight/2,23,row.tickets===null?C.quiet:C.ivory,{align:'center',weight:800,maxWidth:94});
   const flagColor=row.flags===null?C.quiet:row.flags>7?C.red:row.flags>5?C.amber:row.flags===0?C.green:C.ivory;
   type(num(row.flags),x+544,itemY+itemHeight/2,23,flagColor,{align:'center',weight:800,maxWidth:91});
   const rateColor=row.rating===null?C.quiet:row.rating>=4.8?C.green:C.red;
   type(num(row.rating,2),x+642,itemY+itemHeight/2,21,rateColor,{align:'center',weight:800,maxWidth:93});
  });
  const bottom=tableY+thead+cols+rowsH+12;
  rule(x+24,bottom,x+w-24,bottom,rgba(C.gold,.24),1);
 };
 drawList(0);drawList(1);
 // Same Top-3 height/position for both divisions. Never insert fake winners.
 const medals=[C.lightGold,'#d6e0e8','#d6a17b'];
 const drawPodium=(index:number)=>{
  const data=groups[index],x=M+index*(COL+GAP),w=COL;
  panel(x,podiumY,w,podiumH,16);
  type(index===0?'TOP 3 HELPERS':'TOP 3 MODERATORS',x+30,podiumY+43,29,C.ivory,{weight:850});
  rule(x+30,podiumY+77,x+w-30,podiumY+77,rgba(C.gold,.27));
  if(data.topRows.length===0){
   type('لا يوجد ترتيب موثق',x+w/2,podiumY+179,26,C.muted,{align:'center'});
   return;
  }
  const each=(w-70)/3;
  data.topRows.forEach((row,i)=>{
   const xx=x+25+i*each,top=podiumY+102,cx=xx+each/2;
   box(xx,top,each-10,167,12,'rgba(255,255,255,.034)',rgba(medals[i],.36),1);
   type('TOP '+(i+1),cx,top+32,21,medals[i],{align:'center',weight:850});
   type(nameFit(row.name,each-34,22),cx,top+84,22,C.ivory,{align:'center',maxWidth:each-29});
   rule(xx+18,top+111,xx+each-28,top+111,rgba(medals[i],.24));
   ticket(cx-38,top+140,medals[i]);
   // Ticket icon is rendered at 60px width, value starts beyond its right edge.
   type(num(row.tickets),cx+16,top+140,24,C.ivory,{align:'center',weight:850,maxWidth:each-95});
  });
 };
 drawPodium(0);drawPodium(1);
 type('CHICO ME   •   ONE STATE RP',W/2,H-39,19,C.gold,{align:'center',weight:800});
}
