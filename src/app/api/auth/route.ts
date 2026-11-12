import type {NextRequest} from 'next/server';
import {response,failure} from '@/lib/api';
import {issueSession,clearSession,isAuthenticated,isPasswordCorrect,isRateLimited,registerBadLogin,resetBadLogin,sameOrigin} from '@/lib/auth';
export const runtime='nodejs';
export async function GET(){return response({ok:true,authenticated:await isAuthenticated()});}
export async function POST(req:NextRequest){
  if(!sameOrigin(req))return response({ok:false,error:'INVALID_ORIGIN'},403);
  try{
    const data=await req.json();const password=typeof data.password==='string'?data.password:'';
    if(!password||password.length>256)return response({ok:false,error:'INVALID_PASSWORD'},401);
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    if(await isRateLimited(ip))return response({ok:false,error:'RATE_LIMIT'},429);
    if(!isPasswordCorrect(password)){await registerBadLogin(ip);return response({ok:false,error:'INVALID_PASSWORD'},401);}
    await resetBadLogin(ip);const r=response({ok:true});issueSession(r);return r;
  }catch(error){return failure(error);}
}
export async function DELETE(req:NextRequest){
  if(!sameOrigin(req))return response({ok:false,error:'INVALID_ORIGIN'},403);
  const r=response({ok:true});clearSession(r);return r;
}
