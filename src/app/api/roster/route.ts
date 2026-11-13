import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {RANKS} from '@/lib/types';
export const runtime='nodejs';
const schema=z.object({
 name:z.string().trim().min(1).max(80),rank:z.enum(RANKS),
 admin_level:z.number().int().min(1).max(3).nullable().optional(),
 full_name:z.string().trim().max(120).nullable().optional(),
 shift_label:z.string().trim().max(120).nullable().optional(),
 joined_on:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
 timezone:z.enum(['Africa/Cairo','Asia/Riyadh','UTC']).optional(),
 supervisor_id:z.string().uuid().nullable().optional(),
 notes:z.string().trim().max(2000).optional(),
 active:z.boolean().optional(),in_reporting:z.boolean().optional()
});
export async function POST(req:NextRequest){
  const denied=await requireOwner(req);if(denied)return denied;
  try{
    const data=schema.parse(await req.json());const sql=db();
    const existing=await sql`SELECT 1 FROM chico_next.admins WHERE lower(name)=lower(${data.name})`;
    if(existing.length)return response({ok:false,error:'DUPLICATE_NAME'},409);
    const id=await sql.begin(async tx=>{
      const rows=await tx`INSERT INTO chico_next.admins(name,rank,admin_level,full_name,shift_label,joined_on,timezone,supervisor_id,notes,active,in_reporting) VALUES(${data.name},${data.rank},${data.admin_level??null},${data.full_name??null},${data.shift_label??null},${data.joined_on??null},${data.timezone??'Africa/Cairo'},${data.supervisor_id??null},${data.notes??''},${data.active??true},${data.in_reporting??true}) RETURNING id`;
      await tx`INSERT INTO chico_next.rank_history(admin_id,new_rank) VALUES(${rows[0].id},${data.rank})`;
      if(data.shift_label)await tx`INSERT INTO chico_next.shift_history(admin_id,previous_shift,new_shift) VALUES(${rows[0].id},${null},${data.shift_label})`;
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('ADMIN_ADD',${String(rows[0].id)})`;
      return rows[0].id;
    });
    return response({ok:true,id},201);
  }catch(e){return failure(e);}
}
