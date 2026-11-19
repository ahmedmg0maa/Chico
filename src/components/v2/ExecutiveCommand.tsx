'use client';

import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {
  Activity,AlertTriangle,ArrowLeft,ArrowUpRight,BarChart3,Bell,CalendarDays,
  CheckCircle2,ChevronDown,ChevronLeft,Clock3,Download,FileSpreadsheet,
  Flag,Home,KeyRound,LayoutDashboard,LockKeyhole,LogOut,Menu,Monitor,
  Moon,Plus,RefreshCw,Search,Settings2,Shield,ShieldAlert,Star,Sun,
  Ticket,TrendingUp,Trophy,Users,UserRound,Workflow,Wallet,BookOpen,X
} from 'lucide-react';
import type {Admin,Reading,State,Rank} from '@/lib/types';
import dynamic from 'next/dynamic';
import {AnimatePresence,MotionConfig,motion} from 'motion/react';
const WorkspaceLoading=()=> <div className="ct-workspace-loading" role="status">جاري تحميل القسم…</div>;
const ExecutiveOperations=dynamic(()=>import('./ExecutiveOperations'),{loading:WorkspaceLoading});
const ExecutiveTeamStudio=dynamic(()=>import('./ExecutiveTeamStudio'),{loading:WorkspaceLoading});
const ExecutiveOperationsWorkspace=dynamic(()=>import('./ExecutiveOperationsWorkspace'),{loading:WorkspaceLoading});
const AcademyCenter=dynamic(()=>import('./AcademyCenter'),{loading:WorkspaceLoading});
const SalaryCenter=dynamic(()=>import('./SalaryCenter'),{loading:WorkspaceLoading});
const ExecutiveProfile=dynamic(()=>import('./ExecutiveProfile'),{loading:WorkspaceLoading});
import DashboardWeekNotice from './DashboardWeekNotice';
import {NexusDock,NexusStage,WolfStage} from '../nexus/NexusShell';
import {NEXUS_SCENE_FAMILY,useNexusSpotlight} from '../nexus/experience';
import NexusCommandPalette from '../nexus/NexusCommandPalette';
import {previousRecordedWeek} from '@/lib/dashboard-history';
import {CommandIcon,RankInsignia,RankLabel} from './ChicoVisualLanguage';
import {isEvaluatedRank,isEvaluatedAdmin,eligibleReadings} from '@/lib/rules';

export type Tab='dashboard'|'team'|'operations'|'updates'|'excel'|'server'|'daily'|'reports'|'weeks'|'alerts'|'settings'|'salary'|'academy';
type Auth='checking'|'out'|'in';
type Row={id:string;name:string;rank:Rank;active:boolean;tickets:number|null;flags:number|null;rating:number|null;hours:number|null;lastUpdate:string|null;in_reporting:boolean;admin_level?:number|null;shift_label?:string|null;full_name?:string|null;notes?:string|null;timezone?:string|null;supervisor_id?:string|null;joined_on?:string|null;sort_order?:number;flagsIncomplete?:boolean;periodFrom?:string|null};
const links:{id:Tab;label:string;en:string;icon:typeof Home}[]=[
  {id:'dashboard',label:'مركز القيادة',en:'Command Center',icon:LayoutDashboard},
  {id:'team',label:'إدارة الفريق',en:'Team Management',icon:Users},
  {id:'academy',label:'CHICO Academy',en:'Training Center',icon:BookOpen},
  {id:'salary',label:'Salary Center',en:'Salary Center',icon:Wallet},
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

// Stage 2: clear navigation hierarchy, preserving every existing route and capability.
const navigationGroups:{label:string;en:string;items:Tab[]}[]=[
 {label:'القيادة',en:'OVERVIEW',items:['dashboard','team','alerts']},
 {label:'العمل اليومي',en:'OPERATIONS',items:['updates','operations']},
 {label:'البيانات والتحليل',en:'DATA',items:['excel','server','weeks']},
 {label:'التقارير',en:'REPORTS',items:['daily','reports']},
 {label:'الرواتب',en:'SALARY',items:['salary']},
 {label:'التدريب',en:'ACADEMY',items:['academy']},
 {label:'النظام',en:'SYSTEM',items:['settings']}
];
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
  const add=(f:(r:Reading)=>number|null)=>{const vals=arr.map(f);return vals.length&&vals.every((n):n is number=>n!==null)?vals.reduce((x,y)=>x+y,0):null;};
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
 return <div className="x-card-title"><div className="x-section-heading"><CommandIcon compact name={symbol}/><span>{title}</span></div>{action}</div>;
}
function Brand({small=false}:{small?:boolean}){return <div className={'x-brand '+(small?'x-brand-small':'')}>
 <div className="x-brand-wolf"><img src="/assets/chico-approved-wolf.avif" alt="شعار الذئب الرسمي لفريق CHICO"/></div>
 <div className="x-brand-words"><b>CHICO TEAM</b></div>
 </div>;}

