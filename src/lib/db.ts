import postgres from 'postgres';
let pool: ReturnType<typeof postgres> | undefined;
export function db() {
  const url=process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!pool) pool=postgres(url,{max:1,prepare:false,ssl:'require',connect_timeout:10,idle_timeout:20});
  return pool;
}
export async function dbReady(){
  const sql=db();
  await sql`SELECT 1 FROM chico_next.admins LIMIT 1`;
  return true;
}
export async function audit(sql: ReturnType<typeof postgres>,action:string,summary:string){
  await sql`INSERT INTO chico_next.audit(action,summary) VALUES(${action},${summary})`;
}
/** Backup is in the isolated chico_next schema; never overwrite legacy datasets. */
export async function snapshot(sql: ReturnType<typeof postgres>,label:string){
  const [admins,rank_history,readings,weekly_status]=await Promise.all([
    sql`SELECT * FROM chico_next.admins`,
    sql`SELECT * FROM chico_next.rank_history`,
    sql`SELECT * FROM chico_next.readings`,
    sql`SELECT * FROM chico_next.weekly_status`
  ]);
  const payload=JSON.stringify({admins:[...admins],rank_history:[...rank_history],readings:[...readings],weekly_status:[...weekly_status]});
  await sql`INSERT INTO chico_next.backups(label,snapshot) VALUES(${label},${payload}::jsonb)`;
}
