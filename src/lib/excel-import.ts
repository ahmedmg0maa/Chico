import type {Rank} from './types';
import {weekStart} from './rules';

export type ExcelImportPerson={
 id:string;name:string;rank:Rank;admin_level:number;in_reporting:boolean
};
export type ExcelImportRow={
 row:number;name:string;admin_id:string|null;roster_name:string|null;source_rank?:Rank|null;
 rank:Rank|null;admin_level:number|null;roster_action:'match'|'create'|'update'|'leader';
 from_date:string|null;to_date:string|null;report_entered_on:string|null;
 tickets_counter:number|null;tickets_baseline:number|null;
 flags_counter:number|null;flags_baseline:number|null;
 hours:number|null;rating:number|null;note:string;skip_reading:boolean;
 time_was_date:boolean;year_inferred:boolean;
};
export function normalizedExcelHeader(value:unknown){
 return String(value??'').trim().toLowerCase().replace(/[_./-]/g,' ').replace(/\s+/g,' ');
}
export function findImportColumn(headers:string[],...items:string[]){
 for(const item of items){const index=headers.findIndex(h=>h===item);if(index>=0)return index;}
 for(const item of items){const index=headers.findIndex(h=>h.includes(item));if(index>=0)return index;}
 return -1;
}
export function inferLegacyPeriod(headers:string[],year:number){
 const h=headers.find(x=>x.includes('total week')&&x.includes('from')&&x.includes('to'));
 const match=h?.match(/from\s+(\d{1,2})\s+(\d{1,2})\s+to\s+(\d{1,2})\s+(\d{1,2})/);
 if(!match||!Number.isInteger(year)||year<2000||year>2200)return null;
 const from=year+'-'+match[1].padStart(2,'0')+'-'+match[2].padStart(2,'0');
 const to=year+'-'+match[3].padStart(2,'0')+'-'+match[4].padStart(2,'0');
 return validateCoverage(from,to)?{from,to}:null;
}
export const validRanks:Rank[]=['Responsible','Administrator','Moderator','SN.Helper','Helper'];
export function cleanName(name:string){return name.trim().replace(/\s+/g,' ');}
export function canonicalName(name:string){
 return cleanName(name).toLowerCase().replace(/^(sn|m|a)\s*\.\s*/,'').replace(/[.\s_\-]/g,'');
}
export function resolvePerson(name:string,rank:Rank|null,existing:ExcelImportPerson[]){
 const exact=existing.find(p=>p.name.toLowerCase()===cleanName(name).toLowerCase());
 if(exact)return {person:exact,ambiguous:false};
 // Source ranks may be stale, so identity matching cannot depend on spreadsheet rank.
 const matches=existing.filter(p=>canonicalName(p.name)===canonicalName(name));
 return {person:matches.length===1?matches[0]:null,ambiguous:matches.length>1};
}
export function strictDate(value:unknown):string|null{
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
 if(typeof value==='number'&&Number.isFinite(value)){
  const date=new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000);
  if(date.getUTCFullYear()>2000&&date.getUTCFullYear()<2200)return date.toISOString().slice(0,10);
 }
 const s=String(value??'').trim();
 const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(iso){try{weekStart(s);return s;}catch{return null;}}
 const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(m){const out=m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');try{weekStart(out);return out;}catch{return null;}}
 return null;
}
export function validInteger(value:unknown):number|null{
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
}
/**
 * Excel sometimes stores 1.5 decimal TIME as a date serial.
 * Only near-1900 date serials can be converted to numeric hours.
 * Real calendar dates must never be silently treated as hours.
 */
export function readDecimalHours(value:unknown):{hours:number|null;converted:boolean;invalid:boolean}{
 if(Object.prototype.toString.call(value)==='[object Date]'){
  const date=value as Date;
  if(Number.isNaN(date.getTime()))return {hours:null,converted:false,invalid:true};
  const serial=(date.getTime()-Date.UTC(1899,11,30))/86400000;
  if(serial>=0&&serial<=500&&date.getUTCFullYear()<=1901){
   return {hours:Math.round(serial*100)/100,converted:true,invalid:false};
  }
  return {hours:null,converted:false,invalid:true};
 }
 if(value===null||value===undefined||String(value).trim()==='')return {hours:null,converted:false,invalid:false};
 const h=validNumber(value,500);
 return {hours:h,converted:false,invalid:h===null};
}
export function isMissingCell(value:unknown){return value===null||value===undefined||String(value).trim()==='';}
export function validNumber(value:unknown,max:number):number|null{
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=max?n:null;
}
export function validRank(value:unknown):Rank|null{
 const s=String(value??'').trim().toLowerCase().replace(/\s+/g,'');
 return validRanks.find(r=>r.toLowerCase()===s)||null;
}
export function validateCoverage(from:string|null,to:string|null):boolean{
 if(!from||!to)return false;
 try{return from<=to&&weekStart(from)===weekStart(to);}catch{return false;}
}
export function auditImport(rows:ExcelImportRow[]){
 const issues:string[]=[];
 const keys=new Set<string>();
 let imported=0,leaders=0;
 for(const r of rows){
  if(!r.from_date&&!r.to_date&&r.skip_reading){leaders++;continue;}
  if(r.skip_reading){leaders++;continue;}
  if(!validateCoverage(r.from_date,r.to_date))issues.push('Row '+r.row+': invalid period or week crossing');
  if(r.time_was_date&&r.hours===null)issues.push('Row '+r.row+': TIME date value could not be safely converted');
  if(r.rank===null&&r.admin_id===null)issues.push('Row '+r.row+': new administrator requires a valid Rank');
  if(r.tickets_counter===null&&r.flags_counter===null&&r.hours===null&&r.rating===null)issues.push('Row '+r.row+': no statistics');
  if(r.tickets_counter!==null&&r.tickets_baseline!==null&&r.tickets_counter<r.tickets_baseline)issues.push('Row '+r.row+': Tickets lower than opening balance');
  if(r.flags_counter!==null&&r.flags_baseline!==null&&r.flags_counter<r.flags_baseline)issues.push('Row '+r.row+': Flags lower than opening balance');
  const key=canonicalName(r.name)+'|'+r.from_date+'|'+r.to_date;
  if(keys.has(key))issues.push('Row '+r.row+': duplicate administrator and period');keys.add(key);
  imported++;
 }
 return {issues,imported,leaders};
}
