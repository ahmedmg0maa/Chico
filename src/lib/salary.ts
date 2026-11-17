import {z} from 'zod';
export type SalaryProfile={admin_id:string;rp_name:string;rp_server:string;client_id:string|null;bonus_count:number;bonus_amount:number|null;revision:number};
export const salaryInput=z.object({
 admin_id:z.string().uuid(),
 rp_name:z.string().trim().max(120).refine(v=>!/[\r\n]/.test(v)),
 rp_server:z.string().trim().max(80).refine(v=>!/[\r\n]/.test(v)),
 client_id:z.union([z.string().regex(/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/),z.null()]),
 bonus_count:z.number().int().min(0).max(99),
 bonus_amount:z.number().finite().min(0).max(999999999999.99).nullable(),
 revision:z.number().int().min(0)
}).strict().refine(v=>v.bonus_count>0||v.bonus_amount===null);
export function emptySalary(id:string):SalaryProfile{return {admin_id:id,rp_name:'',rp_server:'',client_id:null,bonus_count:0,bonus_amount:null,revision:0};}
export function changeBonus(row:SalaryProfile,count:number):SalaryProfile{
 if(!Number.isInteger(count)||count<0||count>99)throw Error('INVALID_BONUS');
 return {...row,bonus_count:count,bonus_amount:count===0?null:row.bonus_amount};
}
export function salaryCopy(name:string,row:SalaryProfile){if(!row.rp_name||!row.rp_server||!row.client_id)return null;return [name,row.rp_name,row.rp_server,'Client ID: '+row.client_id].join('\n');}
