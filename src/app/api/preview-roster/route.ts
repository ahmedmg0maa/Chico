import {response} from '@/lib/api';
import {APPROVED_ROSTER} from '@/lib/roster';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// The publicly visible preview roster is enabled only for Preview or development.
// Do not bundle the official member list in publicly accessible production JS.
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV!=='development')
  return response({ok:false,error:'NOT_FOUND'},404);
 const admins=APPROVED_ROSTER.map((a,i)=>({
  id:'roster-'+i,name:a.name,rank:a.rank,admin_level:a.admin_level,
  active:true,in_reporting:true,sort_order:i+1,joined_on:null,shift_label:null
 }));
 return response({ok:true,admins});
}
