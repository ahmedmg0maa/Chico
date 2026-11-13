import type {NextRequest} from 'next/server';
import ExcelJS from 'exceljs';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {auditImport,canonicalName,cleanName,resolvePerson,strictDate,validInteger,validNumber,validRank,validateCoverage,type ExcelImportPerson,type ExcelImportRow} from '@/lib/excel-import';
import type {Rank} from '@/lib/types';

export const runtime='nodejs';
export const maxDuration=30;
function value(v:unknown):unknown {
 if(v&&typeof v==='object'&&!(v instanceof Date)) {
  if('result' in v)return value((v as {result?:unknown}).result);
  if('text' in v)return (v as {text?:string}).text;
 }
 return v;
}
function key(v:unknown) {return String(value(v)??'').trim().toLowerCase().replace(/[_./-]/g,' ').replace(/\s+/g,' ');}
function number(v:unknown,max:number){const x=value(v);return x instanceof Date?null:validNumber(x,max);}
function oldRange(headers:string[]){
 const h=headers.find(x=>x.includes('total week')&&x.includes('from')&&x.includes('to'));
 const m=h?.match(/from\s+(\d{1,2})\s+(\d{1,2})\s+to\s+(\d{1,2})\s+(\d{1,2})/);
 if(!m)return null;
 const year=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',year:'numeric'}).format(new Date());
 const from=year+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
 const to=year+'-'+m[3].padStart(2,'0')+'-'+m[4].padStart(2,'0');
 return validateCoverage(from,to)?{from,to}:null;
}
export async function POST(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const body=await req.formData(),file=body.get('file');
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx')||file.size>3_000_000||file.size<500)return response({ok:false,error:'INVALID_XLSX'},400);
  const buf=Buffer.from(await file.arrayBuffer()),book=new ExcelJS.Workbook();
  await book.xlsx.load(buf as any);
  const sheet=book.getWorksheet('CHICO_IMPORT')||book.worksheets[0];
  if(!sheet)return response({ok:false,error:'EMPTY_XLSX'},400);
  if(sheet.rowCount>502)return response({ok:false,error:'XLSX_TOO_MANY_ROWS'},422);
  const heads=(sheet.getRow(1).values as unknown[]).map(key);
  const find=(...items:string[])=>{for(const item of items){const exact=heads.findIndex(h=>h===item);if(exact>=0)return exact;}for(const item of items){const partial=heads.findIndex(h=>h.includes(item));if(partial>=0)return partial;}return -1;};
  const nameCol=find('name','admin','الاسم');
  const roleCol=find('rank','الرتبة');
  const levelCol=find('adminlevel','admin level');
  const combinedCol=find('rank adminlevel','rank admin level');
  const fromCol=find('from date','start date');
  const toCol=find('to date','end date','date','التاريخ');
  const enteredCol=find('report entered on');
  const ticketsCol=find('tickets counter','total week tickets','total tickets','weekly tickets','tickets');
  const ticketsBaseCol=find('tickets baseline','first week tickets','opening tickets');
  const flagsCol=find('flags counter','total week flags','total flags','cumulative flags','flags balance','flags');
  const flagsBaseCol=find('flags baseline','first week flags','opening flags');
  const hoursCol=find('time','hours','ساعات');
  const ratingCol=find('rating','total week rate','rate','التقييم');
  const reportingCol=find('in reporting');
  const noteCol=find('notes','note');
  if(nameCol<0||ticketsCol<0&&flagsCol<0)return response({ok:false,error:'XLSX_UNRECOGNIZED_HEADERS',headers:heads.slice(1)},422);
  const fallback=fromCol<0?oldRange(heads):null;
  const sql=db();
  const adminRows=await sql`SELECT id,name,rank,admin_level,in_reporting FROM chico_next.admins`;
  const admins:ExcelImportPerson[]=adminRows.map(r=>({id:String(r.id),name:String(r.name),rank:r.rank as Rank,admin_level:Number(r.admin_level||1),in_reporting:!!r.in_reporting}));
  const rows:ExcelImportRow[]=[],warnings:string[]=[],notices:string[]=[];
  if(fallback)notices.push('Excel header has no year; inferred '+fallback.from+' to '+fallback.to+' from the Cairo calendar. Verify before saving.');
  const cairo=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(let i=2;i<=sheet.rowCount;i++){
   const cells=sheet.getRow(i).values as unknown[],at=(index:number):unknown=>index<0?null:value(cells[index]);
   const name=cleanName(String(at(nameCol)??''));if(!name)continue;
   const combined=String(at(combinedCol)??'');
   const sourceRank=validRank(at(roleCol))||validRank(combined.replace(/\s+\d+\s*$/,''));
   const sourceLevel=validInteger(at(levelCol))||validInteger(combined.match(/\d+\s*$/)?.[0]);
   const found=resolvePerson(name,sourceRank,admins);
   if(found.ambiguous)warnings.push('Row '+i+': ambiguous roster match — fix existing names');
   const existing=found.person,rank=sourceRank||existing?.rank||null;
   const leader=rank==='Responsible'||canonicalName(name)==='general'||String(at(reportingCol)||'').toUpperCase()==='NO';
   const from=leader?null:strictDate(at(fromCol))||fallback?.from||null;
   const to=leader?null:strictDate(at(toCol))||fallback?.to||null;
   const entered=leader?null:strictDate(at(enteredCol))||cairo;
   const rawHours=at(hoursCol),dateHours=rawHours instanceof Date;
   const rating=leader?null:number(at(ratingCol),5);
   const flags=leader?null:validInteger(at(flagsCol));
   const baseline=leader?null:validInteger(at(flagsBaseCol));
   if(!leader){
    if(!validateCoverage(from,to))warnings.push('Row '+i+': invalid or missing report period');
    if(dateHours)warnings.push('Row '+i+': TIME was converted to a date in Excel');
    if(at(ratingCol)!==null&&at(ratingCol)!==''&&rating===null)warnings.push('Row '+i+': Rating must be between 0 and 5');
    if(flags!==null&&baseline===null)notices.push('Row '+i+': Flags baseline missing; the first delta cannot be assumed zero');
    if(rank===null)warnings.push('Row '+i+': Rank required for new administrator');
   }
   const mismatch=!!existing&&(sourceRank!==null&&sourceRank!==existing.rank||name!==existing.name||leader&&existing.in_reporting);
   rows.push({row:i,name,admin_id:existing?.id||null,roster_name:existing?.name||null,
    rank:leader?'Responsible':rank,admin_level:leader?3:sourceLevel||existing?.admin_level||1,
    roster_action:leader?'leader':!existing?'create':mismatch?'update':'match',
    from_date:from,to_date:to,report_entered_on:entered,
    tickets_counter:leader?null:validInteger(at(ticketsCol)),
    tickets_baseline:leader?null:validInteger(at(ticketsBaseCol)),
    flags_counter:flags,flags_baseline:baseline,
    hours:leader?null:dateHours?null:number(rawHours,10000),rating,
    note:String(at(noteCol)||'Excel CHICO import'),skip_reading:leader,time_was_date:dateHours,year_inferred:!!fallback
   });
  }
  if(!rows.length)return response({ok:false,error:'EMPTY_XLSX'},400);
  const audit=auditImport(rows);warnings.push(...audit.issues);
  const hash=createHash('sha256').update(buf).digest('hex');
  const stage=await sql`INSERT INTO chico_next.import_staging(source_hash,payload) VALUES(${hash},${JSON.stringify(rows)}::jsonb) RETURNING id`;
  await sql`DELETE FROM chico_next.import_staging WHERE created_at < now()-interval '24 hours'`;
  return response({ok:true,preview_id:String(stage[0].id),filename:file.name,sheet:sheet.name,rows,
   imported:audit.imported,leaders:audit.leaders,
   rosterChanges:rows.filter(r=>r.roster_action!=='match').length,
   warnings:[...new Set(warnings)],notices:[...new Set(notices)],requiresConfirmation:true});
 }catch(error){return failure(error);}
}
