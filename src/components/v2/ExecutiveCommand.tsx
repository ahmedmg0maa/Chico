'use client';

import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {
  Activity,AlertTriangle,ArrowLeft,ArrowUpRight,BarChart3,Bell,CalendarDays,
  CheckCircle2,ChevronDown,ChevronLeft,Clock3,Download,FileSpreadsheet,
  Flag,Home,KeyRound,LayoutDashboard,LockKeyhole,LogOut,Menu,Monitor,
  Moon,Plus,RefreshCw,Search,Settings2,Shield,ShieldAlert,Star,Sun,
  Ticket,TrendingUp,Trophy,Users,UserRound,Workflow,X
} from 'lucide-react';
import type {Admin,Reading,State,Rank} from '@/lib/types';

type Tab='dashboard'|'team'|'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings';
type Auth='checking'|'out'|'in';
type Row={id:string;name:string;rank:Rank;active:boolean;tickets:number|null;flags:number|null;rating:number|null;hours:number|null;lastUpdate:string|null;in_reporting:boolean};
const links:{id:Tab;label:string;en:string;icon:typeof Home}[]=[
  {id:'dashboard',label:'مركز القيادة',en:'Command Center',icon:LayoutDashboard},
  {id:'team',label:'الفريق',en:'Team Management',icon:Users},
  {id:'updates',label:'تسجيل التحديثات',en:'Log Updates',icon:Plus},
  {id:'excel',label:'استيراد Excel',en:'Excel Import',icon:FileSpreadsheet},
  {id:'server',label:'أداء السيرفر',en:'Server Performance',icon:BarChart3},
  {id:'reports',label:'التقارير',en:'Reports & Exports',icon:Download},
  {id:'weeks',label:'الأسابيع',en:'Weekly Cycles',icon:CalendarDays},
  {id:'alerts',label:'التنبيهات والمتابعة',en:'Tasks & Alerts',icon:ShieldAlert},
  {id:'settings',label:'الإعدادات',en:'Settings',icon:Settings2}
];
const previewRows:Row[]=[
  {id:'sample1',name:'Demo Admin 01',rank:'Administrator',active:true,tickets:588,flags:3,rating:4.94,hours:16,lastUpdate:'2026-11-12',in_reporting:true},
  {id:'sample2',name:'Demo Admin 02',rank:'SN.Helper',active:true,tickets:476,flags:5,rating:4.92,hours:14,lastUpdate:'2026-11-12',in_reporting:true},
  {id:'sample3',name:'Demo Admin 03',rank:'SN.Helper',active:true,tickets:443,flags:2,rating:4.96,hours:18,lastUpdate:'2026-11-11',in_reporting:true},
  {id:'sample4',name:'Demo Admin 04',rank:'Helper',active:true,tickets:412,flags:7,rating:4.85,hours:12,lastUpdate:'2026-11-10',in_reporting:true},
  {id:'sample5',name:'Demo Admin 05',rank:'Moderator',active:true,tickets:375,flags:14,rating:4.71,hours:15,lastUpdate:'2026-11-12',in_reporting:true},
  {id:'sample6',name:'Demo Admin 06',rank:'Moderator',active:true,tickets:312,flags:1,rating:4.91,hours:11,lastUpdate:'2026-11-09',in_reporting:true},
  {id:'sample7',name:'Demo Admin 07',rank:'Helper',active:false,tickets:null,flags:null,rating:null,hours:null,lastUpdate:null,in_reporting:false}
];
const previewTrends=[{d:'الإثنين',tickets:600,flags:12},{d:'الثلاثاء',tickets:750,flags:16},{d:'الأربعاء',tickets:900,flags:19},{d:'الخميس',tickets:820,flags:20},{d:'الجمعة',tickets:920,flags:25},{d:'السبت',tickets:1024,flags:29},{d:'الأحد',tickets:1200,flags:27}];

