import {buildReportGroups} from '@/lib/report-groups';
import {prestigeName,type LuxuryPosterRow,type PremiumTotals} from './PremiumPosterRenderer';

const escape=(s:string)=>s.replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]!));
const number=(v:number|null,digits=0)=>v===null?'—':v.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
function text(value:string,x:number,y:number,size:number,color='#f7ead4',anchor='middle',font='Arial',width=0){
 const fit=width&&value.length*size*.65>width?' textLength="'+width+'" lengthAdjust="spacingAndGlyphs"':'';
 return '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="'+font+'" font-size="'+size+'" font-weight="bold" text-anchor="'+anchor+'"'+fit+'>'+escape(value)+'</text>';
}
function plate(x:number,y:number,w:number,h:number,fill:string,stroke='url(#gold)',cut=10){
 return '<path d="M '+(x+cut)+' '+y+' h '+(w-2*cut)+' l '+cut+' '+cut+' v '+(h-2*cut)+' l -'+cut+' '+cut+' h -'+(w-2*cut)+' l -'+cut+' -'+cut+' v -'+(h-2*cut)+' Z" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
}
export async function posterMasthead(){
 const response=await fetch('/assets/chico-poster-masthead.jpg');
 if(!response.ok)throw Error('masthead');
 const blob=await response.blob();
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
}
export function editablePoster(rows:LuxuryPosterRow[],date:string,title:string,totals:PremiumTotals,accent:string,brand:string){
 const groups=buildReportGroups(rows),n=Math.max(3,...groups.map(g=>g.rows.length));
 const yTable=387,rowH=30,tableH=102+n*rowH,yTop=yTable+tableH+20,height=yTop+240;
 const red=/^#[0-9a-f]{6}$/i.test(accent)?accent:'#791b20';
 const parts=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1122" height="'+height+'" viewBox="0 0 1122 '+height+'"><title>'+escape(title)+'</title><defs><linearGradient id="gold" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#a26723"/><stop offset=".22" stop-color="#ffdfa0"/><stop offset=".47" stop-color="#bc832e"/><stop offset=".73" stop-color="#ffe4a0"/><stop offset="1" stop-color="#885023"/></linearGradient><linearGradient id="ribbon"><stop stop-color="'+red+'"/><stop offset=".8" stop-color="#1c1214"/><stop offset="1" stop-color="#100f10"/></linearGradient></defs>'];
 parts.push('<rect width="1122" height="'+height+'" fill="#100f10"/>',plate(9,9,1104,height-18,'none'),'<image id="brand" x="0" y="0" width="1122" height="194" xlink:href="'+escape(brand)+'"/>');
 parts.push('<g id="report-heading">',plate(102,187,918,70,'url(#ribbon)'),text(title,561,232,36,'#ffe2a4','middle','Arial',840),plate(343,247,436,32,'#181419'),text(date,561,269,19),'</g>');
 ['TICKETS','FLAGS'].forEach((v,i)=>{const x=27+i*543;parts.push('<g id="'+v+'">',plate(x,295,525,76,'#201c1b'),plate(x+15,309,51,48,'url(#ribbon)'),'<g transform="translate('+(x+25)+' 319)" fill="none" stroke="#ffd88b" stroke-width="2.5">'+(i?'<path d="M4 28V2 Q12 -2 19 3 T33 4 L31 18 Q22 21 16 16 T4 17"/>':'<path d="M1 4h31v6q-7 4 0 8v6H1v-6q7-4 0-8z"/><path stroke-dasharray="2 2" d="M22 5v18"/>')+'</g>',text(v,x+82,342,20,'#e2c7a0','start','Georgia'),text(number(i?totals.flags:totals.tickets),x+497,347,39,'#ffe0a0','end','Georgia'),'</g>');});
 groups.forEach((g,i)=>{
  const x=27+i*543,name=i?'MODERATORS':'HELPERS';
  parts.push('<g id="'+g.id+'">',plate(x,yTable,525,tableH,'#151416'),plate(x+5,yTable+5,515,50,'url(#ribbon)'),text(name,x+20,yTable+38,28,'#ffdb93','start','Georgia'),text(String(g.rows.length),x+489,yTable+37,24));
  const cols=[26,58,232,319,403,478];
  ['#','NAME','','TICKETS','FLAGS','RATE'].forEach((s,j)=>parts.push(text(s,x+cols[j],yTable+82,15,'#ddbd82',j===1?'start':'middle','Georgia')));
  g.rows.forEach((r,j)=>{
   const y=yTable+94+j*rowH,ink=r.rank==='Moderator'?'#79529b':r.rank==='SN.Helper'?'#335c83':'#39644d';
   parts.push('<g id="'+g.id+'-row-'+(j+1)+'"><rect x="'+(x+6)+'" y="'+y+'" width="513" height="29" fill="'+(j%2?'#211f20':'#191719')+'"/>',text(String(j+1).padStart(2,'0'),x+26,y+21,15,'#cfaf73'),text(prestigeName(r.name,r.rank),x+58,y+21,18,'#fff3e2','start','Arial',150),plate(x+213,y+4,39,21,ink,'#d8b66e',5),text(r.rank==='SN.Helper'?'SH':i?'M':'H',x+232,y+20,14),text(number(r.tickets),x+319,y+21,18),text(number(r.flags),x+403,y+21,18,r.flags===0?'#87d8aa':(r.flags??0)>7?'#ff9b8f':(r.flags??0)>5?'#edc16d':'#f7ead4'),text(number(r.rating,2),x+478,y+21,18,r.rating===null?'#c3bcb3':r.rating>=4.8?'#87d8aa':'#ff9b8f'),'</g>');
  });
  parts.push('</g><g id="'+g.id+'-podium">',plate(x,yTop,525,174,'#1a1717'),text('TOP 3 '+name,x+262,yTop+36,23,'#ffe0a0','middle','Georgia'));
  if(!g.topRows.length)parts.push(text('لا يوجد ترتيب موثق',x+262,yTop+110,20));
  g.topRows.forEach((r,j)=>{const a=x+13+j*168,metal=['#edc875','#c7cdd3','#df9d72'][j];parts.push(plate(a,yTop+52,158,105,'#252020',metal),text('TOP '+(j+1),a+79,yTop+76,16,metal,'middle','Georgia'),text(prestigeName(r.name,r.rank),a+79,yTop+108,19,'#fff3df','middle','Arial',139),text(number(r.tickets),a+79,yTop+141,25,metal,'middle','Georgia'));});
  parts.push('</g>');
 });
 parts.push(text('C H I C O',561,height-24,17,'#d7b67a','middle','Georgia'),'</svg>');return parts.join('');
}
export function downloadEditable(svg:string,name:string){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export async function drawEditable(canvas:HTMLCanvasElement,svg:string){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{const img=new Image();img.src=url;await img.decode();canvas.width=1560;canvas.height=Math.round(img.height*1560/img.width);canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
}
