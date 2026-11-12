import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db,snapshot} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {RANKS} from '@/lib/types';
export const runtime='nodejs';
const schema=z.object({name:z.string().trim().min(1).max(80),rank:z.enum(RANKS),admin_level:z.number().int().min(1).max(3).nullable().optional(),shift_label:z.string().trim().max(120).nullable().optional(),active:z.boolean(),in_reporting:z.boolean()});
type P={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:P){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const {id}=await ctx.params;const d=schema.parse(await req.json());const sql=db();
    const found=await sql`SELECT rank,admin_level,shift_label FROM chico_next.admins WHERE id=${id}`;if(!found.length)return response({ok:false,error:'NOT_FOUND'},404);
    const other=await sql`SELECT 1 FROM chico_next.admins WHERE lower(name)=lower(${d.name}) AND id<>${id}`;if(other.length)return response({ok:false,error:'DUPLICATE_NAME'},409);
    await sql.begin(async tx=>{
      await tx`UPDATE chico_next.admins SET name=${d.name},rank=${d.rank},admin_level=${d.admin_level===undefined?found[0].admin_level:d.admin_level},shift_label=${d.shift_label===undefined?found[0].shift_label:d.shift_label},active=${d.active},in_reporting=${d.in_reporting} WHERE id=${id}`;
      if(found[0].rank!==d.rank)await tx`INSERT INTO chico_next.rank_history(admin_id,previous_rank,new_rank) VALUES(${id},${String(found[0].rank)},${d.rank})`;
      if(d.shift_label!==undefined&&d.shift_label!==(found[0].shift_label??null))await tx`INSERT INTO chico_next.shift_history(admin_id,previous_shift,new_shift) VALUES(${id},${found[0].shift_label??null},${d.shift_label})`;
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('ADMIN_EDIT',${id})`;
    });return response({ok:true});
  }catch(e){return failure(e);}
}
export async function DELETE(req:NextRequest,ctx:P){
  const denied=await requireOwner(req);if(denied)return denied;
  try{const {id}=await ctx.params;const {confirm}=await req.json();if(confirm!=='DELETE')return response({ok:false,error:'CONFIRM_REQUIRED'},400);
    const sql=db();await snapshot(sql,`Before deleting administrator ${id}`);
    const result=await sql`DELETE FROM chico_next.admins WHERE id=${id} RETURNING id`;
    if(!result.length)return response({ok:false,error:'NOT_FOUND'},404);
    await sql`INSERT INTO chico_next.audit(action,summary) VALUES('ADMIN_DELETE',${id})`;
    return response({ok:true});
  }catch(e){return failure(e);}
}
