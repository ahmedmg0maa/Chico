import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {weekStart} from '@/lib/rules';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const data=z.object({week:z.iso.date(),status:z.enum(['closed','open']),confirm:z.literal(true),note:z.string().max(500).default('')}).parse(await req.json());
    if(weekStart(data.week)!==data.week)throw new Error('INVALID_DATE');
    const sql=db();
    await sql.begin(async tx=>{
      await tx`SELECT pg_advisory_xact_lock(72461119)`;
    await snapshot(tx as unknown as ReturnType<typeof db>,`Before ${data.status} week ${data.week}`);
    await tx`INSERT INTO chico_next.weekly_status(week_start,status,closed_at,closure_note)
      VALUES(${data.week},${data.status},${data.status==='closed'?new Date():null},${data.note}) ON CONFLICT(week_start) DO UPDATE SET status=EXCLUDED.status,closed_at=EXCLUDED.closed_at,closure_note=EXCLUDED.closure_note`;
    await tx`INSERT INTO chico_next.audit(action,summary) VALUES('WEEK_STATUS',${data.week+': '+data.status})`;
    });
    return response({ok:true});
  }catch(e){return failure(e);}
}
