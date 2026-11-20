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
 canvas:HTMLCanvasElement, rows:LuxuryPosterRow[], date:string, _staff:number, readings:number,
 art:(HTMLImageElement|null)[], title='إحصائيات الفترة المحددة', totals?:PremiumTotals, layout:'discord'|'daily'='discord'
):void{
 const c=canvas.getContext('2d');
 if(!c)return;
 const groups=buildReportGroups(rows);
 const daily=layout==='daily';
 const roster=groups.flatMap(g=>[...g.rows]).sort((a,b)=>a.order-b.order);
 const width=1560, margin=54, gap=30, column=(width-2*margin-gap)/2;
 const tableY=daily?390:682;
 const lineHeight=daily?54:48;
 const count=daily?roster.length:Math.max(...groups.map(g=>g.rows.length));
 canvas.width=width;canvas.height=tableY+132+Math.max(count,1)*lineHeight+74;
 const fg='#f6f2eb', muted='#bac1ce', gold='#e5c185';
 function box(x:number,y:number,w:number,h:number,color:string){c!.fillStyle=color;c!.fillRect(x,y,w,h);}
 function label(str:string,x:number,y:number,size:number,color=fg,align:CanvasTextAlign='left',max=1000,weight=650){
  c!.direction=/[\u0600-\u06ff]/.test(str)?'rtl':'ltr';c!.textAlign=align;c!.textBaseline='middle';
  c!.font=weight+' '+size+'px Arial,sans-serif';c!.fillStyle=color;c!.fillText(str,x,y,max);
 }
 function num(v:number|null,d=0){return v===null?'—':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});}
 const rankColor=(r:string)=>r==='Helper'?'#7ed3aa':r==='SN.Helper'?'#83c6ff':'#c3a3fa';
 box(0,0,width,canvas.height,'#101319');
 if(art[1]?.naturalWidth){c.save();c.globalAlpha=.48;c.drawImage(art[1],0,0,width,213);c.restore();}
 box(0,213,width,3,gold);
 if(art[0]?.naturalWidth)c.drawImage(art[0],margin,50,78,86);
 label('CHICO',margin+96,83,47,gold);label('GENERAL TEAM',margin+98,132,21);
 label(title,width-margin,85,53,fg,'right',940);label(date,width-margin,155,31,gold,'right');
 function total(key:'tickets'|'flags'){
  if(totals)return totals[key];
  return roster.length&&roster.every(r=>r[key]!==null&&(key!=='flags'||!r.flagsIncomplete))?roster.reduce((n,r)=>n+(r[key]??0),0):null;
 }
 for(const [i,key] of (['tickets','flags'] as const).entries()){
  const x=margin+i*(column+gap);box(x,244,column,112,'#21252d');box(x,244,5,112,gold);
  label(key.toUpperCase(),x+26,301,24,muted);label(num(total(key)),x+column-26,301,52,fg,'right',column-200);
 }
 function table(list:LuxuryPosterRow[],x:number,w:number,heading:string){
  box(x,tableY,w,59,'#2b2830');label(heading,x+19,tableY+30,27,gold);
  const xs=[.045,.103,.48,.635,.78,.925].map(k=>x+k*w);
  const headers=['#','NAME','RANK','TICKETS','FLAGS','RATING'];
  headers.forEach((v,i)=>label(v,xs[i],tableY+90,18,muted,i===1?'left':'center'));
  if(!list.length)label('لا توجد بيانات مسجلة',x+w/2,tableY+145,24,muted,'center');
  list.forEach((r,i)=>{
   const y=tableY+116+i*lineHeight,cy=y+lineHeight/2;
   box(x,y,w,lineHeight-1,i%2?'#181c23':'#20242c');
   label(String(i+1),xs[0],cy,19,muted,'center');
   label(prestigeName(r.name,r.rank),xs[1],cy,daily?27:24,fg,'left',w*.30);
   label(daily?r.rank:r.rank==='SN.Helper'?'SH':r.rank==='Moderator'?'M':'H',xs[2],cy,20,rankColor(r.rank),'center',w*.15);
   label(num(r.tickets),xs[3],cy,24,fg,'center',w*.13);
   label(num(r.flags),xs[4],cy,24,r.flags===null?muted:r.flags>7?'#ff978c':r.flags>5?gold:r.flags===0?'#7ed3aa':fg,'center',w*.12);
   label(num(r.rating,2),xs[5],cy,24,r.rating===null?muted:r.rating>=4.8?'#7ed3aa':'#ffaba0','center',w*.13);
  });
 }
 if(daily)table(roster,margin,width-2*margin,'قراءات الفترة');
 else groups.forEach((g,i)=>{
  const x=margin+i*(column+gap),name=i?'MODERATORS':'HELPERS',accent=i?'#c3a3fa':'#7ed3aa';
  box(x,386,column,259,'#1c2028');box(x,386,column,4,accent);label('TOP 3 '+name,x+22,426,28,accent);
  if(!g.topRows.length)label('لا يوجد ترتيب موثق',x+column/2,529,25,muted,'center');
  g.topRows.forEach((r,j)=>{
   const y=484+j*59;label('TOP '+(j+1),x+22,y,21,j===0?gold:muted);
   label(prestigeName(r.name,r.rank),x+123,y,28,fg,'left',column-375);
   label(num(r.tickets),x+column-105,y,30,gold,'right',140);label('Tickets',x+column-22,y,19,muted,'right');
  });
  table(g.rows,x,column,name);
 });
 box(margin,canvas.height-63,width-2*margin,1,'#4c4438');
 label(daily?'DAILY REPORT':'DISCORD REPORT',margin,canvas.height-32,18,muted);
 label(daily?'عدد القراءات: '+num(readings):date,width-margin,canvas.height-32,20,muted,'right');
}
