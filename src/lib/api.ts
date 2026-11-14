import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuthenticated,sameOrigin } from './auth';

export const runtime='nodejs';
export function response(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(error:unknown){
 const raw=error instanceof Error?error.message:'UNKNOWN_ERROR';
 // Error codes are stable; never expose raw SQL messages or record names to the browser.
 const code=raw.startsWith('OVERLAPPING_PERIOD:')?'OVERLAPPING_PERIOD':raw;
 const conflict=new Set(['OVERLAPPING_PERIOD','FILE_ALREADY_IMPORTED','WEEK_CLOSED','ROSTER_CHANGED_REVIEW_AGAIN',
   'TICKETS_COUNTER_DECREASE_WITHIN_WEEK','FLAGS_COUNTER_DECREASE','PREVIEW_EXPIRED_OR_USED','LEADER_RANK_CONFLICT']);
 const invalid=new Set(['INVALID_DATE','CROSS_WEEK_NOT_ALLOWED','INVALID_HOURS','INVALID_TICKETS','INVALID_FLAGS',
   'INVALID_INPUT','INVALID_PASSWORD','DUPLICATE_NAME','NO_DATA','NO_CHANGES','DUPLICATE_READING',
   'GENERAL_READING_FORBIDDEN','READING_NOT_ALLOWED_FOR_RANK','FIRST_TICKETS_READING_MUST_COVER_WEEK_START',
   'MISSING_RANK','IMPORT_REVIEW_ERRORS','ROSTER_SYNC_CONFIRMATION_REQUIRED','INVALID_IMPORT_ROW',
   'PREVIEW_FORMAT_OUTDATED','FILE_ALREADY_IMPORTED']);
 const config=raw.includes('NOT_CONFIGURED')||raw.includes('does not exist')||
   raw.includes('ENOTFOUND')||raw.includes('ECONNREFUSED')||raw.includes('password authentication failed');
 const known=conflict.has(code)||invalid.has(code);
 if(!known)console.error('[CHICO_API]',config?'Configuration or database unavailable':code);
 const safe=known?code:config?'SERVICE_NOT_READY':'INTERNAL_ERROR';
 const status=conflict.has(code)?409:invalid.has(code)?422:config?503:500;
 return response({ok:false,error:safe},status);
}
export async function requireOwner(request:NextRequest){
  if(request.method!=='GET'&&!sameOrigin(request))return response({ok:false,error:'INVALID_ORIGIN'},403);
  if(!await isAuthenticated())return response({ok:false,error:'LOGIN_REQUIRED'},401);
  return null;
}
