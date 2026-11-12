import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {RANKS} from '@/lib/types';
export const runtime='nodejs';
const schema=z.object({name:z.string().trim().min(1).max(80),rank:z.enum(RANKS),admin_level:z.number().int().min(1).max(3).nullable().optional()});
export async function POST(req:NextRequest){
  const denied=await requireOwner(req);if(denied)return denied;
  try{
    const data=schema.parse(await req.json());const sql=db();
    const existing=await sql`SELECT 1 FROM chico_next.admins WHERE lower(name)=lower(${data.name})`;
    if(existing.length)return response({ok:false,error:'DUPLICATE_NAME'},409);
    const id=await sql.begin(async tx=>{
      const rows=await tx`INSERT INTO chico_next.admins(name,rank,admin_level) VALUES(${data.name},${data.rank},${data.admin_level??null}) RETURNING id`;
      await tx`INSERT INTO chico_next.rank_history(admin_id,new_rank) VALUES(${rows[0].id},${data.rank})`;
      await tx`INSERT INTO chico_next.audit(action,summary) VALUES('ADMIN_ADD',${String(rows[0].id)})`;
      return rows[0].id;
    });
    return response({ok:true,id},201);
  }catch(e){return failure(e);}
}
