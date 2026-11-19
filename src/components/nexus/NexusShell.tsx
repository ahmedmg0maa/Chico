'use client';

import {useEffect,useState,useRef,type PointerEvent} from 'react';
import ExecutiveWeeklyChart from '../v2/ExecutiveWeeklyChart';
import WolfOrbit from './WolfOrbit';
import {CommandIcon,RankInsignia} from '../v2/ChicoVisualLanguage';
import type {Tab} from '../v2/ExecutiveCommand';
import type {Rank,Reading} from '@/lib/types';

export const NEXUS_DESTINATIONS=[
 {id:'dashboard',label:'القيادة'},
 {id:'team',label:'الفريق'},
 {id:'updates',label:'تسجيل'},
 {id:'daily',label:'التقارير'},
 {id:'excel',label:'Excel'},
 {id:'reports',label:'Discord'},
 {id:'salary',label:'الرواتب'},
 {id:'academy',label:'التدريب'}
] as const satisfies readonly {id:Tab;label:string}[];

export function NexusDock({tab,onNavigate,onMore,menuOpen}:{tab:Tab;onNavigate:(tab:Tab)=>void;onMore:()=>void;menuOpen:boolean}){
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   if(!e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.repeat||e.defaultPrevented)return;
   const el=e.target as HTMLElement|null;
   if(el?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')||document.querySelector('[aria-modal=true]'))return;
   const index=Number(e.key)-1;
   if(index>=0&&index<NEXUS_DESTINATIONS.length&&/^\d$/.test(e.key)){
    e.preventDefault();onNavigate(NEXUS_DESTINATIONS[index].id);
   }
  };
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[onNavigate]);
 const item=(link:typeof NEXUS_DESTINATIONS[number],i:number)=><button type="button" key={link.id}
  className={'nx-dock-item '+(tab===link.id?'is-active':'')}
  onClick={()=>onNavigate(link.id)} aria-current={tab===link.id?'page':undefined}
  aria-keyshortcuts={'Alt+'+(i+1)} title={link.label+' · Alt+'+(i+1)}>
  <CommandIcon name={link.id} compact/><span>{link.label}</span>
 </button>;
 return <div className={'nx-dock-wrap nxr-navigation '+(collapsed?'is-collapsed':'')}>
  <button className="nx-dock-toggle" type="button" onClick={()=>setCollapsed(v=>!v)} aria-expanded={!collapsed} aria-controls="nexus-spatial-dock" aria-label={collapsed?'إظهار شريط التنقل':'إخفاء شريط التنقل'}><span aria-hidden="true">{collapsed?'⌃':'⌄'}</span></button>
  <nav id="nexus-spatial-dock" className="nx-dock" aria-label="شريط التنقل الرئيسي" hidden={collapsed}>
   {[0,1,2,6].map(i=>item(NEXUS_DESTINATIONS[i],i))}
   <button type="button" className={'nx-dock-core '+(menuOpen?'is-active':'')} onClick={onMore} aria-label="كل أقسام الموقع" aria-expanded={menuOpen} aria-controls="chico-main-navigation" title="كل الأقسام">
    <img src="/assets/chico-approved-wolf.avif" alt="" width={40} height={40}/><span>الأقسام</span>
   </button>
   {[3,4,5,7].map(i=>item(NEXUS_DESTINATIONS[i],i))}
  </nav>
 </div>;
}

type Leader={id:string;name:string;rank:Rank;tickets:number|null};
type RoleCount={label:string;count:number;kind:'helper'|'senior'|'moderator'};
const display=(n:number|null|undefined)=>n===null||n===undefined||!Number.isFinite(n)?'—':n.toLocaleString('en-US',{maximumFractionDigits:2});

function Podium({title,leaders,onOpen,onTeam,variant}:{title:string;leaders:Leader[];onOpen:(id:string)=>void;onTeam:()=>void;variant:'helpers'|'mods'}){
 return <section className={'nx-glass nx-podium nx-podium--'+variant} aria-label={title}>
  <div className="nx-panel-title"><h2>{title}</h2><button type="button" className="nx-link" onClick={onTeam}>الفريق <span aria-hidden="true">↗</span></button></div>
  <div className="nx-podium-grid nxr-ranking-list">{[0,1,2].map(i=>{
   const r=leaders[i];
   if(!r)return <div className={'nx-podium-person nx-podium-vacant nx-position-'+(i+1)} key={'empty-'+i} aria-label={'المركز '+(i+1)+' غير محدد'}><span className="nx-podium-medal">{String(i+1).padStart(2,'0')}</span><span className="nx-vacant-crest" aria-hidden="true"><svg viewBox="0 0 40 44" fill="none"><path d="M20 2 36 8v17c0 7-7 12-16 17C11 37 4 32 4 25V8Z" stroke="currentColor" strokeWidth="1.2"/><path d="M15 22h10" stroke="currentColor" strokeWidth="1.5"/></svg></span><b>—</b><small>غير محدد</small></div>;
   return <button type="button" className={'nx-podium-person nx-position-'+(i+1)} key={r.id} onClick={()=>onOpen(r.id)}>
    <span className="nx-podium-medal" aria-label={'المركز '+(i+1)}>{String(i+1).padStart(2,'0')}</span>
    <RankInsignia rank={r.rank}/><b dir="auto" title={r.name}>{r.name}</b>
    <strong>{display(r.tickets)}</strong><small>Tickets</small>
   </button>;
  })}</div>
  {!leaders.length&&<div className="nx-podium-note">بانتظار أول تقرير</div>}
 </section>;
}

