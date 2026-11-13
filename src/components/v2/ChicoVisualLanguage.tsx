'use client';

import type {Rank} from '@/lib/types';

/**
 * CHICO V8 visual language.
 * One vector vocabulary for site navigation, rank hierarchy and KPIs.
 * All icons are browser-rendered SVG, not cropped photos or emoji fonts.
 */
export type CommandSymbol =
 |'dashboard'|'team'|'operations'|'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings'
 |'tickets'|'flags'|'rating'|'coverage'|'members'|'rate'|'history'|'shift'|'export';
type IconProps={name:CommandSymbol;compact?:boolean;className?:string};
export const rankToken=(rank:Rank)=>rank==='SN.Helper'?'senior':rank==='Moderator'?'moderator':rank==='Administrator'?'administrator':rank==='Responsible'?'responsible':'helper';
export function CommandIcon({name,compact=false,className=''}:IconProps){
 const paths:Record<CommandSymbol,React.ReactNode>={
  dashboard:<><path d="M10 11h14v14H10zM29 11h11v8H29zM29 24h11v17H29zM10 30h14v11H10z"/><path d="M14 15h6v6h-6z" className="v8-icon-fill"/></>,
  team:<><circle cx="22" cy="17" r="6"/><path d="M10 38v-4c0-7 5-11 12-11s12 4 12 11v4Z"/><path d="M35 13a5 5 0 0 1 0 10m3 3c4 1 6 4 6 9v3"/><path d="M18 33h8" className="v8-icon-deco"/></>,
  operations:<><path d="M25 7 40 15v19L25 43 10 34V15Z"/><path d="m25 7 0 18m-15-10 15 10 15-10M25 25v18"/><circle cx="25" cy="25" r="4" className="v8-icon-fill"/></>,
  updates:<><path d="M14 8h22v33H14Z"/><path d="M19 16h13M19 23h13M19 30h6"/><path d="M31 28v10M26 33h10" className="v8-icon-deco"/></>,
  excel:<><rect x="9" y="10" width="32" height="31" rx="3"/><path d="M9 20h32M9 31h32M22 20v21M32 20v21"/><path d="m14 14 5 4m0-4-5 4" className="v8-icon-deco"/></>,
  server:<><path d="M10 40h31M14 34V24h6v10M24 34V14h6v20M34 34V8h6v26"/><path d="m12 17 10-8 10 5 9-9" className="v8-icon-deco"/></>,
  reports:<><path d="M14 7h15l8 8v28H14Z"/><path d="M29 7v9h8M19 23h13M19 29h13M19 35h8"/><circle cx="34" cy="35" r="3" className="v8-icon-fill"/></>,
  weeks:<><rect x="9" y="12" width="32" height="29" rx="3"/><path d="M16 8v8M34 8v8M9 21h32"/><path d="m18 29 5 5 11-10" className="v8-icon-deco"/></>,
  alerts:<><path d="m25 6 16 7v12c0 9-6 15-16 20C15 40 9 34 9 25V13Z"/><path d="M25 15v14M25 35v1" className="v8-icon-deco"/></>,
  settings:<><path d="M10 14h31M10 25h31M10 36h31"/><circle cx="20" cy="14" r="5"/><circle cx="32" cy="25" r="5"/><circle cx="18" cy="36" r="5"/></>,
  tickets:<><path d="M11 10h28v8c-5 0-7 3-7 7s2 7 7 7v8H11v-8c5 0 7-3 7-7s-2-7-7-7Z"/><path d="M25 14v22" strokeDasharray="3 3" className="v8-icon-deco"/></>,
  flags:<><path d="M13 8v34M16 9c8-6 15 5 25 1v20c-9 4-17-7-25-2Z"/><path d="m21 18 12 0" className="v8-icon-deco"/></>,
  rating:<><path d="m25 6 6.2 12.7 14 2.1-10.1 9.8 2.4 14L25 38l-12.5 6.6 2.4-14L4.8 20.8l14-2.1Z"/><path d="m19 26 4 4 9-9" className="v8-icon-deco"/></>,
  coverage:<><path d="M12 28v12h28"/><path d="m14 30 9-10 7 4 10-13"/><path d="M32 11h8v8" className="v8-icon-deco"/><path d="M16 36h19" className="v8-icon-fill"/></>,
  members:<><circle cx="25" cy="16" r="7"/><path d="M10 41v-5c0-9 6-14 15-14s15 5 15 14v5Z"/><path d="M17 31h16" className="v8-icon-deco"/></>,
  rate:<><path d="M25 7 41 15v12c0 8-6 13-16 18-10-5-16-10-16-18V15Z"/><path d="m16 34 18-19" className="v8-icon-deco"/><circle cx="20" cy="19" r="3"/><circle cx="31" cy="31" r="3"/></>,
  history:<><path d="M12 17a17 17 0 1 1-3 12"/><path d="M12 8v11H3M25 14v12l9 5" className="v8-icon-deco"/></>,
  shift:<><circle cx="25" cy="25" r="17"/><path d="M25 14v11l8 7" className="v8-icon-deco"/><path d="M24 5v3M24 42v3"/></>,
  export:<><path d="M12 30v11h26V30M25 7v25M17 24l8 8 8-8" className="v8-icon-deco"/><path d="M17 42h16"/></>,
 };
 return <span className={'v8-symbol '+(compact?'v8-symbol--compact ':'')+className} aria-hidden="true">
  <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
   <path className="v8-symbol-corners" d="M5 14V7h9M36 7h7v7M5 36v7h9M36 43h7v-7" strokeWidth="1.15"/>
   {paths[name]}
  </svg>
 </span>;
}

