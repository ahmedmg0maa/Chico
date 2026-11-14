/** CHICO list order follows the approved roster, not ticket performance. */
export type RankingInput={name:string;rank:string;order:number;tickets:number|null};
export function buildReportGroups<T extends RankingInput>(entries:readonly T[]){
 const rosterOrder=(subset:T[])=>[...subset].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'en'));
 const ticketOrder=(subset:T[])=>[...subset].filter(r=>r.tickets!==null).sort((a,b)=>(b.tickets??0)-(a.tickets??0)||a.order-b.order||a.name.localeCompare(b.name,'en')).slice(0,3);
 const helper=entries.filter(r=>r.rank==='Helper'||r.rank==='SN.Helper');
 const moderator=entries.filter(r=>r.rank==='Moderator');
 return [
  {id:'helpers',name:'HELPERS + SN.HELPERS',topTitle:'TOP 3 — HELPERS',
   rows:rosterOrder(helper),topRows:ticketOrder(helper)},
  {id:'moderators',name:'MODERATORS',topTitle:'TOP 3 — MODERATORS',
   rows:rosterOrder(moderator),topRows:ticketOrder(moderator)}
 ] as const;
}
