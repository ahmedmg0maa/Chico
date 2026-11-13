import type {NextRequest} from 'next/server';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {readingSchema} from '@/lib/validation';
import {assertOneWeek,recompute} from '@/lib/recompute';
export const runtime='nodejs';
type P={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:P){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const {id}=await ctx.params;const data=readingSchema.parse(await req.json());const week=assertOneWeek(data.from_date,data.to_date);const sql=db();
    const old=await sql`SELECT admin_id,week_start,report_entered_on FROM chico_next.readings WHERE id=${id}`;if(!old.length)return response({ok:false,error:'NOT_FOUND'},404);
    const w=await sql`SELECT week_start FROM chico_next.weekly_status WHERE status='closed' AND week_start IN (${String(old[0].week_start)},${week})`;
    if(w.length)return response({ok:false,error:'WEEK_CLOSED'},409);
    const overlaps=await sql`SELECT id FROM chico_next.readings WHERE admin_id=${data.admin_id} AND id<>${id} AND from_date<=${data.to_date} AND to_date>=${data.from_date} LIMIT 1`;
    if(overlaps.length)return response({ok:false,error:'OVERLAPPING_PERIOD'},409);
    await snapshot(sql,`Before updating reading ${id}`);
    await sql.begin(async tx=>{
      await tx`UPDATE chico_next.readings SET admin_id=${data.admin_id},from_date=${data.from_date},to_date=${data.to_date},week_start=${week},tickets_counter=${data.tickets_counter},flags_counter=${data.flags_counter},flags_baseline=${data.flags_baseline},hours=${data.hours},rating=${data.rating},note=${data.note},report_entered_on=${data.report_entered_on??String(old[0].report_entered_on).slice(0,10)},updated_at=now() WHERE id=${id}`;
      await recompute(data.admin_id,tx as unknown as ReturnType<typeof db>);
      if(String(old[0].admin_id)!==data.admin_id)await recompute(String(old[0].admin_id),tx as unknown as ReturnType<typeof db>);
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('READING_EDIT',${id})`;
    });
    return response({ok:true});
  }catch(e){return failure(e);}
}
export async function DELETE(req:NextRequest,ctx:P){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const {id}=await ctx.params;const {confirm}=await req.json();if(confirm!=='DELETE')return response({ok:false,error:'CONFIRM_REQUIRED'},400);const sql=db();
    const old=await sql`SELECT admin_id,week_start FROM chico_next.readings WHERE id=${id}`;if(!old.length)return response({ok:false,error:'NOT_FOUND'},404);
    const closed=await sql`SELECT status FROM chico_next.weekly_status WHERE week_start=${String(old[0].week_start)}`;
    if(closed[0]?.status==='closed')return response({ok:false,error:'WEEK_CLOSED'},409);
    await snapshot(sql,`Before deleting reading ${id}`);
    await sql.begin(async tx=>{
      await tx`DELETE FROM chico_next.readings WHERE id=${id}`;
      await recompute(String(old[0].admin_id),tx as unknown as ReturnType<typeof db>);
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('READING_DELETE',${id})`;
    });
    return response({ok:true});
  }catch(e){return failure(e);}
}
