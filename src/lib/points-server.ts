import {dateOnly,timestamp} from './date-serialization';
import type {Category,PointsEntry} from './points-preview';

export function cairoToday(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
export function mapPointEvent(row:Record<string,unknown>):PointsEntry{
 return {
  id:String(row.id),adminId:row.admin_id?String(row.admin_id):'',
  adminName:String(row.admin_name),category:row.category as Category,
  delta:Number(row.delta),date:dateOnly(row.event_date),note:String(row.note),
  createdAt:timestamp(row.created_at),
  ...(row.voided_at?{voidedAt:timestamp(row.voided_at)}:{})
 };
}
