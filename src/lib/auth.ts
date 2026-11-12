import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from './db';

const COOKIE='chico_session';
const TTL=60*60*12;
function secret(){
  const secret=process.env.CHICO_SESSION_SECRET;
  if(!secret || secret.length<32)throw new Error('SESSION_SECRET_NOT_CONFIGURED');
  return secret;
}
export function isPasswordCorrect(input:string){
  const expected=process.env.CHICO_OWNER_PASSWORD;
  if(!expected||expected.length<12)throw new Error('OWNER_PASSWORD_NOT_CONFIGURED');
  const key=secret();
  const first=createHmac('sha256',key).update(input).digest();
  const second=createHmac('sha256',key).update(expected).digest();
  return timingSafeEqual(first,second);
}
function signature(value:string){
  return createHmac('sha256',secret()+':'+process.env.CHICO_OWNER_PASSWORD).update(value).digest('base64url');
}
export function issueSession(response:NextResponse){
  const payload=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+TTL,nonce:randomBytes(16).toString('hex')})).toString('base64url');
  response.cookies.set(COOKIE,`${payload}.${signature(payload)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:TTL});
}
export function clearSession(response:NextResponse){response.cookies.set(COOKIE,'',{httpOnly:true,sameSite:'strict',path:'/',maxAge:0});}
export async function isAuthenticated(){
  const val=(await cookies()).get(COOKIE)?.value;
  if(!val)return false;
  const [payload,sig,extra]=val.split('.');
  if(!payload||!sig||extra)return false;
  try{
    const actual=Buffer.from(sig,'base64url');const expected=Buffer.from(signature(payload),'base64url');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as {exp:number};
    return Number.isInteger(data.exp)&&data.exp>Date.now()/1000;
  }catch{return false;}
}
export function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin)return false; // Browser mutations must declare their origin
  try {
    const o=new URL(origin);
    const host=request.headers.get('x-forwarded-host')||request.headers.get('host');
    return o.host===host&&['https:', 'http:'].includes(o.protocol);
  }catch{return false;}
}
export async function isRateLimited(ip:string){
  const sql=db();const secretHash=createHmac('sha256',secret()).update(ip).digest('hex');
  const rows=await sql`SELECT count(*)::int AS count FROM chico_next.login_attempts WHERE ip_hash=${secretHash} AND failed_at>now()-interval '15 minutes'`;
  return Number(rows[0]?.count)>=8;
}
export async function registerBadLogin(ip:string){
  const sql=db();const secretHash=createHmac('sha256',secret()).update(ip).digest('hex');
  await sql`INSERT INTO chico_next.login_attempts(ip_hash) VALUES(${secretHash})`;
  await sql`DELETE FROM chico_next.login_attempts WHERE failed_at<now()-interval '2 days'`;
}
export async function resetBadLogin(ip:string){
  const sql=db();const secretHash=createHmac('sha256',secret()).update(ip).digest('hex');
  await sql`DELETE FROM chico_next.login_attempts WHERE ip_hash=${secretHash}`;
}
