/**
 * CHICO NEXUS baseline audit — repeat before/after visual refactors.
 * Run on a disposable local database seeded by scripts/test-import-local-http.cjs.
 * Requires Playwright/Chromium in the QA environment, never production credentials.
 * CHICO_QA_URL=http://127.0.0.1:3291 CHICO_QA_PASSWORD=... node scripts/test-nexus-baseline.cjs
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require('playwright');
const base=(process.env.CHICO_QA_URL||'http://127.0.0.1:3291').replace(/\/$/,'');
const target=new URL(base);
assert(['127.0.0.1','localhost','[::1]'].includes(target.hostname),'Refusing to run baseline outside a disposable local environment');
assert(process.env.CHICO_QA_PASSWORD,'Provide only the isolated QA password');
const out=process.env.CHICO_QA_OUTPUT||path.join(os.tmpdir(),'chico-nexus-baseline');
const tabs=['dashboard','team','operations','updates','excel','server','daily','reports','weeks','alerts','settings'];
const widths=[1440,1024,768,390,320];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  const auth=await p.request.post(base+'/api/auth',{headers:{Origin:target.origin},data:{password:process.env.CHICO_QA_PASSWORD}});
  assert.equal(auth.status(),200);
  const stateRes=await p.request.get(base+'/api/state');assert.equal(stateRes.status(),200);
  const state=await stateRes.json();
  assert.equal(state.readings.length,29);assert.equal(state.admins.filter(x=>x.active).length,30);
  const errors=[];p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));
  const results=[];
  fs.mkdirSync(out,{recursive:true});
  for(const width of widths){
   await p.setViewportSize({width,height:900});
   for(const tab of tabs){
    await p.goto(base+'/?tab='+tab,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>document.body.innerText.includes('البيانات محمّلة'),null,{timeout:15000});
    await p.waitForTimeout(75);
    const result=await p.evaluate(()=>({
     viewport:innerWidth,document:document.documentElement.scrollWidth,
     heading:document.querySelector('h1')?.textContent||document.querySelector('h2')?.textContent||'',
     brokenImages:[...document.images].filter(e=>e.complete&&!e.naturalWidth&&e.getBoundingClientRect().width).length,
     buttons:[...document.querySelectorAll('button')].filter(x=>x.offsetWidth>0).length
    }));
    results.push({width,tab,...result});
    if(width===1440||width===390)await p.screenshot({path:path.join(out,tab+'-'+width+'.png'),fullPage:false,animations:'disabled'});
   }
  }
  const defects=results.filter(x=>x.document>x.viewport+2||x.brokenImages||!x.heading);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,defects,errors},null,2));
  assert.deepEqual(defects,[]);assert.deepEqual(errors,[]);
  console.log('PASS NEXUS BASELINE '+results.length+' authenticated real database views; screenshots: '+out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});