'use client';

import {buildReportGroups} from '@/lib/report-groups';

/**
 * CHICO / Discord Prestige Edition.
 * Data-bound Canvas recreation of the approved black/red/gold portrait poster.
 * The visual shell is drawn independently of the readings. Never use a static
 * screenshot with baked-in stats; every number and name comes from real data.
 */
export type LuxuryPosterRow={
 id:string;name:string;rank:string;order:number;tickets:number|null;
 flags:number|null;rating:number|null;flagsIncomplete:boolean
};
export type PremiumTotals={tickets:number|null;flags:number|null;rating:number|null};

export function loadLuxuryArt(path:string):Promise<HTMLImageElement|null>{
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=path;
 });
}

/** Display role separately; keep the original game name unchanged in storage. */
export function prestigeName(name:string,rank:string):string{
 const trimmed=name.trim();
 if(rank==='Moderator')return trimmed.replace(/^M\./i,'');
 if(rank==='SN.Helper')return trimmed.replace(/^SN\./i,'');
 return trimmed;
}

export function renderLuxuryPoster(
 canvas:HTMLCanvasElement,rows:LuxuryPosterRow[],date:string,_staff:number,_readingsCount:number,
 art:(HTMLImageElement|null)[],title='إحصائيات الفترة المحددة',serverTotals?:PremiumTotals
):void{
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const groups=buildReportGroups(rows);
 const maxRows=Math.max(16,...groups.map(g=>g.rows.length));
 const extra=Math.max(0,maxRows-16)*29;
 const W=1122,H=1402+extra,scale=1560/W;
 canvas.width=1560;canvas.height=Math.round(H*scale);
 const c=ctx;
 c.save();c.scale(scale,scale);
 const P={
  black:'#050506',dark:'#100b0a',wine:'#350b0a',red:'#9e2514',
  gold:'#dc951f',bright:'#ffe3a0',edge:'#a96713',
  pearl:'#f6f0dc',muted:'#c5a982',subtle:'#b1a69e',
  green:'#53e5a8',blue:'#64b5ff',purple:'#d69aff',
  danger:'#ff7869',silver:'#d3dae3',bronze:'#df925a'
 };
 function gradient(x:number,y:number,x2:number,y2:number,stops:Array<[number,string]>){
  const g=c.createLinearGradient(x,y,x2,y2);
  stops.forEach(([p,color])=>g.addColorStop(p,color));return g;
 }
 function rect(x:number,y:number,w:number,h:number,fill:string|CanvasGradient,r=0,stroke?:string,lw=1){
  c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();
  if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke();}
 }
 function line(x:number,y:number,x2:number,y2:number,color:string=P.gold,width=1){
  c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
 }
 function path(points:number[][],fill:string|CanvasGradient,stroke?:string,lw=1){
  c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
  c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke();}
 }
 function text(value:string,x:number,y:number,size:number,color:string|CanvasGradient,options:{
  align?:CanvasTextAlign;weight?:number;family?:string;maxWidth?:number;shadow?:boolean
 }={}){
  c.save();c.textBaseline='middle';c.textAlign=options.align||'left';
  c.direction=/[\u0600-\u06ff]/.test(value)?'rtl':'ltr';
  c.font=String(options.weight||700)+' '+String(size)+'px '+(options.family||(/[\u0600-\u06ff]/.test(value)?'"Tajawal",Arial,sans-serif':'"Inter",Arial,sans-serif'));
  c.fillStyle=color;
  if(options.shadow){c.shadowColor='rgba(255,180,62,.47)';c.shadowBlur=8;}
  if(options.maxWidth)c.fillText(value,x,y,options.maxWidth);else c.fillText(value,x,y);
  c.restore();
 }
 function centered(value:string,x:number,y:number,size:number,color:string|CanvasGradient,options:{
  weight?:number;family?:string;maxWidth?:number;shadow?:boolean
 }={}){text(value,x,y,size,color,{...options,align:'center'});}
 function fitName(value:string,rank:string,maxWidth:number,size:number){
  let s=prestigeName(value,rank)||'—';
  c.save();c.font='700 '+size+'px "Inter",Arial,sans-serif';
  while(s.length>1&&c.measureText(s).width>maxWidth)s=s.slice(0,-1);
  c.restore();return s===prestigeName(value,rank)?s:s.slice(0,-1)+'…';
 }
 function amount(n:number|null,digits=0){
  return n===null||!Number.isFinite(n)?'—':n.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
 }
 function star(x:number,y:number,r:number,color:string=P.bright){
  const pts:number[][]=[];
  for(let i=0;i<8;i++){const angle=Math.PI*i/4-Math.PI/2,d=i%2===0?r:r*.18;pts.push([x+Math.cos(angle)*d,y+Math.sin(angle)*d]);}
  c.save();c.shadowColor='#faba5a';c.shadowBlur=12;
  path(pts,color);c.restore();
 }
 function gleam(x:number,y:number,r=8){star(x,y,r,'#fff2c9');}
 function coin(x:number,y:number,r:number){
  c.save();
  c.beginPath();c.arc(x,y,r+6,0,Math.PI*2);
  c.fillStyle='#180a08';c.fill();
  c.shadowColor='rgba(241,150,33,.55)';c.shadowBlur=17;
  c.beginPath();c.arc(x,y,r+1,0,Math.PI*2);
  c.strokeStyle=gradient(x-r,y-r,x+r,y+r,[[0,'#fff1bc'],[.35,'#99520c'],[.65,'#e9a342'],[1,'#ffeab4']]);
  c.lineWidth=7;c.stroke();c.restore();
  c.beginPath();c.arc(x,y,r-8,0,Math.PI*2);c.strokeStyle='#f4c262';c.lineWidth=1.6;c.stroke();
 }
 function drawImage(img:HTMLImageElement|null,x:number,y:number,w:number,h:number){
  if(!img||!img.naturalWidth)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),a=img.naturalWidth*scale,b=img.naturalHeight*scale;
  c.drawImage(img,x+(w-a)/2,y+(h-b)/2,a,b);
 }
 function crown(x:number,y:number,size:number){
  const w=size,h=size*.6;
  path([[x-w/2,y+h*.25],[x-w*.44,y-h*.40],[x-w*.15,y-h*.04],[x,y-h*.65],[x+w*.15,y-h*.04],[x+w*.44,y-h*.40],[x+w/2,y+h*.25]],
   gradient(x,y-h,x,y+h,[[0,'#fff7d4'],[.3,'#f4bf3d'],[.68,'#9e4e09'],[1,'#ffd77a']]),'#ffd37b',1.2);
  rect(x-w*.48,y+h*.22,w*.96,h*.15,'#c68621',1,'#fff1bd');
  gleam(x,y-h*.65,3);
 }
 function frame(x:number,y:number,w:number,h:number,r=8,rich=true){
  c.save();c.shadowColor=rich?'rgba(251,145,30,.38)':'rgba(255,175,57,.15)';c.shadowBlur=rich?11:5;
  rect(x,y,w,h,gradient(x,y,x+w,y+h,[[0,'#c17a0e'],[.18,'#ffda69'],[.40,'#783608'],[.67,'#f4af2e'],[1,'#e9bc56']]),r,'#fff1b1',1);
  c.restore();
  rect(x+4,y+4,w-8,h-8,'#0b0809',Math.max(0,r-3),'#63310c',1);
  rect(x+7,y+7,w-14,h-14,gradient(x,y,x+w,y+h,[[0,'#1d0b0b'],[.37,'#0d0d0f'],[1,'#100b0c']]),Math.max(0,r-5),'rgba(246,177,59,.55)',.75);
  line(x+12,y+11,x+w-12,y+11,'rgba(255,221,116,.55)',1);
 }
 function redRibbon(x:number,y:number,w:number,h:number){
  // Approved artwork: a clean burgundy header, no stepped yellow stripes.
  rect(x,y,w,h,gradient(x,y,x+w,y+h,[[0,'#390b0b'],[.45,'#7c1210'],[1,'#21090b']]),6,'#c28b38',1.3);
  line(x+9,y+4,x+w-9,y+4,'rgba(255,202,112,.68)',1);
  line(x+9,y+h-4,x+w-9,y+h-4,'rgba(255,181,77,.32)',.8);
 }
 function surface(x:number,y:number,w:number,h:number){
  rect(x,y,w,h,gradient(x,y,x+w,y+h,[[0,'#211013'],[.22,'#0b0d0e'],[.75,'#0c0a0a'],[1,'#1a090a']]),7,'rgba(255,197,89,.32)',1);
  c.save();c.globalAlpha=.10;
  for(let iy=y+3;iy<y+h-4;iy+=9)line(x+3,iy,x+w-3,iy,'#b58c4d',.35);
  c.restore();
 }
 function ticket(x:number,y:number,size:number,color=P.bright){
  c.save();c.translate(x,y);c.scale(size/60,size/60);
  c.shadowColor='rgba(252,170,39,.50)';c.shadowBlur=9;
  const gold=gradient(-31,-20,31,21,[[0,'#fff4cd'],[.29,color],[.65,'#92500b'],[1,'#ffdfa0']]);
  c.beginPath();c.moveTo(-30,-17);c.lineTo(30,-17);c.lineTo(30,-9);
  c.quadraticCurveTo(19,-7,19,0);c.quadraticCurveTo(19,7,30,9);
  c.lineTo(30,17);c.lineTo(-30,17);c.lineTo(-30,9);
  c.quadraticCurveTo(-19,7,-19,0);c.quadraticCurveTo(-19,-7,-30,-9);c.closePath();
  c.fillStyle='#3a1a0c';c.fill();c.strokeStyle=gold;c.lineWidth=4;c.stroke();
  c.shadowBlur=0;line(-14,-12,-14,12,color,1.5);
  const five=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?8:3.8;five.push([2+Math.cos(a)*r,Math.sin(a)*r]);}
  path(five,color);
  c.restore();
 }
 function flag(x:number,y:number,size:number){
  c.save();c.translate(x,y);c.scale(size/60,size/60);
  line(-23,-26,-23,27,P.bright,4);
  c.beginPath();c.moveTo(-21,-24);c.quadraticCurveTo(1,-30,26,-18);c.lineTo(26,10);
  c.quadraticCurveTo(4,0,-21,8);c.closePath();
  c.fillStyle=gradient(-22,-21,25,7,[[0,'#fff3ae'],[.4,'#efaa2c'],[1,'#a4530c']]);c.fill();
  c.strokeStyle='#ffe09b';c.lineWidth=1.5;c.stroke();c.restore();
 }
 function rankBadge(rank:string,x:number,y:number){
  const color=rank==='SN.Helper'?P.blue:rank==='Moderator'?P.purple:P.green;
  const tag=rank==='SN.Helper'?'SH':rank==='Moderator'?'M':'H';
  const ww=rank==='SN.Helper'?26:24,hh=19;
  c.save();c.shadowColor='rgba(255,194,77,.22)';c.shadowBlur=5;
  path([[x-ww/2,y-hh/2],[x+ww/2,y-hh/2],[x+ww/2+2,y-4],[x+ww/2-3,y+hh/2-1],
   [x,y+hh/2+5],[x-ww/2+3,y+hh/2-1],[x-ww/2-2,y-4]],
   gradient(x,y-hh,x,y+hh,[[0,'#643b17'],[.35,'#1a1424'],[1,'#120c16']]),P.bright,1.2);
  c.restore();
  path([[x-ww/2+3,y-hh/2+3],[x+ww/2-3,y-hh/2+3],[x+ww/2-3,y+3],[x,y+hh/2+1],
    [x-ww/2+3,y+3]],'rgba(27,20,23,.6)',color,.9);
  // Small shield only: no gold wings/diagonal slashes behind the rank column.
  centered(tag,x,y+1,rank==='SN.Helper'?8.8:10,color,{weight:900});
 }
 // 01 — Original poster palette: black basalt, crimson beams, bright gilded trim.
 const bg=gradient(0,0,W,H,[[0,'#170b0c'],[.24,'#070607'],[.73,'#080809'],[1,'#170709']]);
 c.fillStyle=bg;c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(W/2,110,12,W/2,130,780);
 glow.addColorStop(0,'rgba(152,38,10,.25)');glow.addColorStop(.6,'rgba(81,20,9,.08)');glow.addColorStop(1,'rgba(0,0,0,0)');
 c.fillStyle=glow;c.fillRect(0,0,W,980);
 for(let i=0;i<8;i++){
  const off=i*15;
  line(-45,25+off,190+off,-65,'rgba(244,164,45,'+String(Math.max(.04,.35-i*.038))+')',i===0?5:1.5);
  line(W+45,25+off,W-190-off,-65,'rgba(244,164,45,'+String(Math.max(.04,.35-i*.038))+')',i===0?5:1.5);
  line(-40,H-18-off,196+off,H+65,'rgba(244,141,21,'+String(Math.max(.04,.29-i*.035))+')',i===0?5:1.4);
  line(W+40,H-18-off,W-196-off,H+65,'rgba(244,141,21,'+String(Math.max(.04,.29-i*.035))+')',i===0?5:1.4);
 }
 path([[0,0],[230,0],[80,140],[0,184]],'#280b0a');
 path([[W,0],[W-230,0],[W-80,140],[W,184]],'#280b0a');
 path([[0,H],[240,H],[80,H-145],[0,H-185]],'#250a09');
 path([[W,H],[W-240,H],[W-80,H-145],[W,H-185]],'#250a09');
 line(25,177,W-25,177,'rgba(255,187,68,.55)',1.3);
 line(25,H-160,W-25,H-160,'rgba(255,187,68,.4)',1);
 for(const [x,y] of [[10,40],[W-10,40],[7,530],[W-7,530],[40,H-65],[W-40,H-65]])gleam(x,y,8);
 // 02 — Framed team crests and gold embossed brand.
 coin(151,95,66);coin(971,95,58);
 c.save();c.beginPath();c.arc(151,95,57,0,Math.PI*2);c.clip();
 rect(94,38,114,114,'#290a08');
 drawImage(art[1]||art[0]||null,91,35,120,120);c.restore();
 c.save();c.beginPath();c.arc(971,95,51,0,Math.PI*2);c.clip();
 rect(920,43,102,102,'#100f13');
 drawImage(art[0]||null,921,42,100,102);c.restore();
 crown(555,26,49);
 centered('CHICO',561,85,80,gradient(0,43,0,115,[[0,'#fffce2'],[.27,'#ffe087'],[.55,'#c6811a'],[1,'#fff0bc']]),{weight:900,family:'Georgia,serif',shadow:true});
 frame(382,126,358,43,5);centered('GENERAL TEAM',561,146,27,P.bright,{family:'Georgia,serif',weight:800,shadow:true});
 for(let i=0;i<3;i++){gleam(387+i*10,146,1.8);gleam(738-i*10,146,1.8);}
 // 03 — Arabic title framed by angular gold/navy/red banner.
 path([[184,188],[935,188],[964,232],[928,268],[194,268],[157,229]],
   gradient(182,191,925,269,[[0,'#43130e'],[.19,'#0b0a09'],[.8,'#150f0a'],[1,'#521810']]),'#daa143',2.2);
 line(192,192,928,192,'#f6cb78',2);
 line(192,265,928,265,'rgba(255,180,63,.86)',2);
 centered(title,561,228,52,P.pearl,{weight:900,maxWidth:660,shadow:true});
 frame(369,263,384,39,5);
 centered(date,561,281,22,P.bright,{weight:800,maxWidth:360});
 gleam(356,281,6);gleam(768,281,6);
 // 04 — Main counters: beveled gold metal over velvet black.
 const summaries=[
  {label:'TICKETS',value:serverTotals?serverTotals.tickets:sum(rows.map(r=>r.tickets)),x:70},
  {label:'FLAGS',value:serverTotals?serverTotals.flags:rows.some(r=>r.flagsIncomplete)?null:sum(rows.map(r=>r.flags)),x:574}
 ];
 function sum(nums:(number|null)[]):number|null{
  return nums.length&&nums.every(n=>n!==null)?nums.reduce<number>((a,n)=>a+(n||0),0):null;
 }
 summaries.forEach((k,i)=>{
  frame(k.x,312,478,112,10);
  const fill=gradient(k.x,315,k.x+440,412,[[0,'#3d110b'],[.36,'#0d0d0e'],[1,'#130e0d']]);
  rect(k.x+9,322,460,91,fill,7);
  if(i===0)ticket(k.x+93,368,73);else flag(k.x+95,367,76);
  line(k.x+148,330,k.x+148,404,'#d8ab4f',2);
  text(k.label,k.x+170,342,21,P.pearl,{weight:750});
  text(amount(k.value),k.x+169,385,51,P.bright,{weight:900,family:'Georgia,serif',maxWidth:287,shadow:true});
  gleam(k.x+10,320,6);gleam(k.x+470,420,4);
 });
 // 05 — Two balanced ledgers. Table names are unchanged internally, but visually
 //       strip role prefixes because the polished crests already identify rank.
 const tableY=436,tableH=527+extra;
 const tablePositions=[32,570];
 function groupTable(index:number){
  const x=tablePositions[index],w=index===0?517:520,rowsInGroup=groups[index].rows;
  frame(x,tableY,w,tableH,8);
  redRibbon(x+9,tableY+9,w-20,58);
  centered(index===0?'HELPERS':'MODERATORS',x+w*.43,tableY+35,32,P.pearl,{family:'Georgia,serif',weight:800,shadow:true});
  frame(x+w-79,tableY+10,63,41,5);
  centered(String(rowsInGroup.length),x+w-48,tableY+31,25,P.bright,{family:'Georgia,serif',weight:800});
  const hdY=tableY+72;
  surface(x+12,hdY,w-24,38);
  const cx={number:x+31,name:x+91,badge:x+247,tickets:x+314,flags:x+399,rate:x+w-49};
  centered('#',cx.number,hdY+19,13,P.bright,{weight:800});
  centered('NAME',cx.name+29,hdY+19,15,P.pearl,{weight:800});
  centered('TICKETS',cx.tickets,hdY+19,13,P.pearl,{weight:800});
  centered('FLAGS',cx.flags,hdY+19,13,P.pearl,{weight:800});
  centered('RATE',cx.rate,hdY+19,13,P.pearl,{weight:800});
  const rowY=hdY+40,rowHeight=25.2;
  rowsInGroup.forEach((row,i)=>{
   const yy=rowY+i*rowHeight;
   rect(x+12,yy,w-24,rowHeight-1,i%2===0?'rgba(255,255,255,.042)':'rgba(0,0,0,.15)',0);
   line(x+14,yy+rowHeight-1,x+w-14,yy+rowHeight-1,'rgba(200,145,57,.34)',.8);
   centered(String(i+1).padStart(2,'0'),cx.number,yy+rowHeight/2,13,P.bright,{weight:700});
   text(fitName(row.name,row.rank,159,16.6),x+77,yy+rowHeight/2,16.6,P.pearl,{weight:750,maxWidth:165});
   rankBadge(row.rank,x+242,yy+rowHeight/2);
   centered(amount(row.tickets),cx.tickets,yy+rowHeight/2,18,row.tickets===null?P.subtle:P.pearl,{weight:800,maxWidth:78});
   const fColor=row.flags===null?P.subtle:row.flags>7?P.danger:row.flags>5?P.gold:row.flags===0?P.green:P.pearl;
   centered(amount(row.flags),cx.flags,yy+rowHeight/2,17.5,fColor,{weight:800,maxWidth:74});
   centered(amount(row.rating,2),cx.rate,yy+rowHeight/2,17.5,row.rating===null?P.subtle:row.rating>=4.8?P.green:P.danger,{weight:800,maxWidth:72});
  });
  if(!rowsInGroup.length)centered('لا توجد بيانات مسجلة',x+w/2,rowY+64,23,P.subtle,{maxWidth:w-42});
  line(x+14,tableY+tableH-12,x+w-14,tableY+tableH-12,'rgba(255,210,124,.7)',1);
 }
 groupTable(0);groupTable(1);
 // 06 — Gold/silver/bronze podiums from the approved design, no fabricated winners.
 const podiumY=986+extra,podiumH=266;
 function awardPanel(index:number){
  const x=tablePositions[index],w=index===0?517:520,group=groups[index];
  frame(x,podiumY,w,podiumH,9);
  // Center the full TOP 3 label, balanced by equal small crowns on both sides.
  frame(x+10,podiumY+9,w-20,53,8);
  crown(x+58,podiumY+34,20);
  crown(x+w-58,podiumY+34,20);
  centered(index===0?'TOP 3 HELPERS':'TOP 3 MODERATORS',x+w/2,podiumY+35,26,P.pearl,{weight:900,family:'Georgia,serif',maxWidth:w-148,shadow:true});
  const cardY=podiumY+78,cardW=(w-34)/3;
  const colors=[P.bright,P.silver,P.bronze];
  if(!group.topRows.length){
   centered('لا يوجد ترتيب موثق',x+w/2,podiumY+162,24,P.subtle);return;
  }
  group.topRows.forEach((row,i)=>{
   const cx=x+11+i*cardW,color=colors[i];
   frame(cx,cardY,cardW-4,160,11);
   rect(cx+7,cardY+7,cardW-18,147,
    gradient(cx,cardY,cx+cardW,cardY+160,[[0,'#45220e'],[.4,'#171214'],[1,'#0f0b0b']]),6,color,1);
   centered('TOP '+String(i+1),cx+(cardW-4)/2,cardY+28,22,color,{weight:900,family:'Georgia,serif',shadow:true});
   // Quiet divider and centered name, without side streaks across text.
   line(cx+20,cardY+53,cx+cardW-24,cardY+53,color,.9);
   gleam(cx+(cardW-4)/2,cardY+53,2.5);
   centered(fitName(row.name,row.rank,cardW-32,22),cx+(cardW-4)/2,cardY+82,22,P.pearl,{weight:800,maxWidth:cardW-32});
   line(cx+20,cardY+103,cx+cardW-24,cardY+103,color,.9);
   gleam(cx+(cardW-4)/2,cardY+103,2.5);
   ticket(cx+42,cardY+128,30,color);
   centered(amount(row.tickets),cx+103,cardY+129,30,P.bright,{family:'Georgia,serif',weight:900,maxWidth:cardW-98});
  });
 }
 awardPanel(0);awardPanel(1);
 // 07 — Signature footer and decorative threads (artwork only, no explanatory copy).
 const footY=H-99;
 line(183,footY,933,footY,'#b57c2b',1.5);
 for(let i=0;i<4;i++){gleam(366+i*120,footY,2.4);}
 centered('C H I C O',561,footY+37,20,P.bright,{family:'Georgia,serif',weight:750,shadow:true});
 gleam(561,footY+73,8);
 c.restore();
}
