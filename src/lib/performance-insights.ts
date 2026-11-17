import type {Admin,Reading,Week} from './types';
import {isEvaluatedAdmin,serverFlagRate,weekStart} from './rules';

export type MemberWeek={id:string;name:string;rank:Admin['rank'];order:number;tickets:number|null;flags:number|null;hours:number|null;rating:number|null;from:string|null;to:string|null;complete:boolean;recorded:boolean;rankStable:boolean};
export type RankedMember=MemberWeek&{place:number};
function dayAfter(date:string){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export function weekEnd(week:string){const d=new Date(week+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+6);return d.toISOString().slice(0,10);}
export function availableWeeks(readings:readonly Reading[],weeks:readonly Week[],current?:string){
 const valid=(v:string)=>{try{return weekStart(v)===v;}catch{return false;}};
 return [...new Set([...readings.map(r=>r.week_start),...weeks.map(w=>w.week_start),...(current?[current]:[])].filter(valid))].sort().reverse();
}
export function weeklyMembers(admins:readonly Admin[],readings:readonly Reading[],week:string):MemberWeek[]{
 if(!week)return [];
 const eligible=admins.filter(isEvaluatedAdmin);
 const grouped=new Map<string,Reading[]>();
 for(const r of readings){if(r.week_start!==week||r.from_date<week||r.to_date>weekEnd(week)||r.from_date>r.to_date)continue;const own=grouped.get(r.admin_id)||[];own.push(r);grouped.set(r.admin_id,own);}
 return eligible.map(a=>{
  const own=(grouped.get(a.id)||[]).sort((x,y)=>x.from_date.localeCompare(y.from_date)||x.to_date.localeCompare(y.to_date)||x.created_at.localeCompare(y.created_at));
  const nonoverlap=own.every((r,i)=>i===0||r.from_date>own[i-1].to_date);
  const sum=(key:'tickets_delta'|'flags_delta'|'hours')=>own.length&&nonoverlap&&own.every(r=>typeof r[key]==='number'&&Number.isFinite(r[key])&&r[key]!>=0)?own.reduce((n,r)=>n+r[key]!,0):null;
  const contiguous=own.length>0&&own[0].from_date===week&&own.every((r,i)=>i===0||r.from_date===dayAfter(own[i-1].to_date))&&own[own.length-1].to_date===weekEnd(week);
  const rating=[...own].sort((x,y)=>y.to_date.localeCompare(x.to_date)||y.created_at.localeCompare(x.created_at)).find(r=>r.rating!==null)?.rating??null;
  return {id:a.id,name:a.name,rank:a.rank,order:a.sort_order,tickets:sum('tickets_delta'),flags:sum('flags_delta'),hours:sum('hours'),rating,from:own[0]?.from_date??null,to:own[own.length-1]?.to_date??null,complete:contiguous,rankStable:own.every(r=>r.rank===a.rank),recorded:own.length>0};
 });
}
export function podium(members:readonly MemberWeek[],group:'helper'|'moderator'):RankedMember[]{
 const ranked=members.filter(m=>(group==='moderator'?m.rank==='Moderator':m.rank==='Helper'||m.rank==='SN.Helper')&&m.tickets!==null&&m.tickets>0).sort((a,b)=>b.tickets!-a.tickets!||a.order-b.order||a.id.localeCompare(b.id));
 let place=0;return ranked.map((m,i)=>{if(i===0||m.tickets!==ranked[i-1].tickets)place=i+1;return {...m,place};}).filter(m=>m.place<=3);
}
export function weeklyFacts(members:readonly MemberWeek[]){
 const recorded=members.filter(m=>m.recorded);
 const total=(key:'tickets'|'flags'|'hours')=>recorded.length&&recorded.every(m=>m[key]!==null)?recorded.reduce((n,m)=>n+m[key]!,0):null;
 const tickets=total('tickets'),flags=total('flags');
 return {tickets,flags,hours:total('hours'),rate:serverFlagRate(flags,tickets),recorded:recorded.length,eligible:members.length,missing:members.filter(m=>!m.recorded),unknownFlags:recorded.filter(m=>m.flags===null),unknownTickets:recorded.filter(m=>m.tickets===null),fullCoverage:members.length>0&&members.every(m=>m.complete&&m.tickets!==null)};
}
export function comparableTicketChange(current:readonly MemberWeek[],prior:readonly MemberWeek[],closed:boolean,priorClosed:boolean){
 if(!closed||!priorClosed||!weeklyFacts(current).fullCoverage||!weeklyFacts(prior).fullCoverage||current.length!==prior.length)return null;
 const same=current.every(m=>m.rankStable&&prior.some(p=>p.id===m.id&&p.rank===m.rank&&p.rankStable));if(!same)return null;
 const a=weeklyFacts(current).tickets,b=weeklyFacts(prior).tickets;
 if(a===null||b===null)return null;
 return {delta:a-b,percent:b>0?Math.round((a-b)/b*1000)/10:null};
}
