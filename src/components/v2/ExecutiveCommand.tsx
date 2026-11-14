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
import ExecutiveOperations from './ExecutiveOperations';
import ExecutiveTeamStudio from './ExecutiveTeamStudio';
import ExecutiveOperationsWorkspace from './ExecutiveOperationsWorkspace';
import ExecutiveWeeklyChart from './ExecutiveWeeklyChart';
import ExecutiveProfile from './ExecutiveProfile';
import {CommandIcon,RankInsignia,RankLabel} from './ChicoVisualLanguage';
import {isEvaluatedRank,isEvaluatedAdmin,eligibleReadings} from '@/lib/rules';

export type Tab='dashboard'|'team'|'operations'|'updates'|'excel'|'server'|'daily'|'reports'|'weeks'|'alerts'|'settings';
type Auth='checking'|'out'|'in';
type Row={id:string;name:string;rank:Rank;active:boolean;tickets:number|null;flags:number|null;rating:number|null;hours:number|null;lastUpdate:string|null;in_reporting:boolean;admin_level?:number|null;shift_label?:string|null;full_name?:string|null;notes?:string|null;timezone?:string|null;supervisor_id?:string|null;joined_on?:string|null;sort_order?:number;flagsIncomplete?:boolean;periodFrom?:string|null};
const links:{id:Tab;label:string;en:string;icon:typeof Home}[]=[
  {id:'dashboard',label:'مركز القيادة',en:'Command Center',icon:LayoutDashboard},
  {id:'team',label:'إدارة الفريق',en:'Team Management',icon:Users},
  {id:'operations',label:'أدوات الإدارة',en:'Management Tools',icon:Workflow},
  {id:'updates',label:'تسجيل تقرير',en:'Log Reading',icon:Plus},
  {id:'excel',label:'استيراد Excel',en:'Excel Import',icon:FileSpreadsheet},
  {id:'server',label:'أداء السيرفر',en:'Server Performance',icon:BarChart3},
  {id:'daily',label:'التقرير اليومي',en:'Daily Report',icon:Ticket},
  {id:'reports',label:'صورة Discord',en:'Discord Report',icon:Download},
  {id:'weeks',label:'الأسابيع',en:'Weekly Cycles',icon:CalendarDays},
  {id:'alerts',label:'التنبيهات والمتابعة',en:'Tasks & Alerts',icon:ShieldAlert},
  {id:'settings',label:'الإعدادات',en:'Settings',icon:Settings2}
];

const primaryLinks=links.filter(x=>!['excel','server','weeks'].includes(x.id));
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
  return {id:a.id,name:a.name,rank:a.rank,active:a.active,in_reporting:a.in_reporting,admin_level:a.admin_level,shift_label:a.shift_label,full_name:a.full_name,notes:a.notes,timezone:a.timezone,supervisor_id:a.supervisor_id,joined_on:a.joined_on,sort_order:a.sort_order,
   tickets:add(r=>r.tickets_delta),flags:arr.some(r=>r.flags_counter!==null&&r.flags_delta===null)?null:add(r=>r.flags_delta),flagsIncomplete:arr.some(r=>r.flags_counter!==null&&r.flags_delta===null),periodFrom:arr[0]?.from_date??null,
   hours:add(r=>r.hours),rating:arr.find(r=>r.rating!==null)?.rating??null,lastUpdate:arr[0]?.to_date??null};
 });
}
function normalizedGraph(series:number[],max:number){return series.map((n,i)=>(36+i*88)+','+(174-Math.max(0,n)/Math.max(1,max)*126)).join(' ');}
function NavGlyph({tab}:{tab:Tab}){return <CommandIcon name={tab}/>;}
function RankMark({rank}:{rank:Rank}){return <RankInsignia rank={rank} compact/>;}
function statusFor(r:Row){return !r.active?'غير نشط':(r.rating!==null&&r.rating<4.8)||(r.flags!==null&&r.flags>7)?'متابعة':r.flagsIncomplete?'رصيد Flags غير مكتمل':!r.lastUpdate?'بلا تحديث':'نشط';}
function CardTitle({icon:Icon,title,en,action}:{icon:typeof Home;title:string;en:string;action?:React.ReactNode}){
 const symbol=en.includes('ALERT')?'alerts':en.includes('PERIOD')?'updates':en.includes('PERFORMER')?'team':en.includes('TEAM')?'team':en.includes('STATUS')?'members':'operations';
 return <div className="x-card-title"><div className="x-section-heading"><CommandIcon compact name={symbol}/><span>{title}</span><small>{en}</small></div>{action}</div>;
}
function Brand({small=false}:{small?:boolean}){return <div className={'x-brand '+(small?'x-brand-small':'')}>
 <div className="x-brand-wolf"><img src="/assets/chico-approved-wolf.avif" alt="شعار الذئب الرسمي لفريق CHICO"/></div>
 <div className="x-brand-words"><b>CHICO</b><small>G E N E R A L &nbsp; T E A M</small></div>
 </div>;}

