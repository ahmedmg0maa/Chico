import type {NextRequest} from 'next/server';
import {readingSchema} from '@/lib/validation';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {recompute,assertOneWeek} from '@/lib/recompute';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const data=readingSchema.parse(await req.json());const week=assertOneWeek(data.from_date,data.to_date);const sql=db();
    const closure=await sql`SELECT status FROM chico_next.weekly_status WHERE week_start=${week}`;
    if(closure[0]?.status==='closed')return response({ok:false,error:'WEEK_CLOSED'},409);
    const exists=await sql`SELECT id FROM chico_next.readings WHERE admin_id=${data.admin_id} AND from_date<=${data.to_date} AND to_date>=${data.from_date} LIMIT 1`;
    if(exists.length)return response({ok:false,error:'OVERLAPPING_PERIOD'},409);
    const result=await sql.begin(async tx=>{
      const row=await tx`INSERT INTO chico_next.readings(admin_id,from_date,to_date,week_start,tickets_counter,flags_counter,flags_baseline,hours,rating,note,report_entered_on)
        VALUES(${data.admin_id},${data.from_date},${data.to_date},${week},${data.tickets_counter},${data.flags_counter},${data.flags_baseline},${data.hours},${data.rating},${data.note},COALESCE(${data.report_entered_on??null}::date,(now() AT TIME ZONE 'Africa/Cairo')::date)) RETURNING id`;
      await recompute(data.admin_id,tx as unknown as ReturnType<typeof db>);
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('READING_ADD',${String(row[0].id)})`;
      return row[0].id;
    });
    return response({ok:true,id:result},201);
  }catch(e){return failure(e);}
}
