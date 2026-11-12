import {dbReady} from '@/lib/db';
import {response} from '@/lib/api';
import {isPasswordCorrect,isRateLimited} from '@/lib/auth';
export const runtime='nodejs';
export async function GET(){
  try {
    await dbReady();
    // Read-only check of the same rate-limit table used during login.
    await isRateLimited('chico-readiness-check');
  } catch (error) {
    const code=error instanceof Error?error.message:'unknown';
    console.error('[health:database]',code.includes('password')?'Database authentication rejected':code.includes('permission')?'Database permissions unavailable':'Database query unavailable');
    return response({ok:false,error:'DATABASE_NOT_READY'},503);
  }
  try {
    // Empty input is guaranteed not to match a correctly configured 12+ character password.
    isPasswordCorrect('');
  } catch (error) {
    const code=error instanceof Error?error.message:'unknown';
    const category=code==='OWNER_PASSWORD_NOT_CONFIGURED'?'OWNER_PASSWORD_LENGTH':code==='SESSION_SECRET_NOT_CONFIGURED'?'SESSION_SECRET_LENGTH':'AUTH_UNKNOWN';
    console.error('[health:auth]',category);
    return response({ok:false,error:'AUTH_NOT_READY',database:'connected'},503);
  }
  return response({ok:true,service:'CHICO Next Generation',database:'connected',auth:'ready',version:'6.0-preview'});
}
