import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {POINT_CATEGORIES} from '@/lib/points-preview';
export const runtime='nodejs';
const inputSchema=z.object({
 revision:z.number().int().min(1),
 config:z.record(z.string(),z.number().int().min(1).max(100000))
}).strict();

export async function PUT(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const parsed=inputSchema.safeParse(await req.json());
  if(!parsed.success)return response({ok:false,error:'INVALID_INPUT'},422);
  const {revision,config}=parsed.data;
  const validIds=new Set(POINT_CATEGORIES.map(c=>c.id));
  if(Object.keys(config).some(key=>!validIds.has(key as typeof POINT_CATEGORIES[number]['id'])))
   return response({ok:false,error:'INVALID_INPUT'},422);
  const sql=db(),updated=await sql.begin(async tx=>{
   const rows=await tx`UPDATE chico_next.point_settings
     SET config=${JSON.stringify(config)}::jsonb,revision=revision+1,updated_at=now()
     WHERE id=1 AND revision=${revision} RETURNING revision`;
   if(!rows.length)return null;
   await tx`INSERT INTO chico_next.audit(action,summary)
    VALUES('POINT_RULES_UPDATED',${'revision '+String(rows[0].revision)})`;
   return Number(rows[0].revision);
  });
  if(updated===null)return response({ok:false,error:'POINTS_CONFLICT'},409);
  return response({ok:true,revision:updated,config});
 }catch(error){return failure(error);}
}
