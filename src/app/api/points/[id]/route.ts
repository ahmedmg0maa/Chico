import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {mapPointEvent} from '@/lib/points-server';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
const voidSchema=z.object({confirm:z.literal('VOID_POINTS')}).strict();

export async function PATCH(req:NextRequest,ctx:Context){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const {id}=await ctx.params;
  if(!z.string().uuid().safeParse(id).success || !voidSchema.safeParse(await req.json()).success)
   return response({ok:false,error:'INVALID_INPUT'},422);
  const sql=db(),item=await sql.begin(async tx=>{
   const rows=await tx`UPDATE chico_next.point_events SET voided_at=now()
      WHERE id=${id}::uuid AND voided_at IS NULL
      RETURNING id,admin_id,admin_name,category,delta,event_date,note,created_at,voided_at`;
   if(!rows.length)return null;
   await tx`INSERT INTO chico_next.audit(action,summary) VALUES('POINTS_VOIDED',${id})`;
   return mapPointEvent(rows[0]);
  });
  if(!item)return response({ok:false,error:'POINTS_ALREADY_VOIDED_OR_MISSING'},409);
  return response({ok:true,item});
 }catch(error){return failure(error);}
}
