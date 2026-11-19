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
 |'academy'|'salary'|'tickets'|'flags'|'rating'|'coverage'|'members'|'rate'|'history'|'shift'|'export';
type IconProps={name:CommandSymbol;compact?:boolean;className?:string};
export const rankToken=(rank:Rank)=>rank==='SN.Helper'?'senior':rank==='Moderator'?'moderator':rank==='Administrator'?'administrator':rank==='Responsible'?'responsible':rank==='M.'?'management':'helper';
export function CommandIcon({name,compact=false,className=''}:IconProps){
 const uid=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const metal='nxMetal'+uid,edge='nxEdge'+uid;
 const finish='url(#'+metal+')',rim='url(#'+edge+')';
 const paths:Record<CommandSymbol,React.ReactNode>={
  dashboard:<><rect x="7" y="7" width="16" height="16" rx="3" fill={finish} stroke={rim}/><rect x="27" y="7" width="16" height="10" rx="3" fill={finish} stroke={rim}/><rect x="7" y="27" width="16" height="16" rx="3" fill={finish} stroke={rim}/><rect x="27" y="21" width="16" height="22" rx="3" fill={finish} stroke={rim}/></>,
  team:<><circle cx="20" cy="14" r="7" fill={finish} stroke={rim}/><path d="M6 40v-6a14 14 0 0 1 28 0v6Z" fill={finish} stroke={rim}/><path d="M32 9a7 7 0 0 1 0 14m4 3q9 3 9 12v2h-7" stroke={rim} strokeWidth="3"/><path d="M10 33q2-8 11-8" stroke="#fff" strokeOpacity=".45"/></>,
  operations:<><path d="M25 6 43 16v18L25 44 7 34V16Z" fill={finish} stroke={rim}/><path d="m7 16 18 10 18-10M25 26v18" stroke="#121824" strokeWidth="2.3"/><path d="m9 15 16-9 16 9-16 8Z" fill="#fff" fillOpacity=".18"/></>,
  updates:<><rect x="10" y="8" width="29" height="35" rx="4" fill={finish} stroke={rim}/><rect x="17" y="14" width="15" height="4" rx="2" fill="#141a24" stroke="none"/><path d="M16 25h9M16 31h9" stroke="#141a24"/><circle cx="34" cy="34" r="10" fill="#17212c" stroke={rim}/><path d="M34 29v10m-5-5h10" stroke={rim}/></>,
  excel:<><rect x="14" y="7" width="29" height="36" rx="3" fill={finish} stroke={rim}/><path d="M19 14h18v23H19zm0 8h18m-18 8h18m-10-16v23" stroke="#17202c" strokeWidth="1.8"/><rect x="5" y="16" width="20" height="20" rx="4" fill="#152d25" stroke={rim}/><path d="m11 21 8 10m0-10-8 10" stroke="#a8eac0" strokeWidth="2.5"/></>,
  server:<><path d="M7 42h37" stroke={rim}/><rect x="10" y="27" width="8" height="12" rx="2" fill={finish} stroke={rim}/><rect x="22" y="19" width="8" height="20" rx="2" fill={finish} stroke={rim}/><rect x="34" y="9" width="8" height="30" rx="2" fill={finish} stroke={rim}/><path d="m7 20 11-9 8 3 13-10" stroke={rim} strokeWidth="2"/></>,
  daily:<><rect x="10" y="9" width="30" height="34" rx="4" fill={finish} stroke={rim}/><rect x="17" y="5" width="16" height="8" rx="3" fill="#1b2430" stroke={rim}/><path d="m16 22 3 3 5-6m-8 13 3 3 5-6M28 23h6m-6 10h6" stroke="#17212c" strokeWidth="2"/></>,
  reports:<><path d="M11 7h20l10 10v26H11z" fill={finish} stroke={rim}/><path d="M30 7v11h11" fill="#1f2835" stroke={rim}/><path d="M17 25h17m-17 6h17m-17 6h11" stroke="#18202b" strokeWidth="2"/></>,
  weeks:<><rect x="7" y="12" width="36" height="32" rx="4" fill={finish} stroke={rim}/><path d="M8 21h34" stroke="#121923" strokeWidth="3"/><path d="M16 7v9m18-9v9" stroke={rim} strokeWidth="4"/><path d="m17 32 6 6 11-13" stroke="#17212c" strokeWidth="3"/></>,
  alerts:<><path d="M11 34h28l-5-7V17q0-10-9-10t-9 10v10z" fill={finish} stroke={rim}/><path d="M20 39a5 5 0 0 0 10 0" fill={finish} stroke={rim}/><path d="M20 16q1-5 6-5" stroke="#fff" strokeOpacity=".6"/></>,
  settings:<><path d="m21 6 8 0 2 6 5 3 6-1 4 7-4 5v5l4 5-4 7-6-1-5 3-2 5h-8l-2-5-5-3-6 1-4-7 4-5v-5l-4-5 4-7 6 1 5-3Z" transform="translate(2 -2) scale(.91)" fill={finish} stroke={rim}/><circle cx="25" cy="25" r="7" fill="#151e29" stroke={rim}/></>,
  academy:<><path d="M5 10Q16 7 25 14Q34 7 45 10V39Q35 36 25 43Q15 36 5 39Z" fill={finish} stroke={rim}/><path d="M25 14V43M10 17l10 3M10 24l10 3M30 20l10-3M30 27l10-3" stroke="#16202a" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 12Q16 10 23 15" stroke="#fff" strokeOpacity=".5"/></>,
  salary:<><path d="M8 14 35 7l6 13H8Z" fill={finish} stroke={rim}/><rect x="6" y="15" width="38" height="29" rx="5" fill={finish} stroke={rim}/><path d="M9 19h31" stroke="#fff" strokeOpacity=".42"/><rect x="28" y="24" width="18" height="12" rx="4" fill="#18212c" stroke={rim}/><circle cx="34" cy="30" r="2" fill={finish}/></>,
  tickets:<g transform="rotate(-27 25 25)"><path d="M7 14h36v7a5 5 0 0 0 0 10v7H7v-7a5 5 0 0 0 0-10Z" transform="translate(1 2)" fill="#07090e" opacity=".6" stroke="none"/><path d="M7 12h36v7a5 5 0 0 0 0 10v7H7v-7a5 5 0 0 0 0-10Z" fill={finish} stroke={rim}/><path d="M13 15h24M20 17v14" stroke="#ffffff" strokeOpacity=".48" strokeWidth="1.2"/><path d="m30 18 2 4 4.5.7-3.3 3.2.8 4.6-4-2.2-4 2.2.8-4.6-3.3-3.2 4.5-.7Z" fill="#111826" fillOpacity=".78" stroke="none"/></g>,
  flags:<><path d="M11 7v34" stroke={rim} strokeWidth="3.5"/><path d="M15 9C26 1 32 16 43 9v22C32 39 25 22 15 30Z" fill={finish} stroke={rim} strokeWidth="1.4"/><path d="M18 12c9-4 16 8 22 2" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2"/><path d="M7 42h8" stroke={rim} strokeWidth="2.5"/></>,
  rating:<><path d="m25 5 6.4 13 14.3 2.1-10.4 10.1 2.6 14.3L25 37.8l-12.9 6.7 2.6-14.3L4.3 20.1l14.3-2.1Z" fill={finish} stroke={rim} strokeWidth="1.4"/><path d="m25 7 0 17 6.4-6M25 24l10.3 6.2M25 24v13.8M25 24l-10.3 6.2M25 24l-6.4-6" stroke="#fff" strokeOpacity=".37" strokeWidth="1.15"/><path d="m25 9 5 11 11 1.4-16 2.6Z" fill="#fff" fillOpacity=".22" stroke="none"/></>,
  coverage:<><path d="M8 40h34" stroke={rim}/><path d="M11 36V26l10-9 9 4 10-12v27Z" fill={finish} stroke={rim}/><path d="m11 26 10-9 9 4 10-12" stroke="#fff" strokeOpacity=".6"/></>,
  members:<><circle cx="25" cy="15" r="8" fill={finish} stroke={rim}/><path d="M8 43v-7a17 17 0 0 1 34 0v7Z" fill={finish} stroke={rim}/><path d="M13 34q3-7 11-8" stroke="#fff" strokeOpacity=".45"/></>,
  rate:<><circle cx="25" cy="25" r="19" fill={finish} stroke={rim}/><circle cx="25" cy="25" r="14" fill="#15202b" stroke={rim}/><circle cx="20" cy="18" r="3" fill={finish} stroke="none"/><circle cx="30" cy="32" r="3" fill={finish} stroke="none"/><path d="m16 34 18-18" stroke={rim} strokeWidth="3"/></>,
  history:<><circle cx="26" cy="26" r="16" fill={finish} stroke={rim}/><circle cx="26" cy="26" r="12" fill="#18212c" stroke={rim}/><path d="M26 17v9l6 4M9 15v-8m0 8h8" stroke={rim} strokeWidth="2.8"/></>,
  shift:<><circle cx="25" cy="25" r="20" fill={finish} stroke={rim} strokeWidth="1.3"/><circle cx="25" cy="25" r="16" fill="#141b27" stroke={rim} strokeWidth="1"/><path d="M25 12v2.5M25 35.5V38M12 25h2.5M35.5 25H38" stroke="currentColor" strokeWidth="1.5" opacity=".85"/><path d="M25 17v8l7 5" stroke={rim} strokeWidth="2.2"/><circle cx="25" cy="25" r="2" fill="currentColor" stroke="none"/></>,
  export:<><path d="M8 29v13h34V29" fill={finish} stroke={rim}/><path d="M25 6v24m-9-8 9 9 9-9" stroke={rim} strokeWidth="4"/><path d="M15 36h20" stroke="#151e29"/></>,
 };
 return <span className={'v8-symbol '+(compact?'v8-symbol--compact ':'')+className} aria-hidden="true">
  <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
   <defs><linearGradient id={metal} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".84"/><stop offset=".18" stopColor="currentColor"/><stop offset=".42" stopColor="currentColor" stopOpacity=".46"/><stop offset=".69" stopColor="#121927"/><stop offset=".9" stopColor="currentColor"/><stop offset="1" stopColor="#fff" stopOpacity=".6"/></linearGradient><linearGradient id={edge} x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#fff" stopOpacity=".9"/><stop offset=".46" stopColor="currentColor"/><stop offset="1" stopColor="currentColor" stopOpacity=".74"/></linearGradient></defs>
   {paths[name]}
  </svg>
 </span>;
}