export default function ExecutiveCommand({review=false,initialTab='dashboard'}:{review?:boolean;initialTab?:Tab}){
 const [auth,setAuth]=useState<Auth>(review?'in':'checking');
 const [state,setState]=useState<State|null>(null);
 const spotlight=useNexusSpotlight();
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
 const light=false;
 const [editTarget,setEditTarget]=useState<string|null>(null);
 const [readingTarget,setReadingTarget]=useState<string|null>(null);
 const [requestedReportPeriod,setRequestedReportPeriod]=useState<{from:string;to:string}|null>(null);
 useEffect(()=>{
  const valid=new Set<Tab>(links.map(l=>l.id));
  const syncFromUrl=()=>{
   const requested=new URLSearchParams(window.location.search).get('tab') as Tab|null;
   setTab(requested&&valid.has(requested)?requested:'dashboard');
  };
  syncFromUrl();
  window.addEventListener('popstate',syncFromUrl);
  return ()=>window.removeEventListener('popstate',syncFromUrl);
 },[]);
 const [menu,setMenu]=useState(false);
 // CHICO TEAM uses a transient overlay, never a permanently expanded sidebar.
 const toggleMenu=()=>setMenu(current=>!current);
 const closeMenu=()=>setMenu(false);
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
 // One keyboard-first command palette, shared by all 13 real destinations.
 useEffect(()=>{
  if(auth!=='in'||previewLogin)return;
  const handler=(event:KeyboardEvent)=>{
   if((event.metaKey||event.ctrlKey)&&!event.altKey&&event.key.toLowerCase()==='k'){
    if(!searchOpen&&document.querySelector('[aria-modal="true"]'))return;
    event.preventDefault();
    setSearchOpen(true);
   }
  };
  window.addEventListener('keydown',handler);
  return ()=>window.removeEventListener('keydown',handler);
 },[auth,previewLogin,searchOpen]);
 const rows:Row[]=useMemo<Row[]>(()=>review?reviewAdmins.map(a=>({id:a.id,name:a.name,rank:a.rank,admin_level:a.admin_level,shift_label:a.shift_label,active:a.active,in_reporting:a.in_reporting,sort_order:a.sort_order,tickets:null,flags:null,rating:null,hours:null,lastUpdate:null})):latestRows(state),[review,reviewAdmins,state]);
 const visible=useMemo(()=>rows.filter(r=>(rank==='all'||r.rank===rank)&&(r.name.toLowerCase().includes(filter.toLowerCase()))),[rows,rank,filter]);
 const summary=state?.summary;
 // Only evaluated readings can make this week's performance available.
 const currentEligible=useMemo(()=>!review&&state?eligibleReadings(state.readings,state.admins):[],[review,state]);
 const hasRegisteredWeek=currentEligible.some(r=>r.week_start===summary?.week_start);
 const previousWeek=useMemo(()=>!review&&state?previousRecordedWeek(state.admins,state.readings,state.summary.week_start):null,[review,state]);
 const active=rows.filter(r=>r.active).length;
 const evaluated=rows.filter(r=>isEvaluatedAdmin(r));
 const covered=evaluated.filter(r=>r.lastUpdate!==null).length;
 const totals={tickets:review?null:summary?.tickets??null,flags:review?null:summary?.flags??null,rate:review?null:summary?.rate??null,rating:review?null:summary?.rating??null,members:active,coverage:!review&&hasRegisteredWeek&&evaluated.length?Math.round(100*covered/evaluated.length):null};
 const top=rows.filter(r=>isEvaluatedAdmin(r)&&(r.rank==='Helper'||r.rank==='SN.Helper')&&r.tickets!==null&&r.tickets>0).sort((a,b)=>(b.tickets??0)-(a.tickets??0)||(a.sort_order??0)-(b.sort_order??0)||a.name.localeCompare(b.name,'en')).slice(0,3);
 const warnings=rows.filter(r=>isEvaluatedAdmin(r)&&(r.flagsIncomplete||(r.flags!==null&&r.flags>7)||(r.rating!==null&&r.rating<4.8)||(!r.lastUpdate&&r.active&&hasRegisteredWeek)));
 const timeLabel=review?'معاينة بلا إحصائيات':summary?.week_start||'الأسبوع الحالي';
 const moderatorTop=rows.filter(r=>isEvaluatedAdmin(r)&&r.rank==='Moderator'&&r.tickets!==null&&r.tickets>0).sort((a,b)=>(b.tickets??0)-(a.tickets??0)||(a.sort_order??0)-(b.sort_order??0)||a.name.localeCompare(b.name,'en')).slice(0,3);
 const roleCounts=[{label:'Helper',kind:'helper' as const,count:rows.filter(r=>r.active&&r.rank==='Helper').length},{label:'SN.Helper',kind:'senior' as const,count:rows.filter(r=>r.active&&r.rank==='SN.Helper').length},{label:'Moderator',kind:'moderator' as const,count:rows.filter(r=>r.active&&r.rank==='Moderator').length}];
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
 async function logout(){setSearchOpen(false);if(review){setPreviewLogin(true);return;}await fetch('/api/auth',{method:'DELETE'});setAuth('out');setState(null);setPass('');}
 const open=(id:Tab)=>{setRequestedReportPeriod(null);setTab(id);setFocused(null);setMenu(false);setNotice('');const u=new URL(window.location.href);if(u.searchParams.get('tab')!==id){u.searchParams.set('tab',id);window.history.pushState({tab:id},'',u.pathname+u.search+u.hash);}};
 

 const intervalRows=currentEligible.filter(r=>r.week_start===summary?.week_start).sort((a,b)=>b.to_date.localeCompare(a.to_date)||b.created_at.localeCompare(a.created_at)).slice(0,8);
 const alerts=review?[]:warnings.filter(r=>r.lastUpdate!==null||r.flagsIncomplete).slice(0,3).map(r=>({label:r.name,desc:r.flagsIncomplete?'رصيد Flags السابق غير معروف':r.flags!==null&&r.flags>7?'Flags مرتفعة — '+r.flags:r.rating!==null&&r.rating<4.8?'التقييم '+pretty(r.rating,'rating'):'تحتاج مراجعة',severity:'warning'}));
 // NEXUS: four core measures; Flag Rate and Team Coverage remain separate in the command stage.
 const kpis=[
  {title:'تذاكر الأسبوع',english:'Weekly Tickets',value:pretty(totals.tickets),glyph:'tickets' as const,tone:'violet'},
  {title:'الفلاجات',english:'Weekly Flags',value:pretty(totals.flags),glyph:'flags' as const,tone:'amethyst'},
  {title:'التقييم',english:'Rating',value:pretty(totals.rating,'rating'),glyph:'rating' as const,tone:'gold'},
  {title:'الساعات',english:'Time',value:pretty(review?null:summary?.hours),glyph:'shift' as const,tone:'ice'}
 ];
 const isLogin=(auth!=='in')||previewLogin;
 if(isLogin)return <div className="chico-v2 nx-app x-auth-scene ct-auth-signature" dir="rtl">
  {review&&<div className="x-review-ribbon">معاينة شاشة الدخول · لا اتصال ببيانات الإنتاج</div>}
  <header className="ct-auth-top"><div className="ct-auth-brand"><img src="/assets/chico-approved-wolf.avif" alt="" width={34} height={34}/><b>CHICO TEAM</b></div><span><Shield size={15}/> دخول الإدارة</span></header>
  <main className="ct-auth-main">
   <div className="nx-stage ct-auth-stage">
    <div className="ct-auth-visual"><WolfStage/><div className="nx-stage-brand"><b>CHICO TEAM</b></div></div>
    <section className="ct-auth-panel" aria-labelledby="ct-auth-title">
     <div className="ct-auth-heading"><span className="ct-auth-lock"><LockKeyhole size={24}/></span><h1 id="ct-auth-title">بوابة القيادة</h1></div>
     {review?<div className="x-review-login"><p>معاينة فقط — لا تحتاج إلى كلمة مرور.</p><button className="x-primary" onClick={()=>setPreviewLogin(false)}>الدخول إلى مركز القيادة <ArrowLeft size={17}/></button></div>:
     <form onSubmit={login} className="x-auth-fields ct-auth-fields"><label htmlFor="v2-pass">كلمة مرور الإدارة</label><div className="x-input-shell"><KeyRound size={19}/><input id="v2-pass" type={reveal?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} placeholder="أدخل كلمة المرور" required autoComplete="current-password" aria-invalid={!!error}/><button type="button" onClick={()=>setReveal(!reveal)} aria-pressed={reveal}>{reveal?'إخفاء':'إظهار'}</button></div>
      {error&&<div className="x-error" role="alert"><AlertTriangle size={17}/>{error}</div>}
      <button className="x-primary" disabled={working||auth==='checking'} type="submit">{working||auth==='checking'?'جارٍ التحقق…':'الدخول إلى مركز القيادة'} <ArrowLeft size={17}/></button>
     </form>}
     <div className="ct-auth-foot"><Shield size={15}/> وصول مخصص للإدارة</div>
    </section>
   </div>
  </main>
 </div>;

 return <div className={'chico-v2 nx-app '+(light?'x-light':'')} dir="rtl">
  <a className="v12-skip-link" href="#chico-main-content">تخطي إلى المحتوى الرئيسي</a>
  {review&&<div className="x-review-ribbon">معاينة · بدون إحصائيات · لا حفظ في الإنتاج</div>}
  <div className={"x-layout "+(menu?"v10-nav-open":"v10-nav-closed")}>
   <aside id="chico-main-navigation" className={"x-sidebar "+(menu?"x-sidebar-open":"")} aria-label="القائمة الرئيسية" aria-hidden={!menu} inert={!menu}>
    <div className="v10-nav-head"><Brand small/><button type="button" className="v10-nav-close" onClick={closeMenu} title="إغلاق القائمة" aria-label="إغلاق القائمة"><X size={19}/></button></div>
    
    <nav className="v12-nav" aria-label="أقسام الإدارة">{navigationGroups.map(group=>
      <section className="v12-nav-group" aria-label={group.label} key={group.en}>
       <div className="v12-nav-label"><span>{group.label}</span></div>
       {group.items.map(id=>{
        const item=links.find(link=>link.id===id);
        if(!item)return null;
        return <button type="button" key={id} className={'x-nav-link '+(tab===id?'x-nav-active':'')} onClick={()=>open(id)} aria-current={tab===id?'page':undefined}>
         <NavGlyph tab={id}/><span><b>{item.label}</b></span>
        </button>;
       })}
      </section>
     )}</nav>
    <div className="x-sidebar-footer"><button type="button" onClick={()=>void logout()} aria-label="تسجيل الخروج من القائمة"><LogOut size={18}/> تسجيل الخروج</button></div>
   </aside>
   {menu&&<button className="x-mobile-scrim" aria-label="إغلاق القائمة" onClick={closeMenu}/>}
   <main className="x-body">
    <header className="x-topbar ct-topbar">
     <div className="ct-top-start"><button type="button" className="ct-icon-button v10-hamburger" onClick={toggleMenu} aria-label={menu?'إغلاق القائمة':'فتح القائمة'} aria-expanded={menu} aria-controls="chico-main-navigation"><Menu size={22}/></button><button type="button" className="ct-brand" onClick={()=>open('dashboard')} aria-label="CHICO TEAM — مركز القيادة"><img src="/assets/chico-approved-wolf.avif" alt="" width={32} height={32}/><b>CHICO TEAM</b></button></div>
     <span className="ct-page-title" aria-live="polite" aria-atomic="true">{links.find(l=>l.id===tab)?.label}</span>
     <div className="ct-top-actions"><button className="ct-icon-button" onClick={()=>setSearchOpen(v=>!v)} aria-label="التنقل السريع والبحث" aria-keyshortcuts="Control+K Meta+K" aria-haspopup="dialog" aria-expanded={searchOpen} title="التنقل السريع · Ctrl/⌘ + K"><Search size={19}/></button><button className="ct-icon-button" onClick={()=>open('alerts')} aria-label="التنبيهات"><Bell size={19}/>{warnings.length>0&&<i className="x-notif-dot"/>}</button>{!review&&<button className="ct-icon-button" onClick={()=>void refresh()} aria-label="تحديث البيانات"><RefreshCw size={17}/></button>}<button className="ct-icon-button" onClick={()=>void logout()} aria-label="تسجيل الخروج من CHICO"><LogOut size={18}/></button><span className="ct-connection" role="status" title={review?'معاينة':state?'البيانات محمّلة':'جاري تحميل البيانات'} data-ready={review||!!state}/></div>
    </header>
    <NexusCommandPalette open={searchOpen} routes={links} members={rows}
     onClose={()=>setSearchOpen(false)} onNavigate={open}
     onMember={id=>{const member=rows.find(r=>r.id===id);if(member){open('team');setFocused(member);}}}/>
    <MotionConfig reducedMotion="user">
     <AnimatePresence initial={false} mode="wait">
      <motion.div id="chico-main-content" tabIndex={-1} role="region" aria-label={links.find(l=>l.id===tab)?.label} className={'x-main-content v7-app-content nx-experience-field ct-workspace-' + tab} data-nx-scene={NEXUS_SCENE_FAMILY[tab]} key={tab}
       onPointerMove={spotlight.onPointerMove} onPointerLeave={spotlight.onPointerLeave}
       initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
       transition={{duration:0.22,ease:[0.22,1,0.36,1]}}> 
     {error&&<div className="x-error"><AlertTriangle size={17}/>{error}<button onClick={()=>void refresh()}>إعادة المحاولة</button></div>}
     {notice&&<div className="x-inline-notice"><Shield size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={17}/></button></div>}
     {tab==='dashboard'&&<>
      <NexusStage week={timeLabel} rate={totals.rate} coverage={totals.coverage} active={active} roles={roleCounts} helpers={top} moderators={moderatorTop} readings={review?[]:currentEligible} onTeam={()=>open('team')} onRead={()=>open('daily')} onRecord={()=>open('updates')} onOpen={id=>{const member=rows.find(r=>r.id===id);if(member){open('team');setFocused(member);}}}>
      <div className="x-kpi-grid v8-kpi-grid">{kpis.map(({title,english,value,glyph,tone},index)=><div className={'x-kpi v8-kpi x-tone-'+tone} key={title} style={{animationDelay:(index*45)+'ms'}}><div className="x-kpi-title"><CommandIcon name={glyph}/><div><b>{english.replace("Weekly ","")}</b></div></div><motion.strong className="nx-kpi-number" key={english+':'+value} initial={{opacity:.4,y:7}} animate={{opacity:1,y:0}} transition={{duration:.32}}>{value}</motion.strong><span>{value==='—'?'غير مسجل': 'الأسبوع الحالي'}</span><i className="v8-kpi-line"/></div>)}</div>
      </NexusStage>
      {!review&&state&&!hasRegisteredWeek&&<DashboardWeekNotice currentWeek={summary?.week_start??'—'} previous={previousWeek} onReadReports={()=>{open('daily');if(previousWeek)setRequestedReportPeriod({from:previousWeek.from,to:previousWeek.to});}} onRecord={()=>open('updates')}/>}

      <div className="x-triple">
       <section className="x-panel x-alerts-panel"><CardTitle icon={Bell} title="تنبيهات القيادة" en="LEADERSHIP ALERTS" action={<button className="x-text-action" onClick={()=>open('alerts')}>عرض الكل <ArrowLeft size={14}/></button>}/>
        {alerts.length?alerts.map((a,i)=><button className={'x-alert x-alert-'+a.severity} key={i} onClick={()=>open('alerts')}><div><b>{a.label}</b><span>{a.desc}</span></div><AlertTriangle size={18}/></button>):<div className="x-empty"><CheckCircle2 size={24}/><b>لا توجد تنبيهات مسجلة</b></div>}
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
         </div>:<div className="x-empty"><Activity size={26}/><b>لا توجد قراءات مسجلة لهذا الأسبوع</b></div>}
       </section>
      </div>
      <div className="v7-bottom-dashboard">
       <section className="x-panel x-quick"><CardTitle icon={Workflow} title="إجراءات سريعة" en="QUICK ACTIONS"/>
        <div className="x-action-grid">{[
          {label:'تسجيل تحديث',icon:Plus,id:'updates' as Tab},{label:'مساحة العمليات',icon:Workflow,id:'operations' as Tab},
          {label:'إدارة الفريق',icon:Users,id:'team' as Tab},{label:'إغلاق الأسبوع',icon:CalendarDays,id:'weeks' as Tab},
          {label:'التقرير اليومي',icon:Ticket,id:'daily' as Tab},
           {label:'تقرير Discord',icon:Download,id:'reports' as Tab},{label:'Salary Center',icon:Wallet,id:'salary' as Tab},{label:'CHICO Academy',icon:BookOpen,id:'academy' as Tab}
        ].map(({label,id})=><button key={id} onClick={()=>open(id)}><CommandIcon name={id}/><span>{label}</span></button>)}</div>
       </section>
       <section className="x-panel x-teamstatus"><CardTitle icon={Users} title="حالة الفريق" en="TEAM STATUS"/>
        <div className="x-donut-wrap"><div className="x-donut" style={{background:'conic-gradient(#2bcc76 0 '+((rows.length)?active/(rows.length)*100:0)+'%, #c43e47 0 100%)'}}><div><strong>{rows.length}</strong><span>إداري</span></div></div><div className="x-donut-list"><p><i className="x-dot-green"/>نشط <b>{active}</b></p><p><i className="x-dot-red"/>غير نشط <b>{(rows.length)-active}</b></p><p><i className="x-dot-gold"/>بتحديثات <b>{covered}</b></p></div></div>
       </section>
      </div>
      <section className="x-panel x-table-panel"><CardTitle icon={Users} title="نظرة على الفريق" en="TEAM PERFORMANCE" action={<button className="x-text-action" onClick={()=>open('team')}>كل الإداريين <ArrowLeft size={15}/></button>}/>
       <TeamTable rows={rows.slice(0,7)} onFocus={r=>{open('team');setFocused(r);}}/>
      </section>
     </>}
     {tab==='team'&&<>
       <ExecutiveTeamStudio admins={review?reviewAdmins:state?.admins||[]} rows={rows} review={review} searchQuery={filter} onRefresh={refresh}
        onPreviewChange={updateReviewAdmins} onOpen={setFocused} editTarget={editTarget} light={light} onEditConsumed={()=>setEditTarget(null)}/>
       {focused&&<ExecutiveProfile member={focused} readings={review?[]:state?.readings||[]} admins={review?reviewAdmins:state?.admins||[]} review={review} light={light} mark={<RankMark rank={focused.rank}/>}
        onClose={()=>setFocused(null)} onEdit={()=>{setEditTarget(focused.id);setFocused(null);}} onAddReading={()=>{setReadingTarget(focused.id);setFocused(null);open('updates');}}/>}
      </>}
      {tab==='operations'&&<ExecutiveOperationsWorkspace state={state} previewAdmins={reviewAdmins} review={review} onRefresh={refresh} onNavigate={open}/>}
      {tab==='academy'&&<AcademyCenter review={review}/>}
      {tab==='salary'&&<SalaryCenter admins={review?reviewAdmins:state?.admins||[]} review={review}/>}
      {tab!=='dashboard'&&tab!=='team'&&tab!=='operations'&&tab!=='salary'&&tab!=='academy'&&<ExecutiveOperations tab={tab} state={state} review={review} onRefresh={refresh} initialAdminId={readingTarget} initialPeriod={requestedReportPeriod}/>}

     <footer className="x-foot"><span>© CHICO TEAM</span></footer>
      </motion.div>
     </AnimatePresence>
    </MotionConfig>
   </main>
   <NexusDock tab={tab} onNavigate={open} onMore={toggleMenu} menuOpen={menu}/>
  </div>
 </div>;
}

