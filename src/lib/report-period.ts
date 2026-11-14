import type {Admin,Reading} from './types';
import {eligibleReadings,isEvaluatedAdmin,summarizeReadings,weekStart} from './rules';

/** Keep a multi-day reading intact. Never attribute its totals to any individual day. */
export function selectPeriod(readings:readonly Reading[],from:string,to:string){
 const valid=Boolean(from&&to)&&from<=to&&weekStart(from)===weekStart(to);
 const matching=valid?readings.filter(r=>r.from_date>=from&&r.to_date<=to):[];
 const partial=valid?readings.filter(r=>r.from_date<=to&&r.to_date>=from&&(r.from_date<from||r.to_date>to)):[];
 const overlapping=[...matching,...partial];
 const expandFrom=overlapping.length?overlapping.reduce((v,r)=>r.from_date<v?r.from_date:v,overlapping[0].from_date):from;
 const expandTo=overlapping.length?overlapping.reduce((v,r)=>r.to_date>v?r.to_date:v,overlapping[0].to_date):to;
 return {valid,matching,partial,expandFrom,expandTo,canExport:valid&&matching.length>0&&partial.length===0};
}

export function reportRows(admins:readonly Admin[],readings:readonly Reading[]){
 return admins.filter(isEvaluatedAdmin).map(a=>{
  const own=readings.filter(r=>r.admin_id===a.id)
   .sort((x,y)=>y.to_date.localeCompare(x.to_date)||y.created_at.localeCompare(x.created_at));
  const completeTickets=own.length>0&&own.every(r=>r.tickets_delta!==null);
  const completeFlags=own.length>0&&own.every(r=>r.flags_delta!==null);
  const sum=(key:'tickets_delta'|'flags_delta')=>own.reduce((v,r)=>v+(r[key]??0),0);
  return {
   id:a.id,name:a.name,rank:a.rank,order:a.sort_order,
   tickets:completeTickets?sum('tickets_delta'):null,
   flags:completeFlags?sum('flags_delta'):null,
   rating:own.find(r=>r.rating!==null)?.rating??null,
   flagsIncomplete:own.length>0&&!completeFlags
  };
 });
}
/** If any period member lacks Tickets or Flags, do not display a misleading partial total. */
export function reportTotals(readings:readonly Reading[],admins:readonly Admin[]){
 const included=eligibleReadings([...readings],[...admins]);
 const stats=summarizeReadings(included);
 const tickets=included.length>0&&included.every(r=>r.tickets_delta!==null)?stats.tickets:null;
 const flags=included.length>0&&included.every(r=>r.flags_delta!==null)?stats.flags:null;
 return {tickets,flags,rating:stats.rating,ticketsIncomplete:included.some(r=>r.tickets_delta===null),flagsIncomplete:included.some(r=>r.flags_delta===null)};
}
export function latestPeriod(readings:readonly Reading[]){
 return [...readings].sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at))[0]||null;
}
export function latestSingleDay(readings:readonly Reading[]){
 return latestPeriod(readings.filter(r=>r.from_date===r.to_date));
}
