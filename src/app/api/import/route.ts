import type {NextRequest} from 'next/server';
import ExcelJS from 'exceljs';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {auditImport,canonicalName,cleanName,resolvePerson,strictDate,validInteger,validNumber,validRank,readDecimalHours,isMissingCell,validateCoverage,findImportColumn,inferLegacyPeriod,normalizedExcelHeader,type ExcelImportPerson,type ExcelImportRow} from '@/lib/excel-import';
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
function number(v:unknown,max:number){const x=value(v);return x instanceof Date?null:validNumber(x,max);}
export async function POST(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const body=await req.formData(),file=body.get('file');
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx')||file.size>3_000_000||file.size<500)return response({ok:false,error:'INVALID_XLSX'},400);
  const buf=Buffer.from(await file.arrayBuffer()),hash=createHash('sha256').update(buf).digest('hex'),book=new ExcelJS.Workbook();
  await book.xlsx.load(buf as any);
  const sheet=book.getWorksheet('CHICO_IMPORT')||book.worksheets[0];
  if(!sheet)return response({ok:false,error:'EMPTY_XLSX'},400);
  if(sheet.rowCount>502)return response({ok:false,error:'XLSX_TOO_MANY_ROWS'},422);
  const heads=Array.from(sheet.getRow(1).values as unknown[],x=>normalizedExcelHeader(value(x)));
  const find=(...items:string[])=>findImportColumn(heads,...items);
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
  // Legacy game sheets omit the year in their column names. Never silently
  // treat an uploaded historical report as belonging to the present year.
  const explicitYear=body.get('period_year');
  const selectedYear=typeof explicitYear==='string'&&/^20[0-9]{2}$/.test(explicitYear)?Number(explicitYear):null;
  const legacyHeader=fromCol<0&&heads.some(h=>h.includes('total week')&&h.includes('from')&&h.includes('to'));
  if(legacyHeader&&selectedYear===null)return response({ok:false,error:'LEGACY_YEAR_REQUIRED'},422);
  const fallback=fromCol<0&&selectedYear!==null?inferLegacyPeriod(heads,selectedYear):null;
  const sql=db();
  // Reject an identical already-committed file at preview, before presenting a false save opportunity.
  const priorFile=await sql`SELECT 1 FROM chico_next.import_staging WHERE source_hash=${hash} AND committed_at IS NOT NULL LIMIT 1`;
  if(priorFile.length)return response({ok:false,error:'FILE_ALREADY_IMPORTED'},409);
  const adminRows=await sql`SELECT id,name,rank,admin_level,in_reporting FROM chico_next.admins`;
  const admins:ExcelImportPerson[]=adminRows.map(r=>({id:String(r.id),name:String(r.name),rank:r.rank as Rank,admin_level:Number(r.admin_level||1),in_reporting:!!r.in_reporting}));
  const rows:ExcelImportRow[]=[],warnings:string[]=[],notices:string[]=[];
  if(fallback)notices.push('Year explicitly selected: '+selectedYear+'; period '+fallback.from+' to '+fallback.to+'. Verify the complete report coverage.');
  const cairo=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(let i=2;i<=sheet.rowCount;i++){
   const cells=sheet.getRow(i).values as unknown[],at=(index:number):unknown=>index<0?null:value(cells[index]);
   const name=cleanName(String(at(nameCol)??''));
   if(!name){
    // A blank name with performance cells is not a harmless empty Excel row.
    if([ticketsCol,ticketsBaseCol,flagsCol,flagsBaseCol,hoursCol,ratingCol].some(col=>col>=0&&!isMissingCell(at(col))))
     warnings.push('Row '+i+': missing administrator Name while statistics are present');
    continue;
   }
   const combined=String(at(combinedCol)??'');
   const sourceRank=validRank(at(roleCol))||validRank(combined.replace(/\s+\d+\s*$/,''));
   const sourceLevel=validInteger(at(levelCol))||validInteger(combined.match(/\d+\s*$/)?.[0]);
   const found=resolvePerson(name,sourceRank,admins);
   if(found.ambiguous)warnings.push('Row '+i+': ambiguous roster match — fix existing names');
   // The roster in the database is authoritative. A stale XLSX must never undo a reviewed rank.
   const existing=found.person,rank=existing?.rank||sourceRank||null;
   const leader=existing?.rank==='Responsible'||canonicalName(name)==='general'||(!existing&&sourceRank==='Responsible');
   if(existing&&sourceRank&&sourceRank!==existing.rank)notices.push('Row '+i+': Excel says '+sourceRank+' but approved roster says '+existing.rank+' — roster preserved');
   if(existing&&existing.name!==name)notices.push('Row '+i+': matched '+name+' to existing '+existing.name+' — database name preserved');
   if(existing&&canonicalName(name)==='general'&&existing.rank!=='Responsible')warnings.push('Row '+i+': General rank conflict must be corrected in Team Management first');
   if(!leader&&String(at(reportingCol)||'').toUpperCase()==='NO')notices.push('Row '+i+': Excel In Reporting=NO ignored; only team management controls exclusions');
   const from=leader?null:strictDate(at(fromCol))||fallback?.from||null;
   const to=leader?null:strictDate(at(toCol))||fallback?.to||null;
   const entered=leader?null:strictDate(at(enteredCol))||cairo;
   const rawHours=at(hoursCol),parsedHours=readDecimalHours(rawHours),dateHours=parsedHours.converted;
   const rating=leader?null:number(at(ratingCol),5);
   const flags=leader?null:validInteger(at(flagsCol));
   const baseline=leader?null:validInteger(at(flagsBaseCol));
   if(!leader){
    if(!validateCoverage(from,to))warnings.push('Row '+i+': invalid or missing report period');
    if(dateHours)notices.push('Row '+i+': TIME date-formatted cell converted to '+parsedHours.hours+' decimal hours — verify before approval');
    if(parsedHours.invalid)warnings.push('Row '+i+': invalid TIME; cannot safely convert it');
    if(at(ratingCol)!==null&&at(ratingCol)!==''&&rating===null)warnings.push('Row '+i+': Rating must be between 0 and 5');
    if(flags!==null&&baseline===null)notices.push('Row '+i+': Flags baseline missing; the first delta cannot be assumed zero');
    if(rank===null)warnings.push('Row '+i+': Rank required for new administrator');
    if(validInteger(at(ticketsBaseCol))!==null&&validInteger(at(ticketsBaseCol))!==0)warnings.push('Row '+i+': nonzero Tickets opening balance is not supported safely; split the period or adjust the file');
    for(const [label,col] of [['Tickets Counter',ticketsCol],['Tickets Baseline',ticketsBaseCol],['Flags Counter',flagsCol],['Flags Baseline',flagsBaseCol]] as const){
     if(col>=0&&!isMissingCell(at(col))&&validInteger(at(col))===null)warnings.push('Row '+i+': invalid '+label+' — requires a nonnegative whole number');
    }
   }
   rows.push({row:i,name:existing?.name||name,source_name:name,source_rank:sourceRank,admin_id:existing?.id||null,roster_name:existing?.name||null,
    rank:leader?'Responsible':rank,admin_level:leader?3:existing?.admin_level||sourceLevel||1,
    roster_action:existing?'match':leader?'leader':'create',
    from_date:from,to_date:to,report_entered_on:entered,
    tickets_counter:leader?null:validInteger(at(ticketsCol)),
    tickets_baseline:leader?null:validInteger(at(ticketsBaseCol)),
    flags_counter:flags,flags_baseline:baseline,
    hours:leader?null:parsedHours.hours,rating,
    note:String(at(noteCol)||'Excel CHICO import'),skip_reading:leader,time_was_date:dateHours,year_inferred:!!fallback
   });
  }
  if(!rows.length)return response({ok:false,error:'EMPTY_XLSX'},400);
  const audit=auditImport(rows);warnings.push(...audit.issues);
  // Preview all overlapping saved readings; do not postpone this common error until commit.
  // The commit transaction checks again to protect against concurrent imports.
  const candidates=rows.filter(r=>!r.skip_reading&&r.admin_id&&r.from_date&&r.to_date);
  if(candidates.length){
   const lo=candidates.reduce((d,r)=>r.from_date!<d?r.from_date!:d,candidates[0].from_date!);
   const hi=candidates.reduce((d,r)=>r.to_date!>d?r.to_date!:d,candidates[0].to_date!);
   const existingPeriods=await sql`SELECT admin_id,from_date::text AS from_date,to_date::text AS to_date
      FROM chico_next.readings WHERE from_date<=${hi} AND to_date>=${lo}`;
   for(const r of candidates){
    if(existingPeriods.some(x=>String(x.admin_id)===r.admin_id&&String(x.from_date)<=r.to_date!&&String(x.to_date)>=r.from_date!))
     warnings.push('Row '+r.row+': already saved reading overlaps '+r.from_date+' to '+r.to_date+' for '+r.name);
   }
  }
  const evaluated=rows.filter(r=>!r.skip_reading&&['Helper','SN.Helper','Moderator'].includes(r.rank||''));
  const count=(fn:(r:ExcelImportRow)=>number|null)=>{
   const values=evaluated.map(fn);return values.length&&values.every(v=>v!==null)?values.reduce<number>((sum,v)=>sum+(v||0),0):null;
  };
  const sourceTotals={
   people:evaluated.length,
   tickets:count(r=>r.tickets_counter),
   flags:count(r=>r.flags_counter===null||r.flags_baseline===null?null:r.flags_counter-r.flags_baseline),
   hours:count(r=>r.hours),
   from:[...new Set(evaluated.map(r=>r.from_date))].length===1?evaluated[0]?.from_date:null,
   to:[...new Set(evaluated.map(r=>r.to_date))].length===1?evaluated[0]?.to_date:null
  };
  const stage=await sql`INSERT INTO chico_next.import_staging(source_hash,payload) VALUES(${hash},${sql.json({rows,warnings:[...new Set(warnings)]})}) RETURNING id`;
  await sql`DELETE FROM chico_next.import_staging WHERE created_at < now()-interval '24 hours'`;
  return response({ok:true,preview_id:String(stage[0].id),filename:file.name,sheet:sheet.name,rows,
   imported:audit.imported,leaders:audit.leaders,sourceTotals,
   rosterChanges:rows.filter(r=>r.roster_action!=='match').length,
   warnings:[...new Set(warnings)],notices:[...new Set(notices)],requiresConfirmation:true});
 }catch(error){return failure(error);}
}