export default function ExecutiveCommand({review=false,initialTab='dashboard'}:{review?:boolean;initialTab?:Tab}){
 const [auth,setAuth]=useState<Auth>(review?'in':'checking');
 const [state,setState]=useState<State|null>(null);
 const [reviewAdmins,setReviewAdmins]=useState<Admin[]>([]);
 useEffect(()=>{
  if(!review)return;
  let cancelled=false;
  try{
   const stored=localStorage.getItem('chico-approved-roster-local-v1');
   if(stored){
    const parsed=JSON.parse(stored) as Admin[];
    if(Array.isArray(parsed)&&parsed.every(a=>typeof a.id==='string'&&typeof a.name==='string'&&typeof a.rank==='string')){
     setReviewAdmins(parsed);
     return;
    }
   }
  }catch{ /* Local browser data may be unavailable. */ }
  fetch('/api/preview-roster',{cache:'no-store'}).then(async r=>{
   if(!r.ok)throw Error('لم تُحمّل القائمة الرسمية للمعاينة');
   return r.json() as Promise<{ok:boolean;admins:Admin[]}>;
  }).then(data=>{if(!cancelled&&data.ok&&Array.isArray(data.admins))setReviewAdmins(data.admins);})
    .catch(()=>{if(!cancelled)setError('تعذر تحميل قائمة المعاينة؛ راجع اتصال الموقع');});
  return ()=>{cancelled=true;};
 },[review]);
 const updateReviewAdmins=(next:Admin[])=>{setReviewAdmins(next);setFocused(null);try{localStorage.setItem('chico-approved-roster-local-v1',JSON.stringify(next));}catch{}};
 const [tab,setTab]=useState<Tab>(initialTab);
 const [light,setLight]=useState(false);
 const [editTarget,setEditTarget]=useState<string|null>(null);
 const [readingTarget,setReadingTarget]=useState<string|null>(null);
 const switchAppearance=()=>setLight(current=>{const next=!current;try{localStorage.setItem('chico-ui-theme',next?'light':'dark');}catch{}return next;});
 useEffect(()=>{try{setLight(localStorage.getItem('chico-ui-theme')==='light');}catch{}},[]);
 useEffect(()=>{const valid=links.map(l=>l.id);const initial=new URLSearchParams(window.location.search).get('tab') as Tab|null;if(initial&&valid.includes(initial))setTab(initial);},[]);
 const [menu,setMenu]=useState(false);
 useEffect(()=>{try{setMenu(window.matchMedia('(min-width: 1021px)').matches&&localStorage.getItem('chico-nav-open')==='1');}catch{}},[]);
 const toggleMenu=()=>setMenu(current=>{const next=!current;try{if(window.matchMedia('(min-width: 1021px)').matches)localStorage.setItem('chico-nav-open',next?'1':'0');}catch{}return next;});
 const closeMenu=()=>{setMenu(false);try{if(window.matchMedia('(min-width: 1021px)').matches)localStorage.setItem('chico-nav-open','0');}catch{}};
 useEffect(()=>{if(!menu)return;const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[menu]);
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
 const rows:Row[]=useMemo<Row[]>(()=>review?reviewAdmins.map(a=>({id:a.id,name:a.name,rank:a.rank,admin_level:a.admin_level,shift_label:a.shift_label,active:a.active,in_reporting:a.in_reporting,sort_order:a.sort_order,tickets:null,flags:null,rating:null,hours:null,lastUpdate:null})):latestRows(state),[review,reviewAdmins,state]);
 const visible=useMemo(()=>rows.filter(r=>(rank==='all'||r.rank===rank)&&(r.name.toLowerCase().includes(filter.toLowerCase()))),[rows,rank,filter]);
 const summary=state?.summary;
 const active=rows.filter(r=>r.active).length;
 const evaluated=rows.filter(r=>isEvaluatedAdmin(r));
 const covered=evaluated.filter(r=>r.lastUpdate!==null).length;
 const totals={tickets:review?null:summary?.tickets??null,flags:review?null:summary?.flags??null,rate:review?null:summary?.rate??null,rating:review?null:summary?.rating??null,members:active,coverage:!review&&state?.readings.some(r=>r.week_start===state?.summary.week_start)&&evaluated.length?Math.round(100*covered/evaluated.length):null};
 const top=rows.filter(r=>isEvaluatedAdmin(r)&&(r.rank==='Helper'||r.rank==='SN.Helper')&&r.tickets!==null).sort((a,b)=>(b.tickets??0)-(a.tickets??0)).slice(0,3);
 const hasRegisteredWeek=!!state?.readings.some(r=>r.week_start===summary?.week_start);
 const warnings=rows.filter(r=>isEvaluatedAdmin(r)&&(r.flagsIncomplete||(r.flags!==null&&r.flags>7)||(r.rating!==null&&r.rating<4.8)||(!r.lastUpdate&&r.active&&hasRegisteredWeek)));
 const timeLabel=review?'القائمة المعتمدة':summary?.week_start||'الأسبوع الحالي';
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
 const open=(id:Tab)=>{setTab(id);setFocused(null);if(window.matchMedia('(max-width: 1020px)').matches)setMenu(false);setNotice('');const u=new URL(window.location.href);u.searchParams.set('tab',id);window.history.replaceState(null,'',u.pathname+u.search);};
 

 const intervalRows=(state?.readings??[]).filter(r=>r.week_start===summary?.week_start).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)).slice(0,8);
 const alerts=review?[]:warnings.filter(r=>r.lastUpdate!==null||r.flagsIncomplete).slice(0,3).map(r=>({label:r.name,desc:r.flagsIncomplete?'رصيد Flags السابق غير معروف':r.flags!==null&&r.flags>7?'Flags مرتفعة — '+r.flags:r.rating!==null&&r.rating<4.8?'التقييم '+pretty(r.rating,'rating'):'تحتاج مراجعة',severity:'warning'}));
 const kpis=[
  {title:'إجمالي الفريق',english:'Total Staff',value:pretty(totals.members),glyph:'members' as const,tone:'copper'},
  {title:'تذاكر الأسبوع',english:'Weekly Tickets',value:pretty(totals.tickets),glyph:'tickets' as const,tone:'gold'},
  {title:'الفلاجات',english:'Total Flags',value:pretty(totals.flags),glyph:'flags' as const,tone:'ruby'},
  {title:'متوسط التقييم',english:'Average Rating',value:pretty(totals.rating,'rating'),glyph:'rating' as const,tone:'violet'},
  {title:'معدل الفلاجات',english:'Flag Rate',value:pretty(totals.rate,'percent'),glyph:'rate' as const,tone:'amber'},
  {title:'تغطية الفريق',english:'Team Coverage',value:pretty(totals.coverage,'percent'),glyph:'coverage' as const,tone:'emerald'}
 ];
 const isLogin=(auth!=='in')||previewLogin;
 if(isLogin)return <div className={'chico-v2 x-auth-scene '+(light?'x-light':'')} dir="rtl">
  {review&&<div className="x-review-ribbon">معاينة أسماء الفريق المعتمدة · بدون إحصائيات</div>}
  <div className="x-auth-frame"><div className="x-auth-art"><img className="x-auth-illustrated-banner" src="/assets/chico-illustrated-login.avif" alt="CHICO ME · بوابة قيادة الفريق" decoding="async"/><div className="x-auth-art-inner"><p>CHICO GENERAL TEAM</p><span>ONE STATE RP · ADMINISTRATION</span></div></div>
   <div className="x-auth-form">
    <div className="x-auth-mini"><span><span className="x-live-dot"/>PRIVATE ADMINISTRATION</span><button type="button" onClick={switchAppearance} aria-label={light?'تفعيل الوضع الداكن':'تفعيل الوضع الفاتح'} aria-pressed={light}>{light?<Moon size={17}/>:<Sun size={17}/>}</button></div>
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
  {review&&<div className="x-review-ribbon">قائمة الفريق من Excel المعتمد · لا توجد إحصائيات مسجلة · المعاينة غير متصلة بالحفظ</div>}
  <div className={"x-layout "+(menu?"v10-nav-open":"v10-nav-closed")}>
   <aside id="chico-main-navigation" className={"x-sidebar "+(menu?"x-sidebar-open":"")} aria-label="القائمة الرئيسية" aria-hidden={!menu} inert={!menu}>
    <div className="v10-nav-head"><Brand small/><button type="button" className="v10-nav-close" onClick={closeMenu} title="إغلاق القائمة" aria-label="إغلاق القائمة"><X size={19}/></button></div>
    <div className="x-sidebar-caption">ONE STATE RP · CHICO ME</div>
    <div className="x-side-group">ADMINISTRATION <span> / لوحة الإدارة</span></div>
    <nav>{primaryLinks.map(({id,label,en,icon:Icon})=><button type="button" key={id} className={'x-nav-link '+(tab===id?'x-nav-active':'')} onClick={()=>open(id)}>
      <NavGlyph tab={id}/><span><b>{label}</b><small>{en}</small></span>{tab===id?<i className="x-active-chevron"/>:null}
    </button>)}</nav>
    <div className="x-sidebar-footer"><span>ONE STATE RP</span><strong>CHICO ME</strong><small>PRIVATE MANAGEMENT</small></div>
   </aside>
   {menu&&<button className="x-mobile-scrim" aria-label="إغلاق القائمة" onClick={closeMenu}/>}
   <main className="x-body">
    <header className="x-topbar">
     <div className="x-top-group"><button type="button" className="x-icon x-burger v10-hamburger" onClick={toggleMenu} aria-label={menu?"إغلاق القائمة":"فتح القائمة"} aria-expanded={menu} aria-controls="chico-main-navigation" title={menu?"إغلاق القائمة":"فتح القائمة"}>{menu?<X size={22}/>:<Menu size={22}/>}<span>القائمة</span></button>
      <div className="x-status"><span className="x-live-dot"/>{review?'وضع المعاينة':'النظام متصل بقاعدة البيانات'}</div><div className="x-breadcrumb">CHICO ME <ChevronLeft size={14}/> <b>{links.find(l=>l.id===tab)?.label}</b></div></div>
     <div className="x-top-actions"><span className="x-date"><CalendarDays size={16}/>{timeLabel}</span>
      <button className="x-icon" onClick={()=>setSearchOpen(!searchOpen)} aria-label="البحث"><Search size={20}/></button>
      <button className="x-icon" onClick={()=>open('alerts')} aria-label="التنبيهات"><Bell size={19}/>{warnings.length>0&&<i className="x-notif-dot"/>}</button>
      <button className="x-icon" onClick={switchAppearance} aria-label={light?'تفعيل الوضع الداكن':'تفعيل الوضع الفاتح'} aria-pressed={light}>{light?<Moon size={19}/>:<Sun size={19}/>}</button>
      <button className="x-icon" onClick={()=>void refresh()} aria-label="تحديث البيانات"><RefreshCw size={18}/></button>
      <button className="x-user-button" onClick={()=>void logout()} title="الخروج"><div className="x-user-avatar"><Shield size={20}/></div><span>CHICO Leader <small>Team Director</small></span><LogOut size={16}/></button></div>
    </header>
    {searchOpen&&<div className="x-command-search"><Search size={18}/><input autoFocus placeholder="ابحث عن إداري…" value={filter} onChange={e=>{setFilter(e.target.value);open('team');}}/><button onClick={()=>{setSearchOpen(false);setFilter('');}} aria-label="إغلاق البحث"><X size={17}/></button></div>}
    <div className="x-main-content v7-app-content" key={tab}>
     {error&&<div className="x-error"><AlertTriangle size={17}/>{error}<button onClick={()=>void refresh()}>إعادة المحاولة</button></div>}
     {notice&&<div className="x-inline-notice"><Shield size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={17}/></button></div>}
     {tab==='dashboard'&&<>
      <section className="v8-command-hero" aria-label="لوحة القيادة الرسمية لفريق CHICO">
       <div className="v8-command-hero-copy">
        <span className="v8-eyebrow"><span className="v8-live-pulse"/> ONE STATE RP / CHICO ME / COMMAND</span>
        <h1>مركز القيادة <span>الاحترافي</span></h1>
        <p>لوحة إدارة الفريق، متابعة الأداء الحقيقي، واتخاذ قرارات دقيقة من مكان واحد.</p>
        <div className="v8-command-meta"><span><CommandIcon compact name="members"/> {active} إداري نشط</span><span><CommandIcon compact name="weeks"/> {timeLabel}</span></div>
        <div className="v8-hero-actions"><button type="button" className="v8-hero-primary" onClick={()=>open('team')}>إدارة الإداريين <ArrowLeft size={18}/></button><button type="button" className="v8-hero-secondary" onClick={()=>open('updates')}>تسجيل قراءة <Plus size={17}/></button></div>
       </div>
       <div className="v8-command-hero-art"><img src="/assets/chico-approved-hero.avif" alt="الشعار المعتمد لفريق CHICO وشعار OneState RP والذئب الهادئ" decoding="async" fetchPriority="high"/></div>
      </section>
      <div className="x-kpi-grid v8-kpi-grid">{kpis.map(({title,english,value,glyph,tone},index)=><div className={'x-kpi v8-kpi x-tone-'+tone} key={title} style={{animationDelay:(index*45)+'ms'}}><div className="x-kpi-title"><CommandIcon name={glyph}/><div><b>{title}</b><small>{english}</small></div></div><strong>{value}</strong><span>{review?'لا توجد قراءات بعد': 'الأسبوع الحالي'}</span><i className="v8-kpi-line"/></div>)}</div>
      <section className="x-weekbanner"><div className="x-weeklabel"><CalendarDays size={26}/><div><small>WEEKLY OPERATIONS</small><strong>متابعة الأسبوع الحالي</strong></div></div><div className="x-week-center"><Star size={29}/><div><b>مؤشرات الأداء والمتابعة</b><span>{review?'الأسماء معتمدة · لا توجد إحصائيات':'المعلومات المستمدة من سجلات الفريق'}</span></div></div><div className="x-week-mini">ONE STATE · CHICO ME</div></section>
      <div className="x-triple">
       <section className="x-panel x-alerts-panel"><CardTitle icon={Bell} title="تنبيهات القيادة" en="LEADERSHIP ALERTS" action={<button className="x-text-action" onClick={()=>open('alerts')}>عرض الكل <ArrowLeft size={14}/></button>}/>
        {alerts.length?alerts.map((a,i)=><button className={'x-alert x-alert-'+a.severity} key={i} onClick={()=>open('alerts')}><div><b>{a.label}</b><span>{a.desc}</span></div><AlertTriangle size={18}/></button>):<div className="x-empty"><CheckCircle2 size={24}/><b>لا توجد تنبيهات مسجلة</b><p>تنبيهات الأداء تظهر هنا تلقائيًا</p></div>}
       </section>
       <section className="x-panel x-chart-panel"><CardTitle icon={TrendingUp} title="القراءات حسب نطاق التغطية" en="RECORDED PERIODS"/>
        {intervalRows.length?<div className="x-period-list">
          {intervalRows.map(r=><div className="x-period-row" key={r.id}>
           <b dir="auto">{r.admin_name}</b>
           <span>{r.from_date===r.to_date?r.to_date:r.from_date+' — '+r.to_date}</span>
           <strong>Tickets: {pretty(r.tickets_delta)}</strong>
           <strong>Flags: {pretty(r.flags_delta)}</strong>
          </div>)}
          <p>كل زيادة تخص فترة القراءة المعروضة؛ لا نوزّع الزيادة على أيام لم تُسجَّل فيها قراءات.</p>
         </div>:<div className="x-empty"><Activity size={26}/><b>لا توجد قراءات مسجلة لهذا الأسبوع</b><p>ستظهر الفترة الحقيقية لكل قراءة بعد تسجيلها، دون أرقام افتراضية</p></div>}
       </section>
       <section className="x-panel x-leaders-panel"><CardTitle icon={Trophy} title="أفضل الإداريين" en="TOP PERFORMERS" action={<button className="x-text-action" onClick={()=>open('team')}>الفريق <ArrowLeft size={14}/></button>}/>
        {top.length?top.map((r,i)=><button className="x-leader" key={r.id} onClick={()=>{setFocused(r);open('team');setFocused(r);}}><span className={'x-place x-place-'+i}>{i+1}</span><span className="x-person-icon"><RankMark rank={r.rank}/></span><span className="x-leader-name"><b>{r.name}</b><small>{r.rank}</small></span><strong>{pretty(r.tickets)}</strong></button>):<div className="x-empty"><Trophy size={26}/><b>لا يوجد ترتيب متاح</b><p>يبدأ الترتيب بعد تسجيل أداء المؤهلين</p></div>}
        <p className="x-panel-footnote">الترتيب يستبعد رتبة Moderator والرتب القيادية</p>
       </section>
      </div>
      <div className="v7-bottom-dashboard">
        <ExecutiveWeeklyChart readings={review?[]:state?eligibleReadings(state.readings,state.admins):[]}/>
       <section className="x-panel x-quick"><CardTitle icon={Workflow} title="إجراءات سريعة" en="QUICK ACTIONS"/>
        <div className="x-action-grid">{[
          {label:'تسجيل تحديث',icon:Plus,id:'updates' as Tab},{label:'مساحة العمليات',icon:Workflow,id:'operations' as Tab},
          {label:'إدارة الفريق',icon:Users,id:'team' as Tab},{label:'إغلاق الأسبوع',icon:CalendarDays,id:'weeks' as Tab},
          {label:'التقرير اليومي',icon:Ticket,id:'daily' as Tab},
           {label:'تقرير Discord',icon:Download,id:'reports' as Tab}
        ].map(({label,id})=><button key={id} onClick={()=>open(id)}><CommandIcon name={id}/><span>{label}</span></button>)}</div>
       </section>
       <section className="x-panel x-teamstatus"><CardTitle icon={Users} title="حالة الفريق" en="TEAM STATUS"/>
        <div className="x-donut-wrap"><div className="x-donut" style={{background:'conic-gradient(#2bcc76 0 '+((rows.length)?active/(rows.length)*100:0)+'%, #c43e47 0 100%)'}}><div><strong>{rows.length}</strong><span>إداري</span></div></div><div className="x-donut-list"><p><i className="x-dot-green"/>نشط <b>{active}</b></p><p><i className="x-dot-red"/>غير نشط <b>{(rows.length)-active}</b></p><p><i className="x-dot-gold"/>بتحديثات <b>{covered}</b></p></div></div>
       </section>
      </div>
      <section className="x-panel x-table-panel"><CardTitle icon={Users} title="نظرة على الفريق" en="TEAM PERFORMANCE" action={<button className="x-text-action" onClick={()=>open('team')}>كل الإداريين <ArrowLeft size={15}/></button>}/>
       <TeamTable rows={rows.slice(0,7)} onFocus={r=>{setTab('team');setFocused(r);}}/>
      </section>
     </>}
     {tab==='team'&&<>
       <section className="v7-team-hero"><img src="/assets/chico-illustrated-team.avif" alt=""/><div><small>CHICO / EXECUTIVE TEAM MANAGEMENT</small><h1>إدارة الفريق والإداريين</h1><p>تحكم كامل في بيانات الفريق، رتب الإداريين، المناوبات، وسجلاتهم</p></div></section>
       <ExecutiveTeamStudio admins={review?reviewAdmins:state?.admins||[]} rows={rows} review={review} searchQuery={filter} onRefresh={refresh}
        onPreviewChange={updateReviewAdmins} onOpen={setFocused} editTarget={editTarget} light={light} onEditConsumed={()=>setEditTarget(null)}/>
       {focused&&<ExecutiveProfile member={focused} readings={review?[]:state?.readings||[]} admins={review?reviewAdmins:state?.admins||[]} review={review} light={light} mark={<RankMark rank={focused.rank}/>}
        onClose={()=>setFocused(null)} onEdit={()=>{setEditTarget(focused.id);setFocused(null);}} onAddReading={()=>{setReadingTarget(focused.id);setFocused(null);open('updates');}}/>}
      </>}
      {tab==='operations'&&<ExecutiveOperationsWorkspace state={state} review={review} onRefresh={refresh} onNavigate={open}/>}
      {tab!=='dashboard'&&tab!=='team'&&tab!=='operations'&&<ExecutiveOperations tab={tab} state={state} review={review} onRefresh={refresh} initialAdminId={readingTarget}/>}

     <footer className="x-foot"><span>© CHICO GENERAL TEAM · ONE STATE RP</span><span>{review?'VISUAL REVIEW — NOT LIVE DATA':'PROTECTED ADMINISTRATION PLATFORM'}</span></footer>
    </div>
   </main>
   <nav className="v8-mobile-dock" aria-label="التنقل السريع على الهاتف">
    {([{id:'dashboard',name:'القيادة'},{id:'team',name:'الفريق'},{id:'updates',name:'تسجيل'},{id:'daily',name:'التقرير'}] as const).map(item=>
     <button type="button" key={item.id} className={tab===item.id?'active':''} onClick={()=>open(item.id)} aria-current={tab===item.id?'page':undefined}>
      <CommandIcon name={item.id} compact/><span>{item.name}</span>
      
     </button>
    )}
   </nav>
  </div>
 </div>;
}

