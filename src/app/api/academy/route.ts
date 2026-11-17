import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
import {z} from 'zod';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const CHUNK=1048576,MAX=50*CHUNK;
const idSchema=z.string().uuid();
const lesson=z.enum(['jail','jail-2','mute']);
const start=z.object({action:z.literal('start'),lesson,mime:z.enum(['video/mp4','video/webm','video/quicktime']),size:z.number().int().min(1).max(MAX)});
const finish=z.object({action:z.literal('finish'),id:idSchema});
export async function GET(req:NextRequest){const denied=await requireOwner(req);if(denied)return denied;try{const rows=await db()`SELECT lesson,mime,total_bytes FROM chico_next.academy_media WHERE ready=true ORDER BY lesson`;return response({ok:true,items:rows});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{const body=z.discriminatedUnion('action',[start,finish]).safeParse(await req.json());if(!body.success)return response({ok:false,error:'INVALID_INPUT'},422);
 const v=body.data,sql=db();
 if(v.action==='start'){
 const result=await sql.begin(async tx=>{await tx`SELECT pg_advisory_xact_lock(hashtext('chico_academy_'||${v.lesson}))`;
 await tx`DELETE FROM chico_next.academy_media WHERE lesson=${v.lesson} AND ready=false`;
 return await tx`INSERT INTO chico_next.academy_media(lesson,mime,total_bytes) VALUES(${v.lesson},${v.mime},${v.size}) RETURNING id::text`;});
 return response({ok:true,id:result[0].id});
 }
 const result=await sql.begin(async tx=>{
 const m=await tx`SELECT lesson,total_bytes FROM chico_next.academy_media WHERE id=${v.id} AND ready=false FOR UPDATE`;if(!m.length)return false;
 const count=Math.ceil(Number(m[0].total_bytes)/CHUNK);
 const c=await tx`SELECT idx,octet_length(data) AS bytes FROM chico_next.academy_chunks WHERE media_id=${v.id} ORDER BY idx`;
 if(c.length!==count||c.some((r,i)=>r.idx!==i||r.bytes!==Math.min(CHUNK,Number(m[0].total_bytes)-i*CHUNK)))return false;
 await tx`DELETE FROM chico_next.academy_media WHERE lesson=${m[0].lesson} AND ready=true`;
 await tx`UPDATE chico_next.academy_media SET ready=true WHERE id=${v.id}`;
 return true;
 });return result?response({ok:true}):response({ok:false,error:'UPLOAD_INCOMPLETE'},409);
 }catch(e){return failure(e);}
}
export async function PUT(req:NextRequest){
 const denied=await requireOwner(req);if(denied)return denied;
 try{const id=req.nextUrl.searchParams.get('id'),idx=Number(req.nextUrl.searchParams.get('idx'));if(!idSchema.safeParse(id).success||!req.nextUrl.searchParams.has('idx')||!Number.isInteger(idx)||idx<0||idx>=50)return response({ok:false,error:'INVALID_INPUT'},422);
 const length=Number(req.headers.get('content-length'));if(!Number.isInteger(length)||length<1||length>CHUNK)return response({ok:false,error:'INVALID_SIZE'},413);
 const bytes=Buffer.from(await req.arrayBuffer());if(bytes.length!==length)return response({ok:false,error:'INVALID_SIZE'},422);
 const result=await db().begin(async tx=>{const m=await tx`SELECT total_bytes,mime FROM chico_next.academy_media WHERE id=${id} AND ready=false FOR UPDATE`;
 if(!m.length||idx*CHUNK>=Number(m[0].total_bytes)||bytes.length!==Math.min(CHUNK,Number(m[0].total_bytes)-idx*CHUNK))return false;
 if(idx===0){const valid=m[0].mime==='video/webm'?bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])):bytes.subarray(4,8).toString()==='ftyp';if(!valid)return false;}
 await tx`INSERT INTO chico_next.academy_chunks(media_id,idx,data) VALUES(${id},${idx},${bytes}) ON CONFLICT(media_id,idx) DO UPDATE SET data=EXCLUDED.data`;return true;});
 return result?response({ok:true}):response({ok:false,error:'INVALID_CHUNK'},422);
 }catch(e){return failure(e);}
}
