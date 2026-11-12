import type {NextRequest} from 'next/server';
import ExcelJS from 'exceljs';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
export const runtime='nodejs';
export const maxDuration=30;
function str(v:unknown){if(v===null||v===undefined)return '';if(typeof v==='object'&&v!==null&&'text' in v)return String((v as {text?:string}).text||'');return String(v).trim();}
function headerKey(v:unknown){return str(v).toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9ء-ي ]/g,'').trim();}
function dateOnly(v:unknown):string|null{
 if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
 if(typeof v==='number'){
  const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000);
  return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;
 }
 const s=str(v);if(/^\d{4}-\d\d-\d\d/.test(s))return s.slice(0,10);
 const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(m){const month=Number(m[1]),day=Number(m[2]);if(month<=12&&day<=31)return `${m[3]}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
 return null;
}
function integer(v:unknown):number|null{if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isInteger(n)&&n>=0?n:null;}
function decimal(v:unknown):number|null{if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;}
export async function POST(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const data=await req.formData();const file=data.get('file');
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx')||file.size>3_000_000||file.size<500)return response({ok:false,error:'INVALID_XLSX'},400);
  const buf=Buffer.from(await file.arrayBuffer());const book=new ExcelJS.Workbook();await book.xlsx.load(buf as any);
  const sheet=book.worksheets[0];if(!sheet)return response({ok:false,error:'EMPTY_XLSX'},400);
  const raw=sheet.getRow(1).values as unknown[];const heads=raw.map(headerKey);
  const find=(match:(h:string)=>boolean)=>heads.findIndex(match);
  const nameCol=find(h=>h==='admin'||h==='administrator'||h==='name'||h==='الاسم'||h==='الإداري');
  const dateCol=find(h=>h==='date'||h==='التاريخ');
  const ticketsCol=find(h=>h.includes('total tickets')||h.includes('weekly tickets')||h==='tickets');
  const flagsCol=find(h=>h.includes('total flags')||h.includes('cumulative flags')||h==='flags counter'||h==='flags balance');
  const timeCol=find(h=>h==='time'||h==='ساعات'||h==='الساعات'||(h.includes('time')&&h.includes('hours')));
  const ratingCol=find(h=>h.includes('rating')||h.includes('التقييم'));
  if(nameCol<0||dateCol<0)return response({ok:false,error:'XLSX_UNRECOGNIZED_HEADERS',headers:heads.slice(1)},422);
  const sql=db();const adminRows=await sql`SELECT id,name FROM chico_next.admins`;
  const names=new Map(adminRows.map(r=>[String(r.name).trim().toLowerCase(),String(r.id)]));
  const rows:Record<string,unknown>[]=[];
  const warnings:string[]=[];
  if(sheet.rowCount>502)warnings.push('More than 501 data rows: remaining rows were not inspected. Split the file before importing.');
  for(let i=2;i<=Math.min(sheet.rowCount,502);i++){
   const cells=sheet.getRow(i).values as unknown[];
   const name=str(cells[nameCol]);if(!name)continue;
   const when=dateOnly(cells[dateCol]);const member=names.get(name.toLowerCase())||null;
   let hours:null|number=null;
   const sourceHours=timeCol>=0?cells[timeCol]:null;
   if(sourceHours instanceof Date){warnings.push(`Row ${i}: TIME interpreted by Excel as date, manual review required`);}
   else hours=decimal(sourceHours);
   if(!when)warnings.push(`Row ${i}: invalid date`);
   if(!member)warnings.push(`Row ${i}: unknown administrator ${name}`);
   rows.push({row:i,name,admin_id:member,date:when,tickets_counter:ticketsCol>=0?integer(cells[ticketsCol]):null,flags_counter:flagsCol>=0?integer(cells[flagsCol]):null,hours,rating:ratingCol>=0?decimal(cells[ratingCol]):null});
  }
  if(!rows.length)return response({ok:false,error:'EMPTY_XLSX'},400);
  const digest=createHash('sha256').update(buf).digest('hex');
  const saved=await sql`INSERT INTO chico_next.import_staging(source_hash,payload) VALUES(${digest},${JSON.stringify(rows)}::jsonb) RETURNING id`;
  await sql`DELETE FROM chico_next.import_staging WHERE created_at < now()-interval '24 hours'`;
  return response({ok:true,preview_id:saved[0].id,filename:file.name,rows,columns:{tickets:ticketsCol>0,flags:flagsCol>0,rating:ratingCol>0,hours:timeCol>0},warnings,requiresConfirmation:true});
 }catch(e){return failure(e);}
}