function TeamTable({rows,onFocus}:{rows:Row[];onFocus:(r:Row)=>void}){
 if(!rows.length)return <div className="x-empty"><Users size={30}/><b>لا توجد أسماء مطابقة</b><p>لا نعرض أسماء أو إحصائيات وهمية في الوضع الحقيقي.</p></div>;
 return <div className="x-table-scroll"><table className="x-table"><thead><tr><th>#</th><th>الإداري</th><th>الرتبة</th><th>Tickets</th><th>Flags</th><th>Rating</th><th>TIME</th><th>الحالة</th><th>الملف</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><td className="x-num"> {String(i+1).padStart(2,'0')} </td><td><div className="x-table-name"><span className="x-person-icon"><RankMark rank={r.rank}/></span><b dir="auto">{r.name}</b></div></td><td><RankLabel rank={r.rank}/></td><td className="x-num">{pretty(r.tickets)}</td><td><span className={'x-cell-badge '+(r.flags===null?'x-neutral':r.flags>7?'x-critical':r.flags>5?'x-warning':'x-good')}>{pretty(r.flags)}</span></td><td><span className={'x-cell-badge '+(r.rating===null?'x-neutral':r.rating<4.8?'x-critical':'x-good')}>{pretty(r.rating,'rating')}</span></td><td className="x-num">{pretty(r.hours)}</td><td><span className={'x-status-label '+(!r.active?'x-inactive':statusFor(r)==='متابعة'||r.flagsIncomplete?'x-needs-attention':'')}>{statusFor(r)}</span></td><td><button className="x-row-button" onClick={()=>onFocus(r)} aria-label={'فتح ملف '+r.name}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div>;
}
