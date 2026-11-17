'use client';

import {useId} from 'react';
import type {Rank} from '@/lib/types';

/**
 * CHICO V8 visual language.
 * One vector vocabulary for site navigation, rank hierarchy and KPIs.
 * All icons are browser-rendered SVG, not cropped photos or emoji fonts.
 */
export type CommandSymbol =
 |'dashboard'|'team'|'operations'|'updates'|'excel'|'server'|'daily'|'reports'|'weeks'|'alerts'|'settings'
 |'tickets'|'flags'|'rating'|'coverage'|'members'|'rate'|'history'|'shift'|'export';
type IconProps={name:CommandSymbol;compact?:boolean;className?:string};
export const rankToken=(rank:Rank)=>rank==='SN.Helper'?'senior':rank==='Moderator'?'moderator':rank==='Administrator'?'administrator':rank==='Responsible'?'responsible':'helper';
export function CommandIcon({name,compact=false,className=''}:IconProps){
 const uid=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const metal='nxMetal'+uid,edge='nxEdge'+uid;
 const finish='url(#'+metal+')',rim='url(#'+edge+')';
 const paths:Record<CommandSymbol,React.ReactNode>={
  dashboard:<><path d="M10 11h14v14H10zM29 11h11v8H29zM29 24h11v17H29zM10 30h14v11H10z"/><path d="M14 15h6v6h-6z" className="v8-icon-fill"/></>,
  team:<><circle cx="22" cy="17" r="6"/><path d="M10 38v-4c0-7 5-11 12-11s12 4 12 11v4Z"/><path d="M35 13a5 5 0 0 1 0 10m3 3c4 1 6 4 6 9v3"/><path d="M18 33h8" className="v8-icon-deco"/></>,
  operations:<><path d="M25 7 40 15v19L25 43 10 34V15Z"/><path d="m25 7 0 18m-15-10 15 10 15-10M25 25v18"/><circle cx="25" cy="25" r="4" className="v8-icon-fill"/></>,
  updates:<><path d="M14 8h22v33H14Z"/><path d="M19 16h13M19 23h13M19 30h6"/><path d="M31 28v10M26 33h10" className="v8-icon-deco"/></>,
  excel:<><rect x="9" y="10" width="32" height="31" rx="3"/><path d="M9 20h32M9 31h32M22 20v21M32 20v21"/><path d="m14 14 5 4m0-4-5 4" className="v8-icon-deco"/></>,
  server:<><path d="M10 40h31M14 34V24h6v10M24 34V14h6v20M34 34V8h6v26"/><path d="m12 17 10-8 10 5 9-9" className="v8-icon-deco"/></>,
  daily:<><path d="M11 9h28v32H11Z"/><path d="M18 17h14M18 34h14M18 26h14"/><path d="M22 20v12" strokeDasharray="3 4" className="v8-icon-deco"/></>,
  reports:<><path d="M14 7h15l8 8v28H14Z"/><path d="M29 7v9h8M19 23h13M19 29h13M19 35h8"/><circle cx="34" cy="35" r="3" className="v8-icon-fill"/></>,
  weeks:<><rect x="9" y="12" width="32" height="29" rx="3"/><path d="M16 8v8M34 8v8M9 21h32"/><path d="m18 29 5 5 11-10" className="v8-icon-deco"/></>,
  alerts:<><path d="m25 6 16 7v12c0 9-6 15-16 20C15 40 9 34 9 25V13Z"/><path d="M25 15v14M25 35v1" className="v8-icon-deco"/></>,
  settings:<><path d="M10 14h31M10 25h31M10 36h31"/><circle cx="20" cy="14" r="5"/><circle cx="32" cy="25" r="5"/><circle cx="18" cy="36" r="5"/></>,
  tickets:<g transform="rotate(-27 25 25)"><path d="M7 14h36v7a5 5 0 0 0 0 10v7H7v-7a5 5 0 0 0 0-10Z" transform="translate(1 2)" fill="#07090e" opacity=".6" stroke="none"/><path d="M7 12h36v7a5 5 0 0 0 0 10v7H7v-7a5 5 0 0 0 0-10Z" fill={finish} stroke={rim}/><path d="M13 15h24M20 17v14" stroke="#ffffff" strokeOpacity=".48" strokeWidth="1.2"/><path d="m30 18 2 4 4.5.7-3.3 3.2.8 4.6-4-2.2-4 2.2.8-4.6-3.3-3.2 4.5-.7Z" fill="#111826" fillOpacity=".78" stroke="none"/></g>,
  flags:<><path d="M11 7v34" stroke={rim} strokeWidth="3.5"/><path d="M15 9C26 1 32 16 43 9v22C32 39 25 22 15 30Z" fill={finish} stroke={rim} strokeWidth="1.4"/><path d="M18 12c9-4 16 8 22 2" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2"/><path d="M7 42h8" stroke={rim} strokeWidth="2.5"/></>,
  rating:<><path d="m25 5 6.4 13 14.3 2.1-10.4 10.1 2.6 14.3L25 37.8l-12.9 6.7 2.6-14.3L4.3 20.1l14.3-2.1Z" fill={finish} stroke={rim} strokeWidth="1.4"/><path d="m25 7 0 17 6.4-6M25 24l10.3 6.2M25 24v13.8M25 24l-10.3 6.2M25 24l-6.4-6" stroke="#fff" strokeOpacity=".37" strokeWidth="1.15"/><path d="m25 9 5 11 11 1.4-16 2.6Z" fill="#fff" fillOpacity=".22" stroke="none"/></>,
  coverage:<><path d="M12 28v12h28"/><path d="m14 30 9-10 7 4 10-13"/><path d="M32 11h8v8" className="v8-icon-deco"/><path d="M16 36h19" className="v8-icon-fill"/></>,
  members:<><circle cx="25" cy="16" r="7"/><path d="M10 41v-5c0-9 6-14 15-14s15 5 15 14v5Z"/><path d="M17 31h16" className="v8-icon-deco"/></>,
  rate:<><path d="M25 7 41 15v12c0 8-6 13-16 18-10-5-16-10-16-18V15Z"/><path d="m16 34 18-19" className="v8-icon-deco"/><circle cx="20" cy="19" r="3"/><circle cx="31" cy="31" r="3"/></>,
  history:<><path d="M12 17a17 17 0 1 1-3 12"/><path d="M12 8v11H3M25 14v12l9 5" className="v8-icon-deco"/></>,
  shift:<><circle cx="25" cy="25" r="20" fill={finish} stroke={rim} strokeWidth="1.3"/><circle cx="25" cy="25" r="16" fill="#141b27" stroke={rim} strokeWidth="1"/><path d="M25 12v2.5M25 35.5V38M12 25h2.5M35.5 25H38" stroke="currentColor" strokeWidth="1.5" opacity=".85"/><path d="M25 17v8l7 5" stroke={rim} strokeWidth="2.2"/><circle cx="25" cy="25" r="2" fill="currentColor" stroke="none"/></>,
  export:<><path d="M12 30v11h26V30M25 7v25M17 24l8 8 8-8" className="v8-icon-deco"/><path d="M17 42h16"/></>,
 };
 return <span className={'v8-symbol '+(compact?'v8-symbol--compact ':'')+className} aria-hidden="true">
  <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
   <defs><linearGradient id={metal} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".84"/><stop offset=".18" stopColor="currentColor"/><stop offset=".42" stopColor="currentColor" stopOpacity=".46"/><stop offset=".69" stopColor="#121927"/><stop offset=".9" stopColor="currentColor"/><stop offset="1" stopColor="#fff" stopOpacity=".6"/></linearGradient><linearGradient id={edge} x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#fff" stopOpacity=".9"/><stop offset=".46" stopColor="currentColor"/><stop offset="1" stopColor="currentColor" stopOpacity=".74"/></linearGradient></defs>
   <path className="v8-symbol-corners" d="M5 14V7h9M36 7h7v7M5 36v7h9M36 43h7v-7" strokeWidth="1.15"/>
   {paths[name]}
  </svg>
 </span>;
}

