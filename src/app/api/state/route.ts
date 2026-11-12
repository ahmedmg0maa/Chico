import type {NextRequest} from 'next/server';
import {requireOwner,response,failure} from '@/lib/api';
import {loadState} from '@/lib/state';
export const runtime='nodejs';
export async function GET(req:NextRequest){const denied=await requireOwner(req);if(denied)return denied;try{return response({ok:true,...await loadState()});}catch(e){return failure(e);}}