function pretty(v:number|null|undefined,kind?:'percent'|'rating'){
 if(v===null||v===undefined||!Number.isFinite(v))return '—';
 if(kind==='rating')return v.toFixed(2);
 if(kind==='percent')return v.toLocaleString('en-US',{maximumFractionDigits:2})+'%';
 return v.toLocaleString('en-US',{maximumFractionDigits:2});
}
function latestRows(state:State|null):Row[]{
 if(!state)return [];
 return state.admins.map((a:Admin)=>{
  const arr=state.readings.filter((r:Reading)=>r.admin_id===a.id&&r.week_start===state.summary.week_start).sort((x,y)=>y.to_date.localeCompare(x.to_date));
  const add=(f:(r:Reading)=>number|null)=>{const vals=arr.map(f).filter((n):n is number=>n!==null);return vals.length?vals.reduce((x,y)=>x+y,0):null;};
  return {id:a.id,name:a.name,rank:a.rank,active:a.active,in_reporting:a.in_reporting,
   tickets:add(r=>r.tickets_delta),flags:add(r=>r.flags_delta),
   hours:add(r=>r.hours),rating:arr.find(r=>r.rating!==null)?.rating??null,lastUpdate:arr[0]?.to_date??null};
 });
}
function normalizedGraph(series:number[],max:number){return series.map((n,i)=>(36+i*88)+','+(174-Math.max(0,n)/Math.max(1,max)*126)).join(' ');}
function emblem(rank:string){return rank==='Responsible'||rank==='Administrator'?'♛':rank==='Moderator'?'◆':rank==='SN.Helper'?'✦':'✧';}
function statusFor(r:Row){return !r.active?'غير نشط':r.rating!==null&&r.rating<4.8||r.flags!==null&&r.flags>7?'متابعة':!r.lastUpdate?'بلا تحديث':'نشط';}
function CardTitle({icon:Icon,title,en,action}:{icon:typeof Home;title:string;en:string;action?:React.ReactNode}){
 return <div className="x-card-title"><div className="x-section-heading"><Icon size={19}/><span>{title}</span><small>{en}</small></div>{action}</div>;
}
function Brand({small=false}:{small?:boolean}){return <div className={'x-brand '+(small?'x-brand-small':'')}>
 <div className="x-brand-wolf"><img src="/assets/chico-wolf-safe-192.png" alt="شعار الذئب الرسمي لفريق CHICO"/></div>
 <div className="x-brand-words"><b>CHICO</b><small>G E N E R A L &nbsp; T E A M</small></div>
 </div>;}

