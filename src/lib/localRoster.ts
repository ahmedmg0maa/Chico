import type {Admin,Rank} from './types';

export const LOCAL_ROSTER_HISTORY_KEY='chico-roster-history-local-v1';
const VALID_RANKS:ReadonlyArray<Rank>=['Responsible','Administrator','Moderator','SN.Helper','Helper'];

export type LocalRosterEvent={
  admin_id:string;
  kind:'rank'|'shift'|'name'|'delete';
  previous:string|null;
  next:string|null;
  changed_at:string;
};
export type LocalRosterInput={
  name:string;
  rank:Rank;
  admin_level:number;
  shift_label:string|null;
  active:boolean;
  in_reporting:boolean;
};
export type LocalRosterAction=
  | {kind:'add'; id:string; input:LocalRosterInput}
  | {kind:'edit'; id:string; input:LocalRosterInput}
  | {kind:'delete'; id:string};
export type LocalRosterResult={admins:Admin[];events:LocalRosterEvent[]};

export function applyLocalRosterChange(admins:ReadonlyArray<Admin>,action:LocalRosterAction,changedAt:string):LocalRosterResult{
  if(!Number.isFinite(Date.parse(changedAt)))throw Error('INVALID_TIMESTAMP');
  const index=admins.findIndex(a=>a.id===action.id);
  if(action.kind==='delete'){
    if(index<0)throw Error('ADMIN_NOT_FOUND');
    return {admins:admins.filter(a=>a.id!==action.id),events:[{admin_id:action.id,kind:'delete',previous:admins[index].name,next:null,changed_at:changedAt}]};
  }
  const name=action.input.name.trim();
  if(!name||name.length>80)throw Error('INVALID_NAME');
  if(!VALID_RANKS.includes(action.input.rank))throw Error('INVALID_RANK');
  if(!Number.isInteger(action.input.admin_level)||action.input.admin_level<1||action.input.admin_level>3)throw Error('INVALID_ADMIN_LEVEL');
  const shift=action.input.shift_label?.trim()||null;
  if(shift!==null&&shift.length>120)throw Error('INVALID_SHIFT');
  if(admins.some(a=>a.id!==action.id&&a.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('DUPLICATE_NAME');
  const input=action.input;
  if(action.kind==='add'){
    if(index!==-1)throw Error('DUPLICATE_ID');
    const admin:Admin={id:action.id,name,rank:input.rank,admin_level:input.admin_level,shift_label:shift,active:input.active,in_reporting:input.in_reporting,sort_order:admins.length+1,joined_on:null};
    return {admins:[...admins,admin],events:[{admin_id:action.id,kind:'rank',previous:null,next:input.rank,changed_at:changedAt},...(shift?[{admin_id:action.id,kind:'shift' as const,previous:null,next:shift,changed_at:changedAt}]:[])]};
  }
  if(index<0)throw Error('ADMIN_NOT_FOUND');
  const previous=admins[index];
  const next={...previous,name,rank:input.rank,admin_level:input.admin_level,shift_label:shift,active:input.active,in_reporting:input.in_reporting};
  const event=(kind:LocalRosterEvent['kind'],prev:string|null,newValue:string|null):LocalRosterEvent=>({admin_id:action.id,kind,previous:prev,next:newValue,changed_at:changedAt});
  const events:LocalRosterEvent[]=[];
  if(previous.rank!==next.rank)events.push(event('rank',previous.rank,next.rank));
  if((previous.shift_label||null)!==shift)events.push(event('shift',previous.shift_label||null,shift));
  if(previous.name!==name)events.push(event('name',previous.name,name));
  return {admins:admins.map(a=>a.id===action.id?next:a),events};
}
