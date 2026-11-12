import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
export const runtime='nodejs';
type P={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:P){const denied=await requireOwner(req);if(denied)return denied;try{const {id}=await ctx.params;const sql=db();const rows=await sql`SELECT snapshot FROM chico_next.backups WHERE id=${id}`;if(!rows.length)return response({ok:false,error:'NOT_FOUND'},404);return new Response(JSON.stringify(rows[0].snapshot),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="CHICO_backup_${id}.json"`,'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
