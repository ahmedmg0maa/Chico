import type {Admin} from './types';
import {isEvaluatedAdmin} from './rules';

export const POINT_CATEGORIES=[
 {id:'shift_attended',label:'حضور المناوبة',sign:1},
 {id:'support_response',label:'الاستجابة للدعم',sign:1},
 {id:'competition_win',label:'الفوز في مسابقة',sign:1},
 {id:'recognition',label:'مكافأة إدارية',sign:1},
 {id:'shift_missed',label:'غياب عن المناوبة',sign:-1},
 {id:'warning',label:'تحذير',sign:-1},
 {id:'reprimand',label:'توبيخ',sign:-1},
] as const;
export type Category=typeof POINT_CATEGORIES[number]['id'];
export type PointsEntry={id:string;adminId:string;adminName:string;category:Category;delta:number;date:string;note:string;createdAt:string;voidedAt?:string};
export type PointsDraft={adminId:string;category:Category;amount:number;date:string;note:string};
export type PointConfig=Partial<Record<Category,number>>;
export const POINTS_PREVIEW_KEY='chico-points-preview-v1';
export function validateAmount(amount:number){return Number.isSafeInteger(amount)&&amount>0&&amount<=100000;}
export function validDay(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;}
export function addPoints(entries:readonly PointsEntry[],admins:readonly Admin[],draft:PointsDraft,id:string,now:string,today:string):PointsEntry[]{
 const admin=admins.find(a=>a.id===draft.adminId&&isEvaluatedAdmin(a));
 const cat=POINT_CATEGORIES.find(c=>c.id===draft.category);
 if(!admin||!cat||!validateAmount(draft.amount)||!validDay(draft.date)||!validDay(today)||draft.date>today||!draft.note.trim()||draft.note.trim().length>400||!id||entries.some(e=>e.id===id)||!Number.isFinite(Date.parse(now)))throw Error('INVALID_POINTS_ENTRY');
 return [{id,adminId:admin.id,adminName:admin.name,category:cat.id,delta:cat.sign*draft.amount,date:draft.date,note:draft.note.trim(),createdAt:now},...entries];
}
export function voidPoints(entries:readonly PointsEntry[],id:string,now:string):PointsEntry[]{
 if(!Number.isFinite(Date.parse(now))||!entries.some(e=>e.id===id&&!e.voidedAt))throw Error('INVALID_POINTS_REVERSAL');
 return entries.map(e=>e.id===id?{...e,voidedAt:now}:e);
}
export function netPoints(entries:readonly PointsEntry[],adminId?:string){return entries.filter(e=>!e.voidedAt&&(!adminId||e.adminId===adminId)).reduce((n,e)=>n+e.delta,0);}
export function groupFixedShifts(admins:readonly Admin[]){
 const grouped=new Map<string,Admin[]>(),missing:Admin[]=[];
 for(const a of [...admins].sort((a,b)=>a.sort_order-b.sort_order)){if(!a.active)continue;const label=a.shift_label?.trim();if(!label){missing.push(a);continue;}const list=grouped.get(label)||[];list.push(a);grouped.set(label,list);}
 return {groups:[...grouped].map(([label,members])=>({label,members})),missing};
}
export function parsePreview(raw:string|null):{entries:PointsEntry[];config:PointConfig}{
 const empty={entries:[],config:{}};
 if(!raw)return empty;
 try{
  const v=JSON.parse(raw);const config:PointConfig={};
  for(const c of POINT_CATEGORIES){const n=v.config?.[c.id];if(validateAmount(n))config[c.id]=n;}
  const ids=new Set<string>();
  const entries:Array<PointsEntry>=Array.isArray(v.entries)?v.entries.filter((e:PointsEntry)=>{
   const c=POINT_CATEGORIES.find(c=>c.id===e?.category);
   if(!c||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.adminId!=='string'||typeof e.adminName!=='string'||typeof e.note!=='string'||!validDay(e.date)||!validateAmount(Math.abs(e.delta))||Math.sign(e.delta)!==c.sign||!Number.isFinite(Date.parse(e.createdAt))||(e.voidedAt&&!Number.isFinite(Date.parse(e.voidedAt))))return false;
   ids.add(e.id);return true;
  }):[];
  return {entries,config};
 }catch{return empty;}
}