function TeamTable({rows,onFocus}:{rows:Row[];onFocus:(r:Row)=>void}){
 if(!rows.length)return <div className="x-empty"><Users size={30}/><b>لا توجد أسماء مطابقة</b><p>لا نعرض أسماء أو إحصائيات وهمية في الوضع الحقيقي.</p></div>;
 return <div className="x-table-scroll"><table className="x-table"><thead><tr><th>#</th><th>الإداري</th><th>الرتبة</th><th>Tickets</th><th>Flags</th><th>Rating</th><th>TIME</th><th>الحالة</th><th>الملف</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><td className="x-num"> {String(i+1).padStart(2,'0')} </td><td><div className="x-table-name"><span className="x-person-icon"><RankMark rank={r.rank}/></span><b dir="auto">{r.name}</b></div></td><td><RankLabel rank={r.rank}/></td><td className="x-num">{pretty(r.tickets)}</td><td><span className={'x-cell-badge '+(r.flags===null?'x-neutral':r.flags>7?'x-critical':r.flags>5?'x-warning':'x-good')}>{pretty(r.flags)}</span></td><td><span className={'x-cell-badge '+(r.rating===null?'x-neutral':r.rating<4.8?'x-critical':'x-good')}>{pretty(r.rating,'rating')}</span></td><td className="x-num">{pretty(r.hours)}</td><td><span className={'x-status-label '+(!r.active?'x-inactive':statusFor(r)==='متابعة'||r.flagsIncomplete?'x-needs-attention':'')}>{statusFor(r)}</span></td><td><button className="x-row-button" onClick={()=>onFocus(r)} aria-label={'فتح ملف '+r.name}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div>;
}
