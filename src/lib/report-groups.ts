/** Single ranking policy for the CHICO daily/Discord reports. */
export type RankingInput={name:string;rank:string;order:number;tickets:number|null};
export function buildReportGroups<T extends RankingInput>(entries:readonly T[]){
 const sorted=(subset:T[])=>[...subset].sort((a,b)=>{
  if((a.tickets===null)!==(b.tickets===null))return a.tickets===null?1:-1;
  if(a.tickets!==null&&b.tickets!==null&&a.tickets!==b.tickets)return b.tickets-a.tickets;
  return a.order-b.order||a.name.localeCompare(b.name,'en');
 });
 return [
  {id:'helpers',name:'HELPERS + SN.HELPERS',topTitle:'TOP 3 — HELPERS',
   rows:sorted(entries.filter(r=>r.rank==='Helper'||r.rank==='SN.Helper'))},
  {id:'moderators',name:'MODERATORS',topTitle:'TOP 3 — MODERATORS',
   rows:sorted(entries.filter(r=>r.rank==='Moderator'))}
 ] as const;
}
