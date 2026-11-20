'use client';

import './chico-icons.css';
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
export const rankToken=(rank:Rank)=>rank==='SN.Helper'?'senior':rank==='Moderator'?'moderator':rank==='Administrator'?'administrator':rank==='Responsible'?'responsible':'helper';
const glyphs:Record<CommandSymbol,string>={
 dashboard:'M3 13a9 9 0 0 1 18 0v5H3z M12 14l5-6 M6 12h1 M12 6v1',
 team:'M3 20v-2a6 6 0 0 1 12 0v2 M9 4a3.5 3.5 0 1 0 .01 0z M16 5a3 3 0 0 1 0 6 M17 14q4 1 4 6',
 members:'M12 4a4 4 0 1 0 .01 0z M4 21v-2a8 6 0 0 1 16 0v2',
 operations:'M4 6h5m5 0h6 M4 12h10m5 0h1 M4 18h2m5 0h9 M10 3v6m5 0v6m-8 0v6',
 updates:'M13 4H5v16h14v-8 M10 14l1-4 7-7 3 3-7 7z',
 excel:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8m-8 4h8m-4-5v8',
 server:'M3 20h18 M6 16v-4m6 4V8m6 8V4',
 daily:'M6 5h12v16H6z M9 3h6v4H9z M9 14l2 2 4-5',
 reports:'M4 5q8-3 16 0l2 12-5 2-2-3H9l-2 3-5-2z M8 11h1m6 0h1',
 weeks:'M3 6h18v15H3z M7 3v6m10-6v6 M4 11h16 M8 15h2m4 0h2',
 alerts:'M4 17h16l-2-4V9a6 6 0 0 0-12 0v4z M10 20q2 2 4 0',
 settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M12 9a3 3 0 1 0 .01 0z',
 academy:'M2 8l10-5 10 5-10 5z M6 11v5l6 3 6-3v-5 M21 10v6',
 salary:'M4 7l13-4 2 5 M3 8h18v12H3z M21 12h-6v4h6',
 tickets:'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 8v2m0 4v2',
 flags:'M5 21V4 M6 5q4-3 8 0t6 0v9q-3 2-7 0t-7 0',
 rating:'M12 2l3 6.5 7 1-5 5 1.2 7-6.2-3.4-6.2 3.4 1.2-7-5-5 7-1z',
 coverage:'M3 18l6-7 4 3 8-10 M16 4h5v5 M3 21h18',
 rate:'M5 19L19 5 M7 4a3 3 0 1 0 .01 0z M17 14a3 3 0 1 0 .01 0z',
 history:'M3 11a9 9 0 1 1 2 7 M3 5v6h6 M12 7v5l4 2',
 shift:'M12 3a9 9 0 1 0 .01 0z M12 7v5l4 3',
 export:'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5'
};
export function CommandIcon({name,compact=false,className=''}:IconProps){
 return <span className={'v8-symbol chico-glyph '+(compact?'v8-symbol--compact ':'')+className} data-symbol={name} aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={glyphs[name]}/></svg>
 </span>;
}
const grades={
 helper:'M3 6l9 6 9-6v5l-9 6-9-6z',
 senior:'M3 3l9 5 9-5v4l-9 5-9-5z M3 12l9 5 9-5v4l-9 5-9-5z',
 moderator:'M12 2l8 9-8 11-8-11z M12 7l-3 4 3 5 3-5z',
 administrator:'M3 7l5 4 4-8 4 8 5-4-2 10H5z M6 21h12',
 responsible:'M12 2l2.4 6.6 7 .4-5.5 4.6 1.9 7-5.8-4.1-5.8 4.1 1.9-7L2.6 9l7-.4z'
};
export function RankGlyph({rank}:{rank:Rank}){
 return <svg className={'grade-glyph grade-'+rankToken(rank)} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor" fillOpacity=".24" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d={grades[rankToken(rank)]} fillRule="evenodd"/></svg>;
}
export function RankInsignia({rank,compact=false}:{rank:Rank;compact?:boolean}){
 const token=rankToken(rank);
 return <span className={'v8-insignia ct-rank ct-signature-rank v8-rank--'+token+' '+(compact?'v8-insignia--compact':'')} role="img" aria-label={'رتبة '+rank} title={rank}>
 <RankGlyph rank={rank}/>
 </span>;
}
export function RankLabel({rank,showGlyph=true}:{rank:Rank;showGlyph?:boolean}){
 return <span className={'v8-rank-label v8-rank--'+rankToken(rank)}>{showGlyph&&<RankGlyph rank={rank}/>}{rank}</span>;
}
