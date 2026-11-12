import type {NextRequest} from 'next/server';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const {scope,phrase}=await req.json();if(!['statistics','everything'].includes(scope)||phrase!==(scope==='statistics'?'RESET STATS':'DELETE ALL'))return response({ok:false,error:'CONFIRM_REQUIRED'},400);
    const sql=db();await snapshot(sql,`Before reset ${scope}`);
    await sql.begin(async tx=>{
      await tx`DELETE FROM chico_next.readings`;await tx`DELETE FROM chico_next.weekly_status`;
      if(scope==='everything'){await tx`DELETE FROM chico_next.admins`;}
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('RESET',${scope})`;
    });return response({ok:true});
  }catch(e){return failure(e);}
}
