import {db} from './db';
import {deltaTickets,deltaFlags,weekStart} from './rules';
/** Recalculate all sequential counter deltas after edits/deletes; never assume the first flag balance is zero. */
export async function recompute(adminId:string,sql:ReturnType<typeof db>){
  const rows=await sql`SELECT id,to_date,week_start,tickets_counter,flags_counter,flags_baseline FROM chico_next.readings WHERE admin_id=${adminId} ORDER BY to_date ASC,id ASC`;
  let lastTickets:null|number=null, lastWeek='';let lastFlags:null|number=null;
  for(const r of rows){
    const ticket=r.tickets_counter===null?null:Number(r.tickets_counter);
    const flag=r.flags_counter===null?null:Number(r.flags_counter);
    const baseline=r.flags_baseline===null?null:Number(r.flags_baseline);
    const sameWeek=String(r.week_start)===lastWeek;
    const t=deltaTickets(ticket,lastTickets,sameWeek);
    const f=deltaFlags(flag,lastFlags,baseline);
    await sql`UPDATE chico_next.readings SET tickets_delta=${t},flags_delta=${f},updated_at=now() WHERE id=${r.id}`;
    if(ticket!==null){lastTickets=ticket;lastWeek=String(r.week_start);}
    if(flag!==null)lastFlags=flag;
  }
}
export function assertOneWeek(from:string,to:string){
  if(weekStart(from)!==weekStart(to))throw new Error('CROSS_WEEK_NOT_ALLOWED');
  if(from>to)throw new Error('INVALID_DATE');
  return weekStart(to);
}