export function WolfStage({immersive=false}:{immersive?:boolean}={}){
 const ref=useRef<HTMLDivElement>(null);
 const frame=useRef(0);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 function move(e:PointerEvent<HTMLDivElement>){
  if(e.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const el=e.currentTarget,box=el.getBoundingClientRect(),x=(e.clientX-box.left)/box.width-.5,y=(e.clientY-box.top)/box.height-.5;
  cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{if(ref.current){ref.current.style.setProperty('--wolf-x',(x*13).toFixed(2)+'deg');ref.current.style.setProperty('--wolf-y',(-y*9).toFixed(2)+'deg');}});
 }
 function reset(){cancelAnimationFrame(frame.current);ref.current?.style.setProperty('--wolf-x','0deg');ref.current?.style.setProperty('--wolf-y','0deg');}
 return <div className="ct-wolf-theater" ref={ref} onPointerMove={move} onPointerLeave={reset}>
  {immersive&&<WolfOrbit/>}
  <div className="ct-theater-grid" aria-hidden="true"/><div className="ct-theater-cage" aria-hidden="true"/><div className="ct-theater-beam" aria-hidden="true"/>
  <div className="ct-theater-light" aria-hidden="true"/><div className="ct-theater-ring ct-ring-outer" aria-hidden="true"/><div className="ct-theater-ring ct-ring-inner" aria-hidden="true"/><div className="ct-theater-orbit" aria-hidden="true"/><div className="ct-wolf-float"><div className="ct-wolf-parallax"><img src="/assets/chico-noble-wolf.svg" alt="شعار الذئب CHICO TEAM" width={420} height={430} decoding="async"/></div></div><div className="ct-theater-platform" aria-hidden="true"><span/><i/></div>
 </div>;
}

export function NexusStage({week,rate,coverage,active,roles,helpers,moderators,onTeam,onRead,onRecord,onOpen,readings,children}:{week:string;rate:number|null;coverage:number|null;active:number;roles:RoleCount[];helpers:Leader[];moderators:Leader[];onTeam:()=>void;onRead:()=>void;onRecord:()=>void;onOpen:(id:string)=>void;readings:Reading[];children?:React.ReactNode}){
 return <section className="nxr-command" aria-label="مركز قيادة CHICO">
  <header className="nxr-command-header"><div><span className="nxr-overline">01 / COMMAND CENTER</span><h1>مركز القيادة<span className="nxr-period">.</span></h1></div><div className="nxr-command-header-actions"><span className="nxr-week"><span/> <bdi>{week}</bdi></span><button type="button" className="nxr-primary" onClick={onRecord}><CommandIcon compact name="updates"/> تسجيل قراءة</button></div></header>
  <div className="nxr-hero">
   <div className="nx-stage-aura" aria-hidden="true"/><div className="nx-stage-hardware" aria-hidden="true"/>
   <div className="nxr-hero-art"><div className="nxr-hero-word" aria-hidden="true">CHICO</div><div className="nxr-hero-coordinate">01 — DIVISION</div><WolfStage immersive/><div className="nxr-hero-signature"><span>CHICO TEAM</span><b>THE COMMAND</b></div></div>
   <div className="nxr-hero-copy"><div className="nxr-eyebrow">TEAM OVERVIEW</div><div className="nxr-hero-total"><strong>{display(active)}</strong><span>إداري نشط</span></div><div className="nxr-rank-ledger">{roles.map(r=><div key={r.kind} className={'nxr-role nx-role--'+r.kind}><i/><span>{r.label}</span><b>{r.count}</b></div>)}
   {active>roles.reduce((sum,r)=>sum+r.count,0)&&<div className="nxr-role"><i/><span>القيادة والإدارة</span><b>{active-roles.reduce((sum,r)=>sum+r.count,0)}</b></div>}</div>
   <div className="nxr-coverage"><div><span>تغطية التقييم</span><b>{coverage===null?'—':display(coverage)+'%'}</b></div><div className="nxr-meter" role="presentation"><i style={{width:(coverage===null?0:Math.min(100,Math.max(0,coverage)))+'%'}}/></div></div>
   <button type="button" className="nxr-team-link" onClick={onTeam}>إدارة الفريق <span aria-hidden="true">↗</span></button></div>
  </div>
  <section className="nxr-metrics" aria-label="مؤشرات الأسبوع"><div className="nxr-metrics-heading"><span>WEEKLY METRICS</span><button type="button" onClick={onRead}>التقارير <span aria-hidden="true">↗</span></button></div><div className="nxr-metric-body">{children}<div className="nxr-flag-rate"><small>Weekly Flag %</small><strong>{rate===null?'—':display(rate)+'%'}</strong><span>{rate===null?'غير مسجل':'الأسبوع الحالي'}</span></div></div></section>
  <div className="nxr-analytics"><div className="nxr-history"><ExecutiveWeeklyChart readings={readings}/></div><div className="nxr-leaderboards"><Podium title="Top 3 Helpers" leaders={helpers} variant="helpers" onOpen={onOpen} onTeam={onTeam}/><Podium title="Top 3 Moderators" leaders={moderators} variant="mods" onOpen={onOpen} onTeam={onTeam}/></div></div>
 </section>;
}
