'use client';

import {useEffect,useState,useRef,type PointerEvent} from 'react';
import ExecutiveWeeklyChart from '../v2/ExecutiveWeeklyChart';
import WolfOrbit from './WolfOrbit';
import {CommandIcon,RankInsignia,RankLabel} from '../v2/ChicoVisualLanguage';
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
 return <nav className="studio-mobile-nav" aria-label="تنقل الهاتف">
  {[0,2,3].map(i=>item(NEXUS_DESTINATIONS[i],i))}
  <button type="button" onClick={onMore} aria-expanded={menuOpen} aria-controls="chico-main-navigation"><CommandIcon name="operations" compact/><span>المزيد</span></button>
 </nav>;
}

type Leader={id:string;name:string;rank:Rank;tickets:number|null};
type RoleCount={label:string;count:number;kind:'helper'|'senior'|'moderator'};
const display=(n:number|null|undefined)=>n===null||n===undefined||!Number.isFinite(n)?'—':n.toLocaleString('en-US',{maximumFractionDigits:2});

function Podium({title,leaders,onOpen,onTeam,variant}:{title:string;leaders:Leader[];onOpen:(id:string)=>void;onTeam:()=>void;variant:'helpers'|'mods'}){
 return <section className={'leader-list '+variant} aria-label={title}>
  <header><h2 dir="ltr">{title}</h2><button type="button" onClick={onTeam}>الفريق</button></header>
  <ol>{leaders.map((r,i)=><li key={r.id}><button type="button" onClick={()=>onOpen(r.id)}>
   <span className="leader-place">{i+1}</span><span className="leader-name" dir="auto">{r.name}<small><RankLabel rank={r.rank}/></small></span><b>{display(r.tickets)} <small>Tickets</small></b></button></li>)}</ol>
  {!leaders.length&&<p>يظهر الترتيب بعد تسجيل التذاكر.</p>}
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
  <div className="ct-theater-light" aria-hidden="true"/><div className="ct-theater-ring ct-ring-outer" aria-hidden="true"/><div className="ct-theater-ring ct-ring-inner" aria-hidden="true"/><div className="ct-theater-orbit" aria-hidden="true"/><div className="ct-wolf-float"><div className="ct-wolf-parallax"><img src={immersive?"/assets/banners/dashboard.webp":"/assets/chico-noble-wolf.svg"} alt="شعار الذئب CHICO TEAM" width={434} height={368} decoding="async"/></div></div><div className="ct-theater-platform" aria-hidden="true"><span/><i/></div>
 </div>;
}

export function NexusStage({periodControl,week,rate,coverage,active,roles,helpers,moderators,onTeam,onRead,onRecord,onOpen,readings,children}:{periodControl?:React.ReactNode;week:string;rate:number|null;coverage:number|null;active:number;roles:RoleCount[];helpers:Leader[];moderators:Leader[];onTeam:()=>void;onRead:()=>void;onRecord:()=>void;onOpen:(id:string)=>void;readings:Reading[];children?:React.ReactNode}){
 return <section className="command-overview" aria-label="مركز قيادة CHICO">
  <header className="command-heading"><div className="command-emblem"><WolfStage immersive/></div><div className="command-caption"><h1>مركز القيادة</h1><span>الأسبوع {periodControl||<bdi>{week}</bdi>}</span></div>
   <button className="studio-primary" onClick={onRecord}><CommandIcon compact name="updates"/>تسجيل قراءة</button></header>
  <div className="command-summary">{children}<div className="command-rate"><span>Weekly Flag %</span><strong>{rate===null?'—':display(rate)+'%'}</strong><small>تغطية التقييم {coverage===null?'—':display(coverage)+'%'}</small></div></div>
  <div className="command-floor">
   <div className="command-analysis"><ExecutiveWeeklyChart readings={readings} compact/></div>
   <section className="command-team">
    <header><h2>الفريق</h2><button onClick={onTeam}>إدارة الفريق</button></header>
    <p><strong>{active}</strong> إداري نشط</p>
    <div className="command-roles">{roles.map(r=><span key={r.kind} data-rank={r.kind}>{r.label} <b>{r.count}</b></span>)}</div>
   </section>
   <div className="leader-lists"><Podium title="Top 3 Helpers" leaders={helpers} variant="helpers" onOpen={onOpen} onTeam={onTeam}/><Podium title="Top 3 Moderators" leaders={moderators} variant="mods" onOpen={onOpen} onTeam={onTeam}/></div>
  </div>
  <button type="button" className="command-reports" onClick={onRead}>فتح تقارير الفترة</button>
 </section>;
}
