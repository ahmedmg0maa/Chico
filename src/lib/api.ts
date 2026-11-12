import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuthenticated,sameOrigin } from './auth';

export const runtime='nodejs';
export function response(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(error:unknown){
  const message=error instanceof Error?error.message:'UNKNOWN_ERROR';
  const known=new Set(['INVALID_DATE','INVALID_HOURS','INVALID_TICKETS','INVALID_FLAGS','TICKETS_COUNTER_DECREASE_WITHIN_WEEK','FLAGS_COUNTER_DECREASE','WEEK_CLOSED','DUPLICATE_NAME','INVALID_INPUT','NO_DATA','INVALID_PASSWORD','NO_CHANGES','DATABASE_POOLER_TENANT_REQUIRED','PREVIEW_PRODUCTION_DATABASE_BLOCKED']);
  const config=message.includes('NOT_CONFIGURED')||message.includes('does not exist')||message.includes('ENOTFOUND')||message.includes('ECONNREFUSED')||message.includes('password authentication failed');
  if(!known.has(message))console.error('[CHICO_API]',config?'Configuration or database unavailable':message);
  return response({ok:false,error:known.has(message)?message:config?'SERVICE_NOT_READY':'INTERNAL_ERROR'},known.has(message)?400:503);
}
export async function requireOwner(request:NextRequest){
  if(request.method!=='GET'&&!sameOrigin(request))return response({ok:false,error:'INVALID_ORIGIN'},403);
  if(!await isAuthenticated())return response({ok:false,error:'LOGIN_REQUIRED'},401);
  return null;
}
