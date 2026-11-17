'use client';

import {useEffect,useState} from 'react';
import {CommandIcon,RankInsignia} from '../v2/ChicoVisualLanguage';
import type {Tab} from '../v2/ExecutiveCommand';
import type {Rank} from '@/lib/types';

export const NEXUS_DESTINATIONS=[
 {id:'dashboard',label:'القيادة'},
 {id:'team',label:'الفريق'},
 {id:'updates',label:'تسجيل'},
 {id:'daily',label:'التقارير'},
 {id:'excel',label:'Excel'},
 {id:'reports',label:'Discord'}
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
 return <div className={'nx-dock-wrap '+(collapsed?'is-collapsed':'')}>
  <button className="nx-dock-toggle" type="button" onClick={()=>setCollapsed(v=>!v)} aria-expanded={!collapsed} aria-controls="nexus-spatial-dock" aria-label={collapsed?'إظهار شريط التنقل':'إخفاء شريط التنقل'}><span aria-hidden="true">{collapsed?'⌃':'⌄'}</span></button>
  <nav id="nexus-spatial-dock" className="nx-dock" aria-label="شريط التنقل الرئيسي" hidden={collapsed}>
   {NEXUS_DESTINATIONS.slice(0,3).map(item)}
   <button type="button" className={'nx-dock-core '+(menuOpen?'is-active':'')} onClick={onMore} aria-label="كل أقسام الموقع" aria-expanded={menuOpen} aria-controls="chico-main-navigation" title="كل الأقسام">
    <img src="/assets/chico-approved-wolf.avif" alt="" width={40} height={40}/><span>الأقسام</span>
   </button>
   {NEXUS_DESTINATIONS.slice(3).map((r,i)=>item(r,i+3))}
  </nav>
 </div>;
}

type Leader={id:string;name:string;rank:Rank;tickets:number|null};
type RoleCount={label:string;count:number;kind:'helper'|'senior'|'moderator'};
const display=(n:number|null|undefined)=>n===null||n===undefined||!Number.isFinite(n)?'—':n.toLocaleString('en-US',{maximumFractionDigits:2});

function Podium({title,leaders,onOpen,onTeam,variant}:{title:string;leaders:Leader[];onOpen:(id:string)=>void;onTeam:()=>void;variant:'helpers'|'mods'}){
 return <section className={'nx-glass nx-podium nx-podium--'+variant} aria-label={title}>
  <div className="nx-panel-title"><h2>{title}</h2><button type="button" className="nx-link" onClick={onTeam}>الفريق <span aria-hidden="true">↗</span></button></div>
  {leaders.length?<div className="nx-podium-grid">{[1,0,2].filter(i=>leaders[i]).map(i=>{
   const r=leaders[i];
   return <button type="button" className={'nx-podium-person nx-position-'+(i+1)} key={r.id} onClick={()=>onOpen(r.id)}>
    <span className="nx-podium-medal" aria-label={'المركز '+(i+1)}>{String(i+1).padStart(2,'0')}</span>
    <RankInsignia rank={r.rank}/><b dir="auto" title={r.name}>{r.name}</b>
    <strong>{display(r.tickets)}</strong><small>Tickets</small>
   </button>;
  })}</div>:<div className="nx-no-ranking"><CommandIcon name="rating" compact/><span>لا يوجد ترتيب مسجّل</span></div>}
 </section>;
}

export function NexusStage({week,rate,coverage,active,roles,helpers,moderators,onTeam,onRead,onRecord,onOpen,children}:{week:string;rate:number|null;coverage:number|null;active:number;roles:RoleCount[];helpers:Leader[];moderators:Leader[];onTeam:()=>void;onRead:()=>void;onRecord:()=>void;onOpen:(id:string)=>void;children?:React.ReactNode}){
 return <section className="nx-stage" aria-label="مركز قيادة CHICO">
  <div className="nx-stage-head"><div><p className="nx-eyebrow">CHICO NEXUS / COMMAND CENTER</p><h1>مركز القيادة</h1><span className="nx-stage-week"><span className="nx-tiny-dot"/> <bdi>{week}</bdi></span></div>
   <button type="button" className="nx-button nx-primary" onClick={onRecord}><CommandIcon compact name="updates"/> تسجيل قراءة</button></div>
  {children}
  <div className="nx-stage-grid">
   <div className="nx-stage-side nx-stage-team">
    <section className="nx-glass nx-rate-card"><div className="nx-panel-title"><h2>Weekly Flag %</h2><CommandIcon name="rate" compact/></div>
     <div className="nx-ring" style={{'--nx-progress':Math.min(100,Math.max(0,rate??0))+'%'} as React.CSSProperties} aria-label={rate===null?'لا تتوفر نسبة الفلاجات':display(rate)+'%'}>
      <div className="nx-ring-inner"><strong>{rate===null?'—':display(rate)+'%'}</strong><small>{rate===null?'لا توجد بيانات':'الأسبوع الحالي'}</small></div>
     </div>
    </section>
    <section className="nx-glass nx-role-card"><div className="nx-panel-title"><h2>الفريق</h2><button type="button" className="nx-link" onClick={onTeam}>إدارة <span aria-hidden="true">↗</span></button></div>
     <div className="nx-active-total"><strong>{active}</strong><span>إداري نشط</span></div>
     <div className="nx-role-list">{roles.map(r=><div key={r.kind} className={'nx-role nx-role--'+r.kind}><i/><span>{r.label}</span><b>{r.count}</b></div>)}</div>
     <div className="nx-coverage">تغطية التقييم <b>{coverage===null?'—':display(coverage)+'%'}</b></div>
    </section>
   </div>
   <div className="nx-wolf-stage">
    <div className="nx-orbit nx-orbit-outer" aria-hidden="true"/><div className="nx-orbit nx-orbit-inner" aria-hidden="true"/>
    <div className="nx-wolf-halo" aria-hidden="true"/>
    <img className="nx-stage-wolf" src="/assets/chico-approved-wolf.avif" alt="شعار الذئب CHICO" width={240} height={240} decoding="async"/>
    <div className="nx-wolf-plinth" aria-hidden="true"><span/><i/></div>
    <div className="nx-stage-brand"><b>CHICO TEAM <em>1.0</em></b><small>N E X U S</small></div>
    <button type="button" className="nx-link nx-stage-report" onClick={onRead}>عرض التقارير <span aria-hidden="true">↗</span></button>
   </div>
   <div className="nx-stage-side nx-stage-leaders">
    <Podium title="Top 3 Helpers" leaders={helpers} variant="helpers" onOpen={onOpen} onTeam={onTeam}/>
    <Podium title="Top 3 Moderators" leaders={moderators} variant="mods" onOpen={onOpen} onTeam={onTeam}/>
   </div>
  </div>
 </section>;
}
