/** Explicitly serialize PostgreSQL DATE (1082) separately from timestamptz.
 * postgres.js can return DATE values as JavaScript Date objects; String(date).slice(0,10)
 * is locale-dependent and breaks historical ranges/counters.
 */
export function dateOnly(value:unknown):string {
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value))return value.slice(0,10);
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
 if(typeof value==='string'){
  const parsed=new Date(value);
  if(!Number.isNaN(parsed.getTime()))return parsed.toISOString().slice(0,10);
 }
 throw new Error('INVALID_DATABASE_DATE');
}
export function timestamp(value:unknown):string {
 if(value instanceof Date)return value.toISOString();
 const parsed=new Date(String(value));
 if(Number.isNaN(parsed.getTime()))throw new Error('INVALID_DATABASE_TIMESTAMP');
 return parsed.toISOString();
}
