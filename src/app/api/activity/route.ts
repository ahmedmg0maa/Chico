import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const denied=await requireOwner(request);if(denied)return denied;
 try{
  const sql=db();
  const rows=await sql`SELECT id::text AS id,action,summary,created_at FROM chico_next.audit ORDER BY created_at DESC LIMIT 40`;
  return response({ok:true,items:rows.map(r=>({id:String(r.id),action:String(r.action),summary:String(r.summary),created_at:String(r.created_at)}))});
 }catch(error){return failure(error);}
}
