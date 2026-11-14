import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {weekStart} from '@/lib/rules';
import {recompute} from '@/lib/recompute';
import {auditImport,type ExcelImportRow} from '@/lib/excel-import';

export const runtime='nodejs';
const schema=z.object({preview_id:z.string().uuid(),confirm:z.literal('IMPORT REVIEWED'),approve_roster_sync:z.boolean().default(false)});
type Payload={rows:ExcelImportRow[];warnings:string[]};
function payload(value:unknown):Payload{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('PREVIEW_FORMAT_OUTDATED');
 const p=value as Partial<Payload>;
 if(!Array.isArray(p.rows)||!Array.isArray(p.warnings))throw new Error('PREVIEW_FORMAT_OUTDATED');
 return {rows:p.rows,warnings:p.warnings};
}
export async function POST(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const {preview_id,approve_roster_sync}=schema.parse(await req.json());
  const sql=db();
  const staged=await sql`SELECT id,payload,committed_at FROM chico_next.import_staging WHERE id=${preview_id} AND created_at>now()-interval '1 hour'`;
  if(!staged.length||staged[0].committed_at)return response({ok:false,error:'PREVIEW_EXPIRED_OR_USED'},409);
  const p=payload(staged[0].payload),audit=auditImport(p.rows);
  if(p.warnings.length||audit.issues.length)return response({ok:false,error:'IMPORT_REVIEW_ERRORS',warnings:[...p.warnings,...audit.issues]},422);
  const rosterChanges=p.rows.some(r=>r.roster_action!=='match');
  if(rosterChanges&&!approve_roster_sync)return response({ok:false,error:'ROSTER_SYNC_CONFIRMATION_REQUIRED'},422);
  await snapshot(sql,'Before verified CHICO Excel import');
  const result=await sql.begin(async tx=>{
   const locked=await tx`SELECT payload,source_hash,committed_at FROM chico_next.import_staging WHERE id=${preview_id} AND created_at>now()-interval '1 hour' FOR UPDATE`;
   if(!locked.length||locked[0].committed_at)throw new Error('PREVIEW_EXPIRED_OR_USED');
   const current=payload(locked[0].payload),recheck=auditImport(current.rows);
   if(current.warnings.length||recheck.issues.length)throw new Error('IMPORT_REVIEW_ERRORS');
   const duplicate=await tx`SELECT 1 FROM chico_next.import_staging WHERE source_hash=${locked[0].source_hash} AND committed_at IS NOT NULL`;
   if(duplicate.length)throw new Error('FILE_ALREADY_IMPORTED');
   let inserted=0,created=0,leaders=0;
   const affected=new Set<string>();
   for(const r of current.rows){
    if(!r.rank)throw new Error('MISSING_RANK');
    let id=r.admin_id;
    if(id){
     // Excel imports may add explicitly approved new names, but never silently
     // rename, promote or demote an existing person from an old spreadsheet.
     const old=await tx`SELECT id,name,rank,admin_level,in_reporting FROM chico_next.admins WHERE id=${id} FOR UPDATE`;
     if(!old.length)throw new Error('ROSTER_CHANGED_REVIEW_AGAIN');
     if(r.roster_action!=='match'||String(old[0].name)!==r.roster_name||
        String(old[0].rank)!==r.rank||Number(old[0].admin_level)!==r.admin_level){
      throw new Error('ROSTER_CHANGED_REVIEW_AGAIN');
     }
     if(r.skip_reading&&String(old[0].rank)!=='Responsible')throw new Error('LEADER_RANK_CONFLICT');
     if(!r.skip_reading&&String(old[0].rank)==='Responsible')throw new Error('GENERAL_READING_FORBIDDEN');
    }else{
     if(!approve_roster_sync)throw new Error('ROSTER_SYNC_CONFIRMATION_REQUIRED');
     const createdRow=await tx`INSERT INTO chico_next.admins(name,rank,admin_level,active,in_reporting)
       VALUES(${r.name},${r.rank},${r.admin_level},true,${!r.skip_reading}) RETURNING id`;
     id=String(createdRow[0].id);
     await tx`INSERT INTO chico_next.rank_history(admin_id,new_rank) VALUES(${id},${r.rank})`;
     created++;
    }
    if(r.skip_reading){leaders++;continue;}
    if(!id||!r.from_date||!r.to_date)throw new Error('INVALID_IMPORT_ROW');
    const week=weekStart(r.from_date);
    if(week!==weekStart(r.to_date))throw new Error('CROSS_WEEK_NOT_ALLOWED');
    const weekClosed=await tx`SELECT status FROM chico_next.weekly_status WHERE week_start=${week}`;
    if(weekClosed[0]?.status==='closed')throw new Error('WEEK_CLOSED');
    const overlap=await tx`SELECT id FROM chico_next.readings WHERE admin_id=${id} AND from_date<=${r.to_date} AND to_date>=${r.from_date} LIMIT 1`;
    if(overlap.length)throw new Error('OVERLAPPING_PERIOD: '+r.name);
    await tx`INSERT INTO chico_next.readings(admin_id,from_date,to_date,week_start,
      tickets_counter,flags_counter,flags_baseline,hours,rating,note,report_entered_on)
      VALUES(${id},${r.from_date},${r.to_date},${week},
      ${r.tickets_counter},${r.flags_counter},${r.flags_baseline},${r.hours},${r.rating},
      ${r.note},${r.report_entered_on})`;
    affected.add(id);inserted++;
   }
   for(const id of affected)await recompute(id,tx as unknown as ReturnType<typeof db>);
   await tx`UPDATE chico_next.import_staging SET committed_at=now() WHERE id=${preview_id}`;
   await tx`INSERT INTO chico_next.audit(action,summary) VALUES('XLSX_IMPORT',${String(inserted)+' readings; '+String(created)+' members created; 0 existing ranks changed; '+String(leaders)+' leader excluded'})`;
   return {inserted,created,updated:0,leaders};
  });
  return response({ok:true,...result});
 }catch(error){return failure(error);}
}