/**
 * Quiet contemporary grade marks: simple outline, one emblem per rank.
 * The accent token, not dense ornamental details, communicates the hierarchy.
 */
export function RankInsignia({rank,compact=false}:{rank:Rank;compact?:boolean}){
 const token=rankToken(rank);const id='ctRank'+useId().replace(/[^a-zA-Z0-9_-]/g,'');const metal='url(#'+id+')';
 const gold=token==='responsible'||token==='administrator';
 return <span className={'v8-insignia ct-rank ct-signature-rank v8-rank--'+token+' '+(compact?'v8-insignia--compact':'')} role="img" aria-label={'رتبة '+rank} title={rank}>
  <svg viewBox="0 0 50 54" aria-hidden="true">
   <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><stop stopColor="#eef0f6"/><stop offset=".25" stopColor="currentColor"/><stop offset=".49" stopColor="currentColor" stopOpacity=".55"/><stop offset=".68" stopColor="#26313d"/><stop offset=".86" stopColor="currentColor"/><stop offset="1" stopColor="#e2e9ee"/></linearGradient></defs>
   <path d="M25 3 44 11v17c0 10-8 17-19 23C14 45 6 38 6 28V11Z" fill="#0b111a" stroke={metal} strokeWidth="2.6"/>
   <path d="M25 8 39 14v14c0 8-6 14-14 18-8-4-14-10-14-18V14Z" fill="currentColor" opacity=".12"/>
   <path d="M14 30Q12 21 20 15l3-8 6 9 5-3 2 8 6 5-3 3-7 1q-4 7-7 11-1-7-8-11l-4 4Z" fill={metal} stroke="#101824" strokeWidth=".7" strokeLinejoin="round"/>
   <path d="M18 28q5-6 14-7M29 32q-6 3-4 9m6-16 4 1" fill="none" stroke="#121a24" strokeWidth="1.1" strokeLinecap="round"/>
   <path d="m34 25 2 0" stroke="#e9d2a6" strokeWidth="1.1" strokeLinecap="round"/>
   {token==='helper'&&<path d="m21 45 4 2 4-2" stroke="currentColor" strokeWidth="1.8" fill="none"/>}
   {token==='senior'&&<path d="m18 43 7 4 7-4m-10 5 3 2 3-2" stroke="currentColor" strokeWidth="1.5" fill="none"/>}
   {token==='moderator'&&<path d="m15 39 2 4 2-4m12 0 2 4 2-4" stroke="currentColor" strokeWidth="1.3" fill="none"/>}
   {gold&&<path d="m16 9 5 3 4-6 4 6 5-3-2 6H18Z" fill={metal} stroke="#111923" strokeWidth=".6"/>}
   <path d="M8 12 25 5 42 12" fill="none" stroke="#fff" opacity=".45" strokeWidth=".8"/>
  </svg>
 </span>;
}
export function RankLabel({rank}:{rank:Rank}){
 return <span className={'v8-rank-label v8-rank--'+rankToken(rank)}><span className="v8-rank-label-dot"/>{rank}</span>;
}
