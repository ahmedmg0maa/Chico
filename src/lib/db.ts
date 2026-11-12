import postgres from 'postgres';
let pool: ReturnType<typeof postgres> | undefined;
export function db() {
  const url=process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) throw new Error('DATABASE_NOT_CONFIGURED');
  // A preview branch must NEVER silently inherit the production project's tenant.
  const connection=new URL(url);
  const isPooler=connection.hostname.endsWith('.pooler.supabase.com');
  if(isPooler && connection.username==='postgres'){
    const tenant=process.env.CHICO_DB_POOLER_TENANT;
    if(!tenant||!/^[a-z0-9]{20}$/.test(tenant))throw new Error('DATABASE_POOLER_TENANT_REQUIRED');
    connection.username='postgres.'+tenant;
  }
  if(process.env.VERCEL_ENV==='preview'){
    const productionRef='vaxdjjcsnvsfojeddqih';
    if(connection.hostname.includes(productionRef)||connection.username.includes(productionRef))throw new Error('PREVIEW_PRODUCTION_DATABASE_BLOCKED');
  }
  // Optional raw password override: URL handles encoding of symbols such as @, # and %.
  // A separate secret prevents accidental malformed DATABASE_URL passwords.
  const passwordOverride=process.env.CHICO_DB_PASSWORD;
  if (passwordOverride) connection.password=passwordOverride;
  if (!pool) {
    console.info('[CHICO_DB_PROFILE]',{
      pooler:connection.hostname.endsWith('.pooler.supabase.com'),
      port:connection.port||'default',
      tenantQualified:isPooler&&connection.username.includes('.'),
      hasPassword:Boolean(connection.password),
      passwordSource:passwordOverride?'separate-secret':'database-url'
    });
    pool=postgres(connection.toString(),{max:1,prepare:false,ssl:'require',connect_timeout:10,idle_timeout:20});
  }
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
  const admins=await sql`SELECT * FROM chico_next.admins`;
  const rank_history=await sql`SELECT * FROM chico_next.rank_history`;
  const shift_history=await sql`SELECT * FROM chico_next.shift_history`;
  const readings=await sql`SELECT * FROM chico_next.readings`;
  const weekly_status=await sql`SELECT * FROM chico_next.weekly_status`;
  const payload=JSON.stringify({admins:[...admins],rank_history:[...rank_history],shift_history:[...shift_history],readings:[...readings],weekly_status:[...weekly_status]});
  await sql`INSERT INTO chico_next.backups(label,snapshot) VALUES(${label},${payload}::jsonb)`;
}
