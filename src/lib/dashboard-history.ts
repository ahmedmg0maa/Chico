import type {Admin,Reading} from './types';
import {eligibleReadings} from './rules';

/**
 * Last *eligible recorded* week before the currently selected/current Cairo week.
 * This is an explicit historical snapshot, never a substitute for live weekly KPIs.
 * Date bounds are the envelope of stored readings, not proof of day-by-day coverage.
 */
export type PreviousRecordedWeek={
 weekStart:string;
 from:string;
 to:string;
 records:number;
 members:number;
 tickets:number|null;
 flags:number|null;
 hours:number|null;
};

export function previousRecordedWeek(
 admins:readonly Admin[],
 readings:readonly Reading[],
 currentWeek:string
):PreviousRecordedWeek|null{
 const earlier=eligibleReadings([...readings],[...admins]).filter(r=>r.week_start<currentWeek);
 if(!earlier.length)return null;
 const weekStart=earlier.reduce((latest,r)=>r.week_start>latest?r.week_start:latest,earlier[0].week_start);
 const records=earlier.filter(r=>r.week_start===weekStart);
 const earliest=records.reduce((value,r)=>r.from_date<value?r.from_date:value,records[0].from_date);
 const latest=records.reduce((value,r)=>r.to_date>value?r.to_date:value,records[0].to_date);
 // Unknown deltas mean the weekly sum is unknown. Do not show a misleading partial total.
 const total=(key:'tickets_delta'|'flags_delta'|'hours')=>
  records.every(r=>r[key]!==null)?records.reduce((sum,r)=>sum+(r[key]??0),0):null;
 return {
  weekStart,from:earliest,to:latest,
  records:records.length,
  members:new Set(records.map(r=>r.admin_id)).size,
  tickets:total('tickets_delta'),
  flags:total('flags_delta'),
  hours:total('hours')
 };
}
