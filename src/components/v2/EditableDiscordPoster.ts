import {buildReportGroups} from '@/lib/report-groups';
import {prestigeName,type LuxuryPosterRow,type PremiumTotals} from './PremiumPosterRenderer';

const escape=(s:string)=>s.replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]!));
const number=(v:number|null,digits=0)=>v===null?'—':v.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
function text(value:string,x:number,y:number,size:number,color='#f7ead4',anchor='middle',font='Arial',width=0){
 const fit=width&&value.length*size*.65>width?' textLength="'+width+'" lengthAdjust="spacingAndGlyphs"':'';
 return '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="'+font+'" font-size="'+size+'" font-weight="bold" text-anchor="'+anchor+'"'+fit+'>'+escape(value)+'</text>';
}
export async function posterMasthead(){
 const response=await fetch('/assets/chico-atelier-wolf.webp');
 if(!response.ok)throw Error('masthead');
 const blob=await response.blob();
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
}
export function editablePoster(rows:LuxuryPosterRow[],date:string,title:string,totals:PremiumTotals,accent:string,brand:string){
 const groups=buildReportGroups(rows);
 const tableY=604, rowH=37;
 const height=tableY+113+Math.max(1,...groups.map(g=>g.rows.length))*rowH+48;
 const ribbon=/^#[0-9a-f]{6}$/i.test(accent)?accent:'#791b20';
 const paper='#f4e9d5',gold='#eac78c',muted='#b0aca8';
 const rect=(x:number,y:number,w:number,h:number,fill:string)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
 const rule=(x:number,y:number,w:number)=>rect(x,y,w,1,'#423c39');
 const parts=[
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1122" height="${height}" viewBox="0 0 1122 ${height}"><title>${escape(title)}</title>
  <defs><linearGradient id="fade"><stop offset=".13" stop-color="#151317" stop-opacity="0"/><stop offset=".98" stop-color="#151317"/></linearGradient>
  <linearGradient id="ribbon"><stop stop-color="${ribbon}"/><stop offset="1" stop-color="#18151a"/></linearGradient>
  <clipPath id="header-crop"><rect width="645" height="268"/></clipPath></defs>`,
  rect(0,0,1122,height,'#131215'),rect(0,0,1122,268,'#151317'),
  `<image clip-path="url(#header-crop)" x="0" y="-56" width="645" height="352" preserveAspectRatio="xMidYMid slice" xlink:href="${escape(brand)}"/>`,
  rect(0,0,650,268,'url(#fade)'),rect(684,43,46,4,gold),
  text('GENERAL TEAM',744,51,15,muted,'start'),text('CHICO',674,148,108,paper,'start','Georgia'),
  rect(590,164,488,43,'url(#ribbon)'),text(title,836,194,25,paper,'middle','Arial',450),
  text(date,1074,241,19,gold,'end'),rect(0,268,1122,76,'#e9d4b0')
 ];
 ['TICKETS','FLAGS'].forEach((key,i)=>{
  const x=41+i*547;
  parts.push(text(key,x,315,19,'#534333','start'),text(number(i?totals.flags:totals.tickets),x+483,322,44,'#231d1d','end','Georgia'));
 });
 parts.push(rect(560,286,1,40,'#aa9273'));
 groups.forEach((g,i)=>{
  const x=35+i*539, w=514;
  const name=i?'MODERATORS':'HELPERS', tone=i?'#d7b9ee':'#9bdabe';
  parts.push(`<g id="${g.id}-podium">`,rect(x,372,5,21,tone),text('TOP 3 '+name,x+16,390,22,paper,'start','Georgia'),
   rect(x,406,w,94,'#242025'),rect(x,406,w,2,gold));
  if(!g.topRows.length)parts.push(text('لا يوجد ترتيب موثق',x+w/2,465,20,muted));
  g.topRows.forEach((r,k)=>{
   const who=prestigeName(r.name,r.rank);
   if(k===0){
    parts.push(text('01',x+17,476,61,gold,'start','Georgia'),text(who,x+110,462,26,paper,'start','Arial',226),
     text(number(r.tickets),x+w-16,462,33,gold,'end','Georgia'),text('TICKETS',x+w-16,486,12,muted,'end'));
   }else{
    const xx=x+(k-1)*260;
    parts.push(rect(xx,508,254,67,'#1f1d21'),text(k===1?'02':'03',xx+11,549,24,k===1?'#c6c8d2':'#d3a483','start','Georgia'),
     text(who,xx+53,536,17,paper,'start','Arial',185),text(number(r.tickets)+' tickets',xx+53,559,15,muted,'start'));
   }
  });
  parts.push('</g>',`<g id="${g.id}-standings">`,text(name,x,tableY+26,31,paper,'start','Georgia'),
   text(String(g.rows.length).padStart(2,'0'),x+w-4,tableY+25,21,tone,'end'),rule(x,tableY+43,w));
  const col=[18,83,328,407,478];
  ['#','NAME','TICKETS','FLAGS','RATE'].forEach((v,k)=>parts.push(text(v,x+col[k],tableY+70,14,muted,k===1?'start':'middle')));
  g.rows.forEach((r,k)=>{
   const y=tableY+84+k*rowH;
   const senior=r.rank==='SN.Helper', rank=i?'M':senior?'SH':'H',ink=i?'#d7b9ee':senior?'#9bcbef':'#9bdabe';
   parts.push(`<g id="${g.id}-row-${k+1}">`,rect(x,y,w,rowH-1,k%2?'#19181b':'#211f22'),
    text(String(k+1).padStart(2,'0'),x+18,y+24,15,muted),
    `<path d="M${x+45} ${y+6}h25v15l-12.5 8-12.5-8z" fill="#29282c" stroke="${ink}"/>`,
    text(rank,x+57.5,y+21,12,ink),text(prestigeName(r.name,r.rank),x+83,y+25,19,paper,'start','Arial',202),
    text(number(r.tickets),x+328,y+25,19,paper),text(number(r.flags),x+407,y+25,19,r.flags===0?'#9bdabe':(r.flags??0)>7?'#f69d97':(r.flags??0)>5?gold:paper),
    text(number(r.rating,2),x+478,y+25,19,r.rating===null?muted:r.rating>=4.8?'#9bdabe':'#f69d97'),'</g>');
  });
  parts.push('</g>');
 });
 parts.push(rule(35,height-54,1053),text('CHICO   /   GENERAL TEAM',35,height-25,14,gold,'start'),text(date,1087,height-25,14,muted,'end'),'</svg>');
 return parts.join('');
}
export function downloadEditable(svg:string,name:string){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export async function drawEditable(canvas:HTMLCanvasElement,svg:string){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{const img=new Image();img.src=url;await img.decode();canvas.width=1560;canvas.height=Math.round(img.height*1560/img.width);canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
}
