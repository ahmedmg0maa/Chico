import type {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {requireOwner,response,failure} from '@/lib/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const CHUNK=1048576;
type Props={params:Promise<{lesson:string}>};
export async function GET(req:NextRequest,{params}:Props){
 const denied=await requireOwner(req);if(denied)return denied;
 try{const {lesson}=await params;if(!['jail','jail-2','mute'].includes(lesson))return response({ok:false},404);
 const sql=db(),rows=await sql`SELECT id,total_bytes,mime FROM chico_next.academy_media WHERE lesson=${lesson} AND ready=true`;if(!rows.length)return response({ok:false,error:'NOT_FOUND'},404);
 const m=rows[0],size=Number(m.total_bytes),range=req.headers.get('range');
 let start=0,end=size-1;
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size,'Cache-Control':'no-store'}});
 if(!match[1])start=Math.max(0,size-Number(match[2]));else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size,'Cache-Control':'no-store'}});}
 // Limit each query to a single bounded chunk. Browser can seek using byte ranges.
 let idx=Math.floor(start/CHUNK),last=Math.floor(end/CHUNK);
 const body=new ReadableStream<Uint8Array>({async pull(controller){try{
 if(idx>last){controller.close();return;}
 const chunks=await sql`SELECT data FROM chico_next.academy_chunks WHERE media_id=${m.id} AND idx=${idx}`;if(!chunks.length)throw Error('MEDIA_MISSING');
 const b:Buffer=chunks[0].data;const from=idx===Math.floor(start/CHUNK)?start%CHUNK:0,to=idx===last?end%CHUNK+1:b.length;
 controller.enqueue(new Uint8Array(b.subarray(from,to)));idx++;
 }catch(e){controller.error(new Error('MEDIA_UNAVAILABLE'))}}});
 const headers:Record<string,string>={'Content-Type':String(m.mime),'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 if(range)headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
 return new Response(body,{status:range?206:200,headers});
 }catch(e){return failure(e);}
}
