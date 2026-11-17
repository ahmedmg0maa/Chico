import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {salaryInput} from '@/lib/salary';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{const sql=db();const rows=await sql`SELECT p.admin_id::text,p.rp_name,p.rp_server,p.client_id::text,p.bonus_count,p.bonus_amount::float8,p.revision FROM chico_next.salary_profiles p JOIN chico_next.admins a ON a.id=p.admin_id WHERE a.active=true ORDER BY a.sort_order`;return response({ok:true,items:rows});}catch(e){return failure(e);}
}
export async function PUT(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
 const parsed=salaryInput.safeParse(await req.json());if(!parsed.success)return response({ok:false,error:'INVALID_INPUT'},422);
 const v=parsed.data,sql=db();
 const result=await sql.begin(async tx=>{
 const admins=await tx`SELECT id FROM chico_next.admins WHERE id=${v.admin_id} AND active=true FOR UPDATE`;
 if(!admins.length)return {status:404};
 const current=await tx`SELECT revision FROM chico_next.salary_profiles WHERE admin_id=${v.admin_id} FOR UPDATE`;
 if(Number(current[0]?.revision??0)!==v.revision)return {status:409};
 const rows=await tx`INSERT INTO chico_next.salary_profiles(admin_id,rp_name,rp_server,client_id,bonus_count,bonus_amount)
 VALUES(${v.admin_id},${v.rp_name},${v.rp_server},${v.client_id},${v.bonus_count},${v.bonus_amount})
 ON CONFLICT(admin_id) DO UPDATE SET rp_name=EXCLUDED.rp_name,rp_server=EXCLUDED.rp_server,client_id=EXCLUDED.client_id,bonus_count=EXCLUDED.bonus_count,bonus_amount=EXCLUDED.bonus_amount,revision=chico_next.salary_profiles.revision+1,updated_at=now()
 RETURNING admin_id::text,rp_name,rp_server,client_id::text,bonus_count,bonus_amount::float8,revision`;
 await tx`INSERT INTO chico_next.audit(action,summary) VALUES('SALARY_PROFILE_UPDATED',${v.admin_id})`;
 return {status:200,item:rows[0]};
 });
 return result.status===200?response({ok:true,item:result.item}):response({ok:false,error:result.status===409?'SALARY_CONFLICT':'ADMIN_NOT_FOUND'},result.status);
 }catch(e){return failure(e);}
}
