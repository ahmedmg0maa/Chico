import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {weekStart} from '@/lib/rules';
import {recompute} from '@/lib/recompute';
export const runtime='nodejs';
const schema=z.object({preview_id:z.string().uuid(),confirm:z.literal('IMPORT REVIEWED')});
type Item={name:string;admin_id:string|null;date:string|null;tickets_counter:number|null;flags_counter:number|null;hours:number|null;rating:number|null};
export async function POST(req:NextRequest){const denied=await requireOwner(req);if(denied)return denied;
 try{const {preview_id}=schema.parse(await req.json());const sql=db();const check=await sql`SELECT id,payload,committed_at,source_hash FROM chico_next.import_staging WHERE id=${preview_id} AND created_at>now()-interval '1 hour'`;
  if(!check.length||check[0].committed_at)return response({ok:false,error:'PREVIEW_EXPIRED_OR_USED'},409);
  const duplicate=await sql`SELECT 1 FROM chico_next.import_staging WHERE source_hash=${check[0].source_hash} AND committed_at IS NOT NULL`;
  if(duplicate.length)return response({ok:false,error:'FILE_ALREADY_IMPORTED'},409);
  const rows=check[0].payload as Item[];
  if(rows.some(r=>!r.admin_id||!r.date))return response({ok:false,error:'REVIEW_REQUIRED_UNKNOWN_NAMES_OR_DATES'},422);
  await snapshot(sql,'Before Excel import');
  let inserted=0;
  await sql.begin(async tx=>{
   for(const r of rows){if(!r.admin_id||!r.date)continue;
    const week=weekStart(r.date);
    const closed=await tx`SELECT status FROM chico_next.weekly_status WHERE week_start=${week}`;
    if(closed[0]?.status==='closed')throw new Error('WEEK_CLOSED');
    const exists=await tx`SELECT 1 FROM chico_next.readings WHERE admin_id=${r.admin_id} AND to_date=${r.date}`;
    if(exists.length)throw new Error('DUPLICATE_READING');
    await tx`INSERT INTO chico_next.readings(admin_id,from_date,to_date,week_start,tickets_counter,flags_counter,hours,rating,note) VALUES(${r.admin_id},${r.date},${r.date},${week},${r.tickets_counter},${r.flags_counter},${r.hours},${r.rating},'Excel import')`;
    inserted++;
   }
   await tx`UPDATE chico_next.import_staging SET committed_at=now() WHERE id=${preview_id}`;
   await tx`INSERT INTO chico_next.audit(action,summary) VALUES('XLSX_IMPORT',${`${inserted} readings`})`;
  });
  for(const id of new Set(rows.map(r=>r.admin_id).filter(Boolean) as string[])){await recompute(id,sql);}
  return response({ok:true,inserted});
 }catch(e){return failure(e);}
}
