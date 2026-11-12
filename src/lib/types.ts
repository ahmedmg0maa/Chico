export const RANKS = ['Responsible','Administrator','Moderator','SN.Helper','Helper'] as const;
export type Rank = typeof RANKS[number];
export type Admin = { id: string; name: string; rank: Rank; active: boolean; in_reporting: boolean; sort_order: number; joined_on: string | null };
export type Reading = { id: string; admin_id: string; admin_name: string; rank: Rank; from_date: string; to_date: string; week_start: string; tickets_counter: number | null; tickets_delta: number | null; flags_counter: number | null; flags_delta: number | null; hours: number | null; rating: number | null; note: string; created_at: string };
export type Week = { week_start: string; status: 'open' | 'closed'; closed_at: string | null };
export type Summary = {week_start:string; tickets:number|null; flags:number|null; rate:number|null; rating:number|null; hours:number|null; members:number; reported:number; missing:number; incompleteFlags:boolean; top:{ id:string; name:string; rank:Rank; tickets:number }[]; alerts:{id:string;name:string;message:string;kind:'danger'|'warning'}[] };
export type State = { admins: Admin[]; readings: Reading[]; weeks: Week[]; summary: Summary; serverTime: string };
