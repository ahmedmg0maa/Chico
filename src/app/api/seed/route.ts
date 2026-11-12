import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {APPROVED_ROSTER} from '@/lib/roster';
export const runtime='nodejs';
/** Never auto-seed. Owner requests an explicit one-time names/ranks only import. */
export async function POST(req:NextRequest){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const {confirm}=await req.json();if(confirm!=='IMPORT NAMES')return response({ok:false,error:'CONFIRM_REQUIRED'},400);
    const sql=db();const rows=await sql`SELECT count(*)::int AS n FROM chico_next.admins`;
    if(Number(rows[0].n)>0)return response({ok:false,error:'ROSTER_NOT_EMPTY'},409);
    await sql.begin(async tx=>{
      for(const {name,rank} of APPROVED_ROSTER){await tx`INSERT INTO chico_next.admins(name,rank) VALUES(${name},${rank})`;}
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('ROSTER_SEED','Imported verified names/ranks only; no statistics')`;
    });return response({ok:true,imported:APPROVED_ROSTER.length});
  }catch(e){return failure(e);}
}
