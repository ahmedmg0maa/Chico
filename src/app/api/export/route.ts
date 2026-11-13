import type {NextRequest} from 'next/server';
import ExcelJS from 'exceljs';
import {requireOwner,response,failure} from '@/lib/api';
import {loadState} from '@/lib/state';
import type {Reading,Admin} from '@/lib/types';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

type Row={name:string;rank:string;level:string;shift:string;status:string;reporting:string;
 tickets:number|null;flags:number|null;rating:number|null;hours:number|null;lastReading:string};
function sum(numbers:(number|null)[]):number|null{
 const known=numbers.filter((n):n is number=>n!==null);
 return known.length?known.reduce((a,b)=>a+b,0):null;
}
const numeral=(x:unknown)=>x===null||x===undefined?'':String(x);
const safeCell=(x:unknown)=>{
 const s=numeral(x);
 const safe=/^[=+@\-\t\r]/.test(s)?'\''+s:s;
 return '"'+safe.replace(/"/g,'""')+'"';
};
const escapeHTML=(v:unknown)=>numeral(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]||m));
function personRow(admin:Admin,readings:Reading[]):Row{
 const mine=readings.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.to_date.localeCompare(a.to_date));
 const flags=mine.some(r=>r.flags_counter!==null&&r.flags_delta===null)?null:sum(mine.map(r=>r.flags_delta));
 return {name:admin.name,rank:admin.rank,level:numeral(admin.admin_level),shift:admin.shift_label||'',
  status:admin.active?'نشط':'غير نشط',reporting:admin.in_reporting?'نعم':'لا',
  tickets:sum(mine.map(r=>r.tickets_delta)),flags,
  rating:mine.find(r=>r.rating!==null)?.rating??null,hours:sum(mine.map(r=>r.hours)),
  lastReading:mine[0]?.to_date||''};
}
function headers(scope:string){
 return scope==='readings'?['الإداري','الرتبة','من تاريخ','إلى تاريخ','تاريخ تسجيل التقرير','وقت الحفظ الفعلي','Tickets الزيادة','Flags الزيادة','TIME ساعات عشرية','Rating','الملاحظات']:
 ['الإداري','الرتبة','المستوى','المناوبة','الحالة','ضمن التقارير','Tickets الأسبوع','Flags الأسبوع','التقييم الأخير','TIME الأسبوع','آخر قراءة'];
}
function cells(scope:string,rows:Row[],readings:Reading[]){
 return scope==='readings'?
 readings.map(r=>[r.admin_name,r.rank,r.from_date,r.to_date,r.report_entered_on,r.created_at,r.tickets_delta,r.flags_delta,r.hours,r.rating,r.note]):
 rows.map(r=>[r.name,r.rank,r.level,r.shift,r.status,r.reporting,r.tickets,r.flags,r.rating,r.hours,r.lastReading]);
}
export async function GET(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const format=req.nextUrl.searchParams.get('format')||'xlsx';
  const scope=req.nextUrl.searchParams.get('scope')||'team';
  if(!['xlsx','csv','print'].includes(format)||!['team','readings'].includes(scope))return response({ok:false,error:'INVALID_INPUT'},400);
  const state=await loadState();
  const period=state.summary.week_start;
  const relevant=state.readings.filter(r=>r.week_start===period);
  const rows=state.admins.map(a=>personRow(a,relevant));
  const labels=headers(scope);const data=cells(scope,rows,relevant);
  const base='CHICO_'+(scope==='team'?'Team':'Readings')+'_'+period;
  if(format==='csv'){
   const content='\uFEFF'+[labels,...data.map(a=>a.map(x=>numeral(x)))].map(row=>row.map(safeCell).join(',')).join('\r\n');
   return new Response(content,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+base+'.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(format==='xlsx'){
   const workbook=new ExcelJS.Workbook();
   workbook.creator='CHICO GENERAL TEAM';workbook.created=new Date();
   const sheet=workbook.addWorksheet(scope==='team'?'الفريق':'القراءات',{views:[{state:'frozen',ySplit:1}]});
   sheet.addRow(labels);
   for(const row of data)sheet.addRow(row);
   sheet.columns=labels.map((name,i)=>({key:'c'+i,width:Math.max(16,Math.min(30,name.length+8))}));
   const header=sheet.getRow(1);header.font={bold:true,color:{argb:'FFFCE7BA'},size:12};
   header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF24242E'}};
   header.height=29;
   for(let i=2;i<=sheet.rowCount;i++){const row=sheet.getRow(i);row.height=22;if(i%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF6F1E9'}};}
   sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:labels.length}};
   const bytes=await workbook.xlsx.writeBuffer();
   return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="'+base+'.xlsx"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  const headerCells=labels.map(s=>'<th>'+escapeHTML(s)+'</th>').join('');
  const rowHTML=data.map(row=>'<tr>'+row.map(x=>'<td>'+escapeHTML(x===null?'—':x)+'</td>').join('')+'</tr>').join('');
  const summary=['Tickets: '+numeral(state.summary.tickets??'—'),'Flags: '+numeral(state.summary.flags??'—'),
   'Flag Rate: '+numeral(state.summary.rate??'—'),'Members: '+state.admins.length];
  const body='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escapeHTML(base)+'</title><style>'+
   'body{font:14px system-ui,sans-serif;margin:30px;background:#fff;color:#25232b}h1{color:#80602e}p{color:#62564d}button{padding:11px 20px;border:0;border-radius:7px;background:#302632;color:#fff;cursor:pointer}.top{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.top b{border:1px solid #c9b69b;padding:10px 14px;border-radius:8px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{padding:8px;border:1px solid #d1cac1;font-size:11px;text-align:right;word-break:break-word}th{background:#f2e9da}tr:nth-child(even){background:#fcfaf7}img{width:100%;max-height:160px;object-fit:contain;background:#18151a}@media print{button{display:none}@page{size:landscape;margin:12mm}body{margin:0}thead{display:table-header-group}tr{break-inside:avoid}}'+
   '</style></head><body><img src="/assets/chico-approved-hero.avif" alt="CHICO GENERAL TEAM"><h1>CHICO GENERAL TEAM — '+(scope==='team'?'كشف الفريق':'سجل القراءات')+'</h1><p>الأسبوع: '+escapeHTML(period)+' | لا تُستبدل القيم غير المسجلة بصفر</p><div class="top">'+summary.map(x=>'<b>'+escapeHTML(x)+'</b>').join('')+'</div><button onclick="window.print()">طباعة أو حفظ PDF</button><table><thead><tr>'+headerCells+'</tr></thead><tbody>'+rowHTML+'</tbody></table></body></html>';
  return new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; object-src 'none'"}});
 }catch(error){return failure(error);}
}
