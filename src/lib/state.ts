import { db } from './db';
import { weekStart, isEligibleForTop, summarizeReadings } from './rules';
import type { Admin, Reading, State, Summary, Week } from './types';

function mapAdmin(row:Record<string,unknown>):Admin{
  return {id:String(row.id),name:String(row.name),rank:row.rank as Admin['rank'],active:!!row.active,in_reporting:!!row.in_reporting,sort_order:Number(row.sort_order),joined_on:row.joined_on?String(row.joined_on).slice(0,10):null};
}
function mapReading(row:Record<string,unknown>):Reading{
  const n=(x:unknown)=>x===null||x===undefined?null:Number(x);
  return {id:String(row.id),admin_id:String(row.admin_id),admin_name:String(row.admin_name),rank:row.rank as Reading['rank'],from_date:String(row.from_date).slice(0,10),to_date:String(row.to_date).slice(0,10),week_start:String(row.week_start).slice(0,10),tickets_counter:n(row.tickets_counter),tickets_delta:n(row.tickets_delta),flags_counter:n(row.flags_counter),flags_delta:n(row.flags_delta),hours:n(row.hours),rating:n(row.rating),note:String(row.note||''),created_at:String(row.created_at)};
}
export async function loadState():Promise<State>{
  const sql=db();
  const [ar,rr,wr]=await Promise.all([
    sql`SELECT id,name,rank,active,in_reporting,sort_order,joined_on FROM chico_next.admins ORDER BY sort_order ASC, name ASC`,
    sql`SELECT r.*,a.name AS admin_name,a.rank FROM chico_next.readings r JOIN chico_next.admins a ON a.id=r.admin_id ORDER BY r.to_date DESC,r.created_at DESC LIMIT 2000`,
    sql`SELECT week_start,status,closed_at FROM chico_next.weekly_status ORDER BY week_start DESC LIMIT 52`
  ]);
  const admins=ar.map(r=>mapAdmin(r)); const readings=rr.map(r=>mapReading(r));
  const weeks=wr.map(r=>({week_start:String(r.week_start).slice(0,10),status:r.status as Week['status'],closed_at:r.closed_at?String(r.closed_at):null}));
  // Business date: Egypt's date, not UTC calendar day.
  const cairoDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const monday=weekStart(cairoDate);
  const current=readings.filter(r=>r.week_start===monday);
  const metrics=summarizeReadings(current);
  const sums=new Map<string,number>();
  current.forEach(r=>{if(r.tickets_delta!==null)sums.set(r.admin_id,(sums.get(r.admin_id)||0)+r.tickets_delta);});
  const top=admins.filter(a=>isEligibleForTop(a.rank)&&sums.has(a.id)).sort((a,b)=>(sums.get(b.id)||0)-(sums.get(a.id)||0)).slice(0,3).map(a=>({id:a.id,name:a.name,rank:a.rank,tickets:sums.get(a.id)||0}));
  const alerts:Summary['alerts']=[];
  for(const admin of admins){
    const mine=current.filter(r=>r.admin_id===admin.id).sort((a,b)=>b.to_date.localeCompare(a.to_date));
    const latest=mine[0];
    const flags=mine.filter(r=>r.flags_delta!==null);
    if(flags.length&&flags.length===mine.filter(r=>r.flags_counter!==null).length){
      const weekFlags=flags.reduce((n,r)=>n+(r.flags_delta||0),0);
      if(weekFlags>10)alerts.push({id:admin.id,name:admin.name,message:`${weekFlags} weekly Flags`,kind:'danger'});
    }
    const lastRating=mine.find(r=>r.rating!==null);
    if(lastRating?.rating!==null&&lastRating?.rating!==undefined&&lastRating.rating<4.8){
      alerts.push({id:admin.id,name:admin.name,message:`Rating ${lastRating.rating.toFixed(2)}`,kind:'warning'});
    }
  }
  const summary:Summary={week_start:monday,...metrics,members:admins.filter(a=>a.active).length,reported:new Set(current.map(r=>r.admin_id)).size,missing:admins.filter(a=>a.active&&!current.some(r=>r.admin_id===a.id)).length,top,alerts};
  return {admins,readings,weeks,summary,serverTime:new Date().toISOString()};
}
