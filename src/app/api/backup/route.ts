import type {NextRequest} from 'next/server';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
export const runtime='nodejs';
export async function GET(req:NextRequest){const denied=await requireOwner(req);if(denied)return denied;try{
 const sql=db();const rows=await sql`SELECT id,label,created_at FROM chico_next.backups ORDER BY created_at DESC LIMIT 40`;return response({ok:true,backups:rows});
}catch(e){return failure(e);}}
export async function POST(req:NextRequest){const denied=await requireOwner(req);if(denied)return denied;try{const sql=db();await snapshot(sql,'Manual backup');return response({ok:true});}catch(e){return failure(e);}}