export default function ExecutiveCommand({review=false}:{review?:boolean}){
 const [auth,setAuth]=useState<Auth>(review?'in':'checking');
 const [state,setState]=useState<State|null>(null);
 const [tab,setTab]=useState<Tab>('dashboard');
 const [light,setLight]=useState(false);
 const [menu,setMenu]=useState(false);
 const [pass,setPass]=useState('');
 const [reveal,setReveal]=useState(false);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [filter,setFilter]=useState('');
 const [rank,setRank]=useState('all');
 const [focused,setFocused]=useState<Row|null>(null);
 const [previewLogin,setPreviewLogin]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false);
 const rows=useMemo(()=>review?previewRows:latestRows(state),[review,state]);
 const visible=useMemo(()=>rows.filter(r=>(rank==='all'||r.rank===rank)&&(r.name.toLowerCase().includes(filter.toLowerCase()))),[rows,rank,filter]);
 const summary=state?.summary;
 const active=review?25:rows.filter(r=>r.active).length;
 const covered=review?25:rows.filter(r=>r.active&&r.lastUpdate!==null).length;
 const totals=review?{tickets:6214,flags:148,rate:2.38,rating:4.78,members:27,coverage:93}:{
  tickets:summary?.tickets??null,flags:summary?.flags??null,rate:summary?.rate??null,rating:summary?.rating??null,
  members:rows.length,coverage:active?Math.round(100*covered/active):null
 };
 const top=review?previewRows.filter(r=>r.rank==='Helper'||r.rank==='SN.Helper').sort((a,b)=>(b.tickets??0)-(a.tickets??0)).slice(0,3):rows.filter(r=>(r.rank==='Helper'||r.rank==='SN.Helper')&&r.tickets!==null).sort((a,b)=>(b.tickets??0)-(a.tickets??0)).slice(0,3);
 const warnings=rows.filter(r=>(r.flags!==null&&r.flags>7)||(r.rating!==null&&r.rating<4.8)||(!r.lastUpdate&&r.active));
 const timeLabel=review?'أسبوع تجريبي':summary?.week_start||'الأسبوع الحالي';
 async function refresh(){
  if(review)return;
  try{
   const resp=await fetch('/api/state',{credentials:'include',cache:'no-store'});
   if(resp.status===401){setAuth('out');setState(null);return;}
   if(!resp.ok)throw new Error('تعذر تحميل بيانات الفريق');
   const payload=await resp.json() as State&{ok:boolean};
   setState(payload);setAuth('in');setError('');
  }catch(e){setError(e instanceof Error?e.message:'تعذر الاتصال');}
 }
 useEffect(()=>{if(review)return;let alive=true;
  const boot=async()=>{try{const r=await fetch('/api/auth',{cache:'no-store'});const d=await r.json();if(alive){setAuth(d.authenticated?'in':'out');if(d.authenticated)void refresh();}}
   catch{if(alive){setAuth('out');setError('فشل الاتصال بالخادم');}}};
  void boot();return()=>{alive=false;};
 },[review]);
 async function login(e:FormEvent){e.preventDefault();setWorking(true);setError('');try{
  const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass})});
  const body=await r.json();if(!r.ok||!body.ok)throw new Error(body.error==='INVALID_PASSWORD'?'كلمة المرور غير صحيحة':'تعذر تسجيل الدخول الآن');
  setPass('');setAuth('in');await refresh();
 }catch(e){setError(e instanceof Error?e.message:'خطأ في الدخول');}finally{setWorking(false);}}
 async function logout(){if(review){setPreviewLogin(true);return;}await fetch('/api/auth',{method:'DELETE'});setAuth('out');setState(null);setPass('');}
 const open=(id:Tab)=>{setTab(id);setFocused(null);setMenu(false);setNotice('');};
 const simulate=(name:string)=>setNotice('هذه الحزمة مخصصة لمراجعة التصميم؛ وظيفة «'+name+'» ستظل في النظام الحالي لحين نقلها واختبارها.');
 const chartSeries=review?previewTrends:(()=>{
  const dates=Array.from({length:7},(_,i)=>{const d=new Date((summary?.week_start||'2026-11-09')+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  return dates.map((d,i)=>({d:['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'][i],tickets:state?.readings.filter(r=>r.to_date===d).reduce((s,r)=>s+(r.tickets_delta??0),0)??0,flags:state?.readings.filter(r=>r.to_date===d).reduce((s,r)=>s+(r.flags_delta??0),0)??0}));
 })();
 const maxTickets=Math.max(...chartSeries.map(x=>x.tickets),1),maxFlags=Math.max(...chartSeries.map(x=>x.flags),1);
 const hasGraph=review||chartSeries.some(x=>x.tickets>0||x.flags>0);
 const alerts=review?[
  {label:'ارتفاع Flags',desc:'إداري تجاوز حد المتابعة الأسبوعي',severity:'danger'},
  {label:'تحديثات ناقصة',desc:'مراجعة الفترة غير المسجلة',severity:'warning'},
  {label:'تقييم أقل من 4.80',desc:'متابعة جودة الأداء',severity:'info'}
 ]:warnings.slice(0,3).map(r=>({label:r.name,desc:r.flags!==null&&r.flags>7?'Flags مرتفعة — '+r.flags:r.rating!==null&&r.rating<4.8?'التقييم '+pretty(r.rating,'rating'):'لم يُسجّل تحديث',severity:'warning'}));
 const kpis=[
  {title:'إجمالي الفريق',english:'Total Staff',value:pretty(totals.members),icon:Users,tone:'gold'},
  {title:'تذاكر الأسبوع',english:'Weekly Tickets',value:pretty(totals.tickets),icon:Ticket,tone:'gold'},
  {title:'الفلاجات',english:'Total Flags',value:pretty(totals.flags),icon:Flag,tone:'red'},
  {title:'متوسط التقييم',english:'Average Rating',value:pretty(totals.rating,'rating'),icon:Star,tone:'gold'},
  {title:'معدل الفلاجات',english:'Flag Rate',value:pretty(totals.rate,'percent'),icon:Shield,tone:'gold'},
  {title:'تغطية الفريق',english:'Team Coverage',value:pretty(totals.coverage,'percent'),icon:TrendingUp,tone:'green'}
 ];
 const isLogin=(auth!=='in')||previewLogin;
 if(isLogin)return <div className={'chico-v2 x-auth-scene '+(light?'x-light':'')} dir="rtl">
  {review&&<div className="x-review-ribbon">معاينة تصميم فقط · لا توجد بيانات حقيقية</div>}
  <div className="x-auth-frame"><div className="x-auth-art"><div className="x-auth-art-inner"><div className="x-auth-crown">♛</div><Brand/><p>ONE STATE RP · CHICO ME</p><span>ELITE ADMINISTRATION SYSTEM</span></div></div>
   <div className="x-auth-form">
    <div className="x-auth-mini"><span><span className="x-live-dot"/>PRIVATE ADMINISTRATION</span><button type="button" onClick={()=>setLight(!light)} aria-label="تغيير المظهر">{light?<Moon size={17}/>:<Sun size={17}/>}</button></div>
    <div className="x-auth-icon"><LockKeyhole size={27}/></div>
    <p className="x-kicker">SECURE ACCESS / CHICO</p><h1>بوابة القيادة</h1><p className="x-muted">لوحة الإدارة الرسمية لفريق CHICO General Team</p>
    {review?<div className="x-review-login"><p>معاينة شاشة الدخول — لا تُستخدم كلمات مرور في الوضع التجريبي.</p><button className="x-primary" onClick={()=>setPreviewLogin(false)}>الانتقال إلى مركز القيادة <ArrowLeft size={17}/></button></div>:
    <form onSubmit={login} className="x-auth-fields"><label htmlFor="v2-pass">كلمة مرور الإدارة</label><div className="x-input-shell"><KeyRound size={19}/><input id="v2-pass" type={reveal?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} placeholder="أدخل كلمة المرور" required autoComplete="current-password"/><button type="button" onClick={()=>setReveal(!reveal)}>{reveal?'إخفاء':'إظهار'}</button></div>
      {error&&<div className="x-error"><AlertTriangle size={17}/>{error}</div>}
      <button className="x-primary" disabled={working||auth==='checking'} type="submit">{working||auth==='checking'?'جارٍ التحقق…':'الدخول إلى مركز القيادة'} <ArrowLeft size={17}/></button>
    </form>}
    <div className="x-login-foot"><Shield size={17}/> ACCESS CONTROLLED · CHICO ME</div>
   </div></div></div>;

 return <div className={'chico-v2 '+(light?'x-light':'')} dir="rtl">
  {review&&<div className="x-review-ribbon">معاينة بصرية تجريبية · الأرقام والأسماء التوضيحية ليست بيانات CHICO الفعلية ولا تُحفظ</div>}
  <div className="x-layout">
   <aside className={'x-sidebar '+(menu?'x-sidebar-open':'')} aria-label="القائمة الرئيسية">
    <Brand small/>
    <div className="x-sidebar-caption">ONE STATE RP · CHICO ME</div>
    <div className="x-side-group">ADMINISTRATION <span> / لوحة الإدارة</span></div>
    <nav>{links.map(({id,label,en,icon:Icon})=><button type="button" key={id} className={'x-nav-link '+(tab===id?'x-nav-active':'')} onClick={()=>open(id)}>
      <Icon size={20}/><span><b>{label}</b><small>{en}</small></span>{tab===id?<i className="x-active-chevron"/>:null}
    </button>)}</nav>
    <div className="x-side-crest"><img src="/assets/chico-wolf-safe-192.png" alt="" /><strong>CHICO ME</strong><span>GENERAL ADMINISTRATION</span></div>
   </aside>
   {menu&&<button className="x-mobile-scrim" aria-label="إغلاق القائمة" onClick={()=>setMenu(false)}/>}
   <main className="x-body">
    <header className="x-topbar">
     <div className="x-top-group"><button className="x-icon x-burger" onClick={()=>setMenu(!menu)} aria-label="فتح القائمة"><Menu size={22}/></button>
      <div className="x-status"><span className="x-live-dot"/>{review?'وضع المعاينة':'النظام متصل بقاعدة البيانات'}</div><div className="x-breadcrumb">CHICO ME <ChevronLeft size={14}/> <b>{links.find(l=>l.id===tab)?.label}</b></div></div>
     <div className="x-top-actions"><span className="x-date"><CalendarDays size={16}/>{timeLabel}</span>
      <button className="x-icon" onClick={()=>setSearchOpen(!searchOpen)} aria-label="البحث"><Search size={20}/></button>
      <button className="x-icon" onClick={()=>open('alerts')} aria-label="التنبيهات"><Bell size={19}/>{warnings.length>0&&<i className="x-notif-dot"/>}</button>
      <button className="x-icon" onClick={()=>setLight(!light)} aria-label="تبديل الوضع">{light?<Moon size={19}/>:<Sun size={19}/>}</button>
      <button className="x-icon" onClick={()=>void refresh()} aria-label="تحديث البيانات"><RefreshCw size={18}/></button>
      <button className="x-user-button" onClick={()=>void logout()} title="الخروج"><div className="x-user-avatar"><Shield size={20}/></div><span>CHICO Leader <small>Team Director</small></span><LogOut size={16}/></button></div>
    </header>
    {searchOpen&&<div className="x-command-search"><Search size={18}/><input autoFocus placeholder="ابحث عن إداري…" value={filter} onChange={e=>{setFilter(e.target.value);setTab('team');}}/><button onClick={()=>setSearchOpen(false)} aria-label="إغلاق البحث"><X size={17}/></button></div>}
    <div className="x-main-content">
     {error&&<div className="x-error"><AlertTriangle size={17}/>{error}<button onClick={()=>void refresh()}>إعادة المحاولة</button></div>}
     {notice&&<div className="x-inline-notice"><Shield size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={17}/></button></div>}
     {tab==='dashboard'&&<>
      <section className="x-hero"><div className="x-hero-sparks"/><div className="x-hero-wolf"><img src="/assets/chico-wolf-safe-192.png" alt="" /></div>
       <div className="x-hero-main"><div className="x-crown">♛</div><h1>CHICO</h1><div className="x-hero-rule"/><p>G E N E R A L &nbsp; T E A M</p><span>ELITE OPERATIONS SUITE</span></div>
       <div className="x-hero-meta"><span>ONE STATE RP</span><strong>مركز إدارة الفريق</strong><small>قرارات أوضح · أداء أدق · قيادة أقوى</small></div>
      </section>
      <div className="x-kpi-grid">{kpis.map(({title,english,value,icon:Icon,tone})=><div className={'x-kpi x-tone-'+tone} key={title}><div className="x-kpi-title"><Icon size={25}/><div><b>{title}</b><small>{english}</small></div></div><strong>{value}</strong><span>{review?'مثال توضيحي': 'الأسبوع الحالي'}</span></div>)}</div>
      <section className="x-weekbanner"><div className="x-weeklabel"><CalendarDays size={26}/><div><small>WEEKLY OPERATIONS</small><strong>متابعة الأسبوع الحالي</strong></div></div><div className="x-week-center"><Star size={29}/><div><b>مؤشرات الأداء والمتابعة</b><span>{review?'بيانات تجريبية لعرض التكوين':'المعلومات المستمدة من سجلات الفريق'}</span></div></div><div className="x-week-mini">ONE STATE · CHICO ME</div></section>
      <div className="x-triple">
       <section className="x-panel x-alerts-panel"><CardTitle icon={Bell} title="تنبيهات القيادة" en="LEADERSHIP ALERTS" action={<button className="x-text-action" onClick={()=>open('alerts')}>عرض الكل <ArrowLeft size={14}/></button>}/>
        {alerts.length?alerts.map((a,i)=><button className={'x-alert x-alert-'+a.severity} key={i} onClick={()=>open('alerts')}><div><b>{a.label}</b><span>{a.desc}</span></div><AlertTriangle size={18}/></button>):<div className="x-empty"><CheckCircle2 size={24}/><b>لا توجد تنبيهات مسجلة</b><p>تنبيهات الأداء تظهر هنا تلقائيًا</p></div>}
       </section>
       <section className="x-panel x-chart-panel"><CardTitle icon={TrendingUp} title="اتجاه الأداء الأسبوعي" en="WEEKLY PERFORMANCE"/>
        {hasGraph?<div className="x-chart-area"><svg viewBox="0 0 650 220" role="img" aria-label="رسم اتجاه Tickets وFlags خلال الأسبوع" preserveAspectRatio="none">
          <defs><linearGradient id="x-goldgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e4b451" stopOpacity=".35"/><stop offset="1" stopColor="#e4b451" stopOpacity="0"/></linearGradient></defs>
          {[48,90,132,174].map(y=><line key={y} x1="36" y1={y} x2="592" y2={y} stroke="currentColor" strokeOpacity=".13"/>)}
          <polyline points={'36,174 '+normalizedGraph(chartSeries.map(x=>x.tickets),maxTickets)+' 564,174'} fill="url(#x-goldgrad)" stroke="none"/>
          <polyline points={normalizedGraph(chartSeries.map(x=>x.tickets),maxTickets)} fill="none" stroke="#efba57" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={normalizedGraph(chartSeries.map(x=>x.flags),maxFlags)} fill="none" stroke="#d9424b" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
          {chartSeries.map((v,i)=><circle key={i} cx={36+i*88} cy={174-v.tickets/maxTickets*126} r="4" fill="#ffe1a0" stroke="#a97922" strokeWidth="1.5"/>)}
          {chartSeries.map((v,i)=><text key={'t'+i} x={36+i*88} y="205" fill="currentColor" opacity=".6" textAnchor="middle" fontSize="12">{v.d.slice(0,3)}</text>)}
         </svg><div className="x-chart-legend"><span><i className="x-legend-gold"/>Tickets</span><span><i className="x-legend-red"/>Flags</span><small>كل سلسلة بمقياس مستقل</small></div></div>:<div className="x-empty"><Activity size={26}/><b>لا توجد بيانات كافية لرسم الاتجاه</b><p>يظهر الرسم بعد تسجيل تحديثات الأسبوع</p></div>}
       </section>
       <section className="x-panel x-leaders-panel"><CardTitle icon={Trophy} title="أفضل الإداريين" en="TOP PERFORMERS" action={<button className="x-text-action" onClick={()=>open('team')}>الفريق <ArrowLeft size={14}/></button>}/>
        {top.length?top.map((r,i)=><button className="x-leader" key={r.id} onClick={()=>{setFocused(r);open('team');setFocused(r);}}><span className={'x-place x-place-'+i}>{i+1}</span><span className="x-person-icon">{emblem(r.rank)}</span><span className="x-leader-name"><b>{r.name}</b><small>{r.rank}</small></span><strong>{pretty(r.tickets)}</strong></button>):<div className="x-empty"><Trophy size={26}/><b>لا يوجد ترتيب متاح</b><p>يبدأ الترتيب بعد تسجيل أداء المؤهلين</p></div>}
        <p className="x-panel-footnote">الترتيب يستبعد رتبة Moderator والرتب القيادية</p>
       </section>
      </div>
      <div className="x-bottom-grid">
       <section className="x-panel x-quick"><CardTitle icon={Workflow} title="إجراءات سريعة" en="QUICK ACTIONS"/>
        <div className="x-action-grid">{[
          {label:'تسجيل تحديث',icon:Plus,id:'updates' as Tab},{label:'استيراد Excel',icon:FileSpreadsheet,id:'excel' as Tab},
          {label:'إدارة الفريق',icon:Users,id:'team' as Tab},{label:'إغلاق الأسبوع',icon:CalendarDays,id:'weeks' as Tab},
          {label:'تقرير Discord',icon:Download,id:'reports' as Tab}
        ].map(({label,icon:Icon,id})=><button key={id} onClick={()=>open(id)}><Icon size={24}/><span>{label}</span></button>)}</div>
       </section>
       <section className="x-panel x-teamstatus"><CardTitle icon={Users} title="حالة الفريق" en="TEAM STATUS"/>
        <div className="x-donut-wrap"><div className="x-donut" style={{background:'conic-gradient(#2bcc76 0 '+((review?27:rows.length)?active/(review?27:rows.length)*100:0)+'%, #c43e47 0 100%)'}}><div><strong>{review?27:rows.length}</strong><span>إداري</span></div></div><div className="x-donut-list"><p><i className="x-dot-green"/>نشط <b>{active}</b></p><p><i className="x-dot-red"/>غير نشط <b>{(review?27:rows.length)-active}</b></p><p><i className="x-dot-gold"/>بتحديثات <b>{covered}</b></p></div></div>
       </section>
      </div>
      <section className="x-panel x-table-panel"><CardTitle icon={Users} title="نظرة على الفريق" en="TEAM PERFORMANCE" action={<button className="x-text-action" onClick={()=>open('team')}>كل الإداريين <ArrowLeft size={15}/></button>}/>
       <TeamTable rows={rows.slice(0,7)} onFocus={r=>{setTab('team');setFocused(r);}}/>
      </section>
     </>}
     {tab==='team'&&<>
      <section className="x-titleband"><span className="x-kicker">CHICO / TEAM DIRECTORY</span><h1>قيادة الفريق والإداريين</h1><p>الأسماء والرتب والأداء في مكان واحد، مع الوصول المباشر لكل ملف إداري.</p></section>
      <div className="x-kpi-grid x-team-kpis">{[
       {name:'إجمالي الإداريين',val:review?27:rows.length,icon:Users},{name:'النشطون',val:active,icon:CheckCircle2},{name:'بلا تحديث هذا الأسبوع',val:rows.filter(r=>r.active&&!r.lastUpdate).length,icon:Clock3},{name:'حالات تحتاج متابعة',val:warnings.length,icon:AlertTriangle}
      ].map(x=><div className="x-kpi" key={x.name}><div className="x-kpi-title"><x.icon size={23}/><b>{x.name}</b></div><strong>{x.val}</strong></div>)}</div>
      <section className="x-panel x-directory"><CardTitle icon={Users} title="سجل الإداريين" en="TEAM DIRECTORY"/>
       <div className="x-filterbar"><div className="x-filtersearch"><Search size={18}/><input placeholder="ابحث بالاسم…" value={filter} onChange={e=>setFilter(e.target.value)}/></div><select value={rank} onChange={e=>setRank(e.target.value)} aria-label="تصفية حسب الرتبة"><option value="all">جميع الرتب</option><option value="Administrator">Administrator</option><option value="Moderator">Moderator</option><option value="SN.Helper">SN.Helper</option><option value="Helper">Helper</option></select><span className="x-table-count">{visible.length} إداري</span></div>
       <TeamTable rows={visible} onFocus={setFocused}/>
      </section>
      {focused&&<div className="x-detail-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)setFocused(null)}}><aside className="x-detail-card" role="dialog" aria-modal="true" aria-label="ملف إداري"><button className="x-detail-close" onClick={()=>setFocused(null)}><X size={20}/></button><div className="x-profile-seal">{emblem(focused.rank)}</div><span className="x-kicker">ADMINISTRATOR PROFILE</span><h2>{focused.name}</h2><p>{focused.rank} · {focused.active?'نشط':'غير نشط'}</p><div className="x-profile-stats"><div><b>{pretty(focused.tickets)}</b><small>Tickets</small></div><div><b>{pretty(focused.flags)}</b><small>Flags</small></div><div><b>{pretty(focused.rating,'rating')}</b><small>Rating</small></div><div><b>{pretty(focused.hours)}</b><small>TIME</small></div></div><div className="x-detail-foot"><CalendarDays size={17}/> آخر تحديث: {focused.lastUpdate||'غير مسجل'}</div><p className="x-muted">صفحة معاينة تفصيلية، وسيُستكمل سجل الرتب والمناوبات في حزمة إدارة الفريق.</p></aside></div>}
     </>}
     {tab!=='dashboard'&&tab!=='team'&&<section className="x-not-ready"><div className="x-not-ready-emblem"><img src="/assets/chico-wolf-safe-192.png" alt=""/></div><span className="x-kicker">CHICO NEXT GENERATION</span><h1>{links.find(l=>l.id===tab)?.label}</h1><p>تم اعتماد التصميم الموحّد لهذا القسم، وسيُستكمل نقله في حزمة التنفيذ المخصصة له. العمليات الفعلية متاحة في الإصدار الحالي دون تغيير.</p><div className="x-notready-actions"><button className="x-primary" onClick={()=>open('dashboard')}>العودة لمركز القيادة <ArrowLeft size={17}/></button><a className="x-secondary" href="https://chicoteam.vercel.app/" target="_blank" rel="noreferrer">فتح النظام الحالي <ArrowUpRight size={17}/></a></div></section>}
     <footer className="x-foot"><span>© CHICO GENERAL TEAM · ONE STATE RP</span><span>{review?'VISUAL REVIEW — NOT LIVE DATA':'PROTECTED ADMINISTRATION PLATFORM'}</span></footer>
    </div>
   </main>
  </div>
 </div>;
}

function TeamTable({rows,onFocus}:{rows:Row[];onFocus:(r:Row)=>void}){
 if(!rows.length)return <div className="x-empty"><Users size={30}/><b>لا توجد أسماء مطابقة</b><p>لا نعرض أسماء أو إحصائيات وهمية في الوضع الحقيقي.</p></div>;
 return <div className="x-table-scroll"><table className="x-table"><thead><tr><th>#</th><th>الإداري</th><th>الرتبة</th><th>Tickets</th><th>Flags</th><th>Rating</th><th>TIME</th><th>الحالة</th><th>الملف</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><td className="x-num"> {String(i+1).padStart(2,'0')} </td><td><div className="x-table-name"><span className="x-person-icon">{emblem(r.rank)}</span><b dir="auto">{r.name}</b></div></td><td><span className="x-ranktag">{r.rank}</span></td><td className="x-num">{pretty(r.tickets)}</td><td><span className={'x-cell-badge '+(r.flags===null?'x-neutral':r.flags>7?'x-critical':r.flags>5?'x-warning':'x-good')}>{pretty(r.flags)}</span></td><td><span className={'x-cell-badge '+(r.rating===null?'x-neutral':r.rating<4.8?'x-critical':'x-good')}>{pretty(r.rating,'rating')}</span></td><td className="x-num">{pretty(r.hours)}</td><td><span className={'x-status-label '+(!r.active?'x-inactive':statusFor(r)==='متابعة'?'x-needs-attention':'')}>{statusFor(r)}</span></td><td><button className="x-row-button" onClick={()=>onFocus(r)} aria-label={'فتح ملف '+r.name}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div>;
}
