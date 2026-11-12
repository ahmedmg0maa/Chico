import {dbReady} from '@/lib/db';
import {response} from '@/lib/api';
export const runtime='nodejs';
export async function GET(){
  try{await dbReady();return response({ok:true,service:'CHICO Next Generation',database:'connected',version:'6.0-preview'});}
  catch(error){console.error('[health]',error instanceof Error?error.message:'unknown');return response({ok:false,error:'DATABASE_NOT_READY'},503);}
}
