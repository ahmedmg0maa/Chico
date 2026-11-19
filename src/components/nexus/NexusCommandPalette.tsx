'use client';

import {useEffect,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowLeft,Command,Search,Users,X} from 'lucide-react';
import {AnimatePresence,motion} from 'motion/react';
import {CommandIcon} from '../v2/ChicoVisualLanguage';
import type {Tab} from '../v2/ExecutiveCommand';

type Destination={id:Tab;label:string;en:string};
type Member={id:string;name:string;rank:string};
type Entry=
 |{type:'route';key:string;label:string;sub:string;id:Tab}
 |{type:'person';key:string;label:string;sub:string;id:string};

export default function NexusCommandPalette({
 open,routes,members,onClose,onNavigate,onMember
}:{
 open:boolean;routes:Destination[];members:Member[];
 onClose:()=>void;onNavigate:(id:Tab)=>void;onMember:(id:string)=>void;
}){
 const [query,setQuery]=useState('');
 const [active,setActive]=useState(0);
 const input=useRef<HTMLInputElement>(null);
 const dialog=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setQuery('');
  setActive(0);
  const frame=requestAnimationFrame(()=>input.current?.focus());
  return ()=>{cancelAnimationFrame(frame);previous?.focus();};
 },[open]);
 const entries=useMemo<Entry[]>(()=>{
  const q=query.trim().toLocaleLowerCase();
  const allRoutes=q?routes.filter(r=>(r.label+' '+r.en+' '+r.id).toLocaleLowerCase().includes(q)):
   routes.filter(r=>['dashboard','team','updates','excel','reports','salary','academy'].includes(r.id));
  const foundMembers=q?members.filter(m=>(m.name+' '+m.rank).toLocaleLowerCase().includes(q)):[];
  return [
   ...allRoutes.slice(0,7).map(r=>({type:'route' as const,key:'route-'+r.id,label:r.label,sub:r.en,id:r.id})),
   ...foundMembers.slice(0,5).map(m=>({type:'person' as const,key:'member-'+m.id,label:m.name,sub:m.rank,id:m.id}))
  ];
 },[query,routes,members]);
 const selected=Math.min(active,Math.max(0,entries.length-1));
 function activate(entry:Entry){
  if(entry.type==='route')onNavigate(entry.id);
  else onMember(entry.id);
  onClose();
 }
 function keys(e:KeyboardEvent<HTMLDivElement>){
  if(e.key==='Escape'){e.preventDefault();onClose();return;}
  if(e.key==='ArrowDown'){e.preventDefault();setActive(v=>Math.min(entries.length-1,v+1));return;}
  if(e.key==='ArrowUp'){e.preventDefault();setActive(v=>Math.max(0,v-1));return;}
  if(e.key==='Enter'&&entries[selected]){e.preventDefault();activate(entries[selected]);return;}
  if(e.key==='Tab'){
   const el=dialog.current;
   if(!el)return;
   const focusables=[...el.querySelectorAll<HTMLElement>('input:not([disabled]),button:not([disabled]),a[href]')];
   const first=focusables[0],last=focusables[focusables.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
 }
 return <AnimatePresence>
  {open&&<motion.div className="nx-palette-layer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.16}}>
   <button type="button" className="nx-palette-scrim" onClick={onClose} aria-label="إغلاق البحث السريع" tabIndex={-1}/>
   <motion.div ref={dialog} className="nx-palette-dialog" role="dialog" aria-modal="true" aria-label="التنقل السريع والبحث عن إداري" dir="rtl"
    onKeyDown={keys} initial={{opacity:0,y:-13,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:.985}}
    transition={{duration:0.22,ease:[.22,1,.36,1]}}>
    <div className="nx-palette-head">
     <span className="nx-palette-emblem" aria-hidden="true"><Command size={20}/></span>
     <div className="nx-palette-intro"><strong>التنقل السريع</strong><small>اذهب إلى القسم أو افتح ملف إداري</small></div>
     <button type="button" className="nx-palette-close" onClick={onClose} aria-label="إغلاق"><X size={19}/></button>
    </div>
    <div className="nx-palette-search">
     <Search size={19} aria-hidden="true"/>
     <input ref={input} value={query} type="search" placeholder="ابحث عن قسم أو إداري…" aria-label="بحث في أقسام الموقع والإداريين"
      onChange={e=>{setQuery(e.target.value);setActive(0);}} aria-controls="nx-palette-results"/>
     <span aria-hidden="true" className="nx-palette-shortcut">ESC</span>
    </div>
    <div id="nx-palette-results" className="nx-palette-results" role="group" aria-label="نتائج البحث">
     {entries.length?entries.map((entry,i)=><button type="button" key={entry.key}
      className={'nx-palette-result '+(selected===i?'is-selected':'')} onMouseEnter={()=>setActive(i)}
      onClick={()=>activate(entry)}>
      <span className="nx-palette-result-icon" aria-hidden="true">{entry.type==='route'?<CommandIcon name={entry.id} compact/>:<Users size={18}/>}</span>
      <span className="nx-palette-result-copy"><strong dir="auto">{entry.label}</strong><small>{entry.sub}</small></span>
      <ArrowLeft size={17} className="nx-palette-result-arrow" aria-hidden="true"/>
     </button>):<div className="nx-palette-empty">لا توجد أقسام أو أسماء مطابقة.</div>}
    </div>
    <div className="nx-palette-foot"><span>↑ ↓ للتنقل · Enter للفتح</span><span dir="ltr">CHICO TEAM</span></div>
   </motion.div>
  </motion.div>}
 </AnimatePresence>;
}