export function RankInsignia({rank,compact=false}:{rank:Rank;compact?:boolean}){
 const token=rankToken(rank);
 return <span className={'v8-insignia v8-rank--'+token+' '+(compact?'v8-insignia--compact':'')} title={rank} role="img" aria-label={'شارة '+rank}>
  <svg viewBox="0 0 64 72" fill="none">
   <path className="v8-insignia-shield-back" d="M32 3 57 13v30c0 12-10 20-25 27C17 63 7 55 7 43V13Z"/>
   <path className="v8-insignia-metal" d="M32 7 53 16v27c0 9-9 17-21 23C20 60 11 52 11 43V16Z"/>
   <path className="v8-insignia-inlay" d="M32 12 48 19v22c0 8-6 14-16 19C22 55 16 49 16 41V19Z"/>
   <path className="v8-insignia-flare" d="M32 14V57M18 22l14-6 14 6" strokeWidth="1"/>
   {token==='helper'&&<><path className="v8-insignia-emblem" d="m32 19 4.2 10 10.8 1-8.1 7.2 2.5 10.8L32 42.4l-9.4 5.6 2.5-10.8-8.1-7.2 10.8-1Z"/><circle className="v8-insignia-jewel" cx="32" cy="34" r="3"/></>}
   {token==='senior'&&<><path className="v8-insignia-emblem" d="M32 17 37 27l11 7-11 6-5 11-5-11-11-6 11-7Z"/><path className="v8-insignia-jewel" d="m32 27 7 7-7 7-7-7Z"/></>}
   {token==='moderator'&&<><path className="v8-insignia-emblem" d="m32 17 14 12-5 16-9 7-9-7-5-16Z"/><path className="v8-insignia-jewel" d="m32 23 8 8-8 13-8-13Z"/></>}
   {token==='administrator'&&<><path className="v8-insignia-emblem" d="m19 29 5 6 8-15 8 15 5-6-3 18H22Z"/><path className="v8-insignia-jewel" d="M24 49h16M27 27l5-8 5 8"/></>}
   {token==='responsible'&&<><path className="v8-insignia-emblem" d="m16 31 8 7 8-20 8 20 8-7-4 20H20Z"/><circle className="v8-insignia-jewel" cx="32" cy="38" r="5"/><path className="v8-insignia-jewel" d="M22 53h20"/></>}
   <path className="v8-insignia-edge" d="m5 24-3-3v21l5 5M59 24l3-3v21l-5 5"/>
   <path className="v8-insignia-bottom" d="M22 65 32 70 42 65"/>
  </svg>
 </span>;
}

export function RankLabel({rank}:{rank:Rank}){
 return <span className={'v8-rank-label v8-rank--'+rankToken(rank)}><span className="v8-rank-label-dot"/>{rank}</span>;
}