/**
 * Quiet contemporary grade marks: simple outline, one emblem per rank.
 * The accent token, not dense ornamental details, communicates the hierarchy.
 */
export function RankInsignia({rank,compact=false}:{rank:Rank;compact?:boolean}){
 const token=rankToken(rank);
 return <span className={'v8-insignia v10-insignia v8-rank--'+token+' '+(compact?'v8-insignia--compact':'')} role="img" aria-label={'رتبة '+rank} title={rank}>
  <svg viewBox="0 0 48 54" fill="none" aria-hidden="true">
   <path className="v10-crest-outline" d="M24 3 42 10v22c0 8-8 14-18 19C14 46 6 40 6 32V10Z"/>
   <path className="v10-crest-soft" d="M24 8 37 13v18c0 6-6 11-13 15-7-4-13-9-13-15V13Z"/>
   {token==='helper'&&<path className="v10-crest-symbol" d="m24 16 3.5 8.4L36 28l-8.5 3.2L24 40l-3.5-8.8L12 28l8.5-3.6Z"/>}
   {token==='senior'&&<><path className="v10-crest-symbol" d="m15 24 9-9 9 9M15 34l9-9 9 9"/><path className="v10-crest-fine" d="M18 41h12"/></>}
   {token==='moderator'&&<><path className="v10-crest-symbol" d="M24 15 34 25 24 39 14 25Z"/><path className="v10-crest-fine" d="m19 26 5-5 5 5-5 7Z"/></>}
   {token==='administrator'&&<><path className="v10-crest-symbol" d="m13 25 6 6 5-13 5 13 6-6-3 13H16Z"/><path className="v10-crest-fine" d="M17 42h14"/></>}
   {token==='responsible'&&<><path className="v10-crest-symbol" d="m12 25 7 7 5-15 5 15 7-7-4 14H16Z"/><path className="v10-crest-fine" d="M24 10v5m-8 28h16"/></>}
  </svg>
 </span>;
}
export function RankLabel({rank}:{rank:Rank}){
 return <span className={'v8-rank-label v8-rank--'+rankToken(rank)}><span className="v8-rank-label-dot"/>{rank}</span>;
}
