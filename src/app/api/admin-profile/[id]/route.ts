import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {response,requireOwner,failure} from '@/lib/api';

export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,context:Context){
 const denied=await requireOwner(request);if(denied)return denied;
 try{
  const {id}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return response({ok:false,error:'INVALID_INPUT'},400);
  const sql=db();
  const found=await sql`SELECT id FROM chico_next.admins WHERE id=${id}`;
  if(!found.length)return response({ok:false,error:'NOT_FOUND'},404);
  const ranks=await sql`SELECT previous_rank,new_rank,changed_at FROM chico_next.rank_history WHERE admin_id=${id} ORDER BY changed_at DESC LIMIT 100`;
  return response({ok:true,rank_history:ranks});
 }catch(e){return failure(e);}
}
