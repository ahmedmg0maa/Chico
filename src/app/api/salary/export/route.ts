import type {NextRequest} from 'next/server';
import ExcelJS from 'exceljs';
import {db} from '@/lib/db';
import {requireOwner,failure} from '@/lib/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const sql=db();
  const rows=await sql`SELECT a.name,a.rank,p.rp_name,p.rp_server,p.client_id::text AS client_id,COALESCE(p.bonus_count,0) AS bonus_count,p.bonus_amount::float8 AS bonus_amount FROM chico_next.admins a LEFT JOIN chico_next.salary_profiles p ON p.admin_id=a.id WHERE a.active=true ORDER BY a.sort_order,a.name`;
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Salary Center',{views:[{state:'frozen',ySplit:1}]});
  ws.columns=[{header:'Admin Name',key:'name',width:28},{header:'Roleplay Name',key:'rp_name',width:29},{header:'Roleplay Server',key:'rp_server',width:23},{header:'Client ID',key:'client_id',width:42},{header:'Bonus Count',key:'bonus_count',width:15},{header:'Bonus Amount (Optional)',key:'bonus_amount',width:29}];
  for(const r of rows){const row=ws.addRow({name:String(r.name),rp_name:r.rp_name??'',rp_server:r.rp_server??'',client_id:r.client_id??'',bonus_count:Number(r.bonus_count),bonus_amount:r.bonus_amount??null});row.height=22;}
  ws.getColumn('client_id').numFmt='@';ws.getColumn('bonus_amount').numFmt='#,##0.00';
  const header=ws.getRow(1);header.height=28;header.eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF172230'}};cell.font={bold:true,color:{argb:'FFF1D19A'}};cell.alignment={vertical:'middle'};});ws.autoFilter={from:'A1',to:'F1'};
  const buf=await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="CHICO_Salary.xlsx"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return failure(e);}
}
