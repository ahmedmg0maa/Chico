import type { Reading, Rank } from './types';

/** ISO week starts Monday; uses UTC for date-only values, no implicit timezone shifting. */
export function weekStart(iso:string): string {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('INVALID_DATE');
  const d=new Date(`${iso}T00:00:00.000Z`);
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==iso) throw new Error('INVALID_DATE');
  const offset=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-offset);
  return d.toISOString().slice(0,10);
}
export function isEligibleForTop(rank:Rank){return rank==='SN.Helper'||rank==='Helper';}
export function serverFlagRate(flags:number|null,tickets:number|null){return flags===null||tickets===null||tickets<=0?null:Math.round(flags/tickets*10000)/100;}
export function decimalHours(value:number){if(!Number.isFinite(value)||value<0||value>10000)throw new Error('INVALID_HOURS');return Math.round(value*100)/100;}
export function deltaTickets(current:number|null,prior:number|null,sameWeek:boolean):number|null {
  if(current===null)return null;
  if(current<0||!Number.isInteger(current))throw new Error('INVALID_TICKETS');
  if(prior===null||!sameWeek)return current;
  if(current<prior)throw new Error('TICKETS_COUNTER_DECREASE_WITHIN_WEEK');
  return current-prior;
}
export function deltaFlags(current:number|null,prior:number|null,baseline:number|null):number|null {
  if(current===null)return null;
  if(current<0||!Number.isInteger(current))throw new Error('INVALID_FLAGS');
  const start=prior??baseline;
  if(start===null)return null; // Unknown cumulative baseline is NOT zero.
  if(current<start)throw new Error('FLAGS_COUNTER_DECREASE');
  return current-start;
}
export function summarizeReadings(readings:Reading[]){
  const t=readings.filter(x=>x.tickets_delta!==null);
  const f=readings.filter(x=>x.flags_delta!==null);
  const hours=readings.filter(x=>x.hours!==null);
  const ratings=readings.filter(x=>x.rating!==null);
  const tickets=t.length?t.reduce((a,x)=>a+(x.tickets_delta??0),0):null;
  const flags=f.length?f.reduce((a,x)=>a+(x.flags_delta??0),0):null;
  const incompleteFlags=readings.some(x=>x.flags_counter!==null&&x.flags_delta===null);
  return { tickets, flags:incompleteFlags?null:flags, rate:incompleteFlags?null:serverFlagRate(flags,tickets), hours:hours.length?hours.reduce((a,x)=>a+(x.hours??0),0):null, rating:ratings.length?Math.round(ratings.reduce((a,x)=>a+(x.rating??0),0)/ratings.length*100)/100:null, incompleteFlags };
}
