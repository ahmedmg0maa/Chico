import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {POINT_CATEGORIES,validDay} from '@/lib/points-preview';
import {cairoToday,mapPointEvent} from '@/lib/points-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';

const createSchema=z.object({
 adminId:z.string().uuid(),category:z.string(),amount:z.number().int().min(1).max(100000),
 date:z.string(),note:z.string().trim().min(1).max(400)
}).strict();

export async function GET(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const sql=db();
  const [settings,events]=await Promise.all([
   sql`SELECT config,revision FROM chico_next.point_settings WHERE id=1`,
   sql`SELECT id,admin_id,admin_name,category,delta,event_date,note,created_at,voided_at
       FROM chico_next.point_events ORDER BY created_at DESC,id DESC`
  ]);
  return response({ok:true,entries:events.map(mapPointEvent),config:settings[0]?.config||{},revision:Number(settings[0]?.revision||1)});
 }catch(error){return failure(error);}
}

export async function POST(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{
  const parsed=createSchema.safeParse(await req.json());
  if(!parsed.success)return response({ok:false,error:'INVALID_INPUT'},422);
  const v=parsed.data,category=POINT_CATEGORIES.find(c=>c.id===v.category);
  if(!category||!validDay(v.date)||v.date>cairoToday())return response({ok:false,error:'INVALID_INPUT'},422);
  const delta=category.sign*v.amount,sql=db();
  const result=await sql.begin(async tx=>{
   const rows=await tx`INSERT INTO chico_next.point_events(admin_id,admin_name,category,delta,event_date,note)
     SELECT id,name,${category.id},${delta},${v.date}::date,${v.note}
     FROM chico_next.admins
     WHERE id=${v.adminId}::uuid AND active=true AND in_reporting=true
       AND rank IN ('Helper','SN.Helper','Moderator')
     RETURNING id,admin_id,admin_name,category,delta,event_date,note,created_at,voided_at`;
   if(!rows.length)return null;
   await tx`INSERT INTO chico_next.audit(action,summary)
     VALUES('POINTS_ADDED',${String(rows[0].id)+':'+category.id+':'+delta})`;
   return mapPointEvent(rows[0]);
  });
  if(!result)return response({ok:false,error:'ADMIN_NOT_ELIGIBLE'},422);
  return response({ok:true,item:result},201);
 }catch(error){return failure(error);}
}
