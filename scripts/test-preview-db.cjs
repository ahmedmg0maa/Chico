/* DB connection safety regression: entirely fake environment, no live secrets or connection. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/db.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function run(env){
  const urls=[];
  const messages=[];
  const mock=uri=>{urls.push(uri);return {mock:true};};
  const m={exports:{}};
  const sandbox={module:m,exports:m.exports,URL,process:{env},console:{info:x=>messages.push(String(x)),error:()=>{}},require:id=>id==='postgres'?mock:require};
  vm.runInNewContext(compiled,sandbox,{filename:'src/lib/db.ts'});
  let error=null;
  try{m.exports.db();}catch(e){error=e.message;}
  return {error,urls,messages};
}
const parent='vaxdjjcsnvsfojeddqih';
const preview={VERCEL_ENV:'preview',NODE_ENV:'production'};
const pooler='postgresql://postgres:fake-password@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';
const url=(user)=>'postgresql://'+user+':fake-password@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';
assert.equal(run({...preview,DATABASE_URL:url('postgres.'+parent)}).error,'PREVIEW_PRODUCTION_DATABASE_BLOCKED');
assert.equal(run({...preview,DATABASE_URL:pooler}).error,'DATABASE_POOLER_TENANT_REQUIRED');
assert.equal(run({...preview,DATABASE_URL:pooler,CHICO_DB_POOLER_TENANT:parent}).error,'PREVIEW_PRODUCTION_DATABASE_BLOCKED');
const branch='abcdefghijklmnopqrstuvwxyz'.slice(0,20);
const ok=run({...preview,DATABASE_URL:url('postgres.'+branch)});
assert.equal(ok.error,null);
assert.equal(ok.urls.length,1);
assert.match(ok.urls[0],new RegExp('postgres\\.'+branch));
const prod=run({VERCEL_ENV:'production',NODE_ENV:'production',DATABASE_URL:pooler,CHICO_DB_POOLER_TENANT:parent});
assert.equal(prod.error,null);
assert.match(prod.urls[0],new RegExp('postgres\\.'+parent));
assert.equal(run({...preview}).error,'DATABASE_NOT_CONFIGURED');
assert.equal(run({...preview,DATABASE_URL:pooler,CHICO_DB_POOLER_TENANT:'injection;DROP TABLE'}).error,'DATABASE_POOLER_TENANT_REQUIRED');
console.log('PASS CHICO preview cannot use production database tenant; isolated connection supported');
