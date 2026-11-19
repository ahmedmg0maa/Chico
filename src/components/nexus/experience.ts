'use client';

import {useEffect,useRef,type PointerEvent} from 'react';
import type {Tab} from '../v2/ExecutiveCommand';

/** One visual intent for every existing functional destination. Never carries data. */
export const NEXUS_SCENE_FAMILY = {
 dashboard:'command',
 team:'people',
 operations:'operations',
 updates:'operations',
 excel:'data',
 server:'data',
 daily:'reports',
 reports:'reports',
 weeks:'data',
 alerts:'vigilance',
 settings:'system',
 salary:'finance',
 academy:'learning'
} as const satisfies Record<Tab,'command'|'people'|'operations'|'data'|'reports'|'vigilance'|'system'|'finance'|'learning'>;

/**
 * Ambient pointer-responsive optical depth.
 * Direct DOM writes prevent React re-renders on pointer movement.
 * Only compositor-friendly transforms move the small decoration; never data/controls.
 */
export function useNexusSpotlight(){
 const frame=useRef(0);
 useEffect(()=>()=>{if(frame.current)cancelAnimationFrame(frame.current);},[]);
 function onPointerMove(event:PointerEvent<HTMLDivElement>){
  if(event.pointerType!=='mouse')return;
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const host=event.currentTarget;
  const bounds=host.getBoundingClientRect();
  if(bounds.width<=0||bounds.height<=0)return;
  const x=Math.round(event.clientX-bounds.left-150);
  const y=Math.round(event.clientY-bounds.top-150);
  if(frame.current)cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   host.style.setProperty('--nx-spot-x',x+'px');
   host.style.setProperty('--nx-spot-y',y+'px');
   host.setAttribute('data-nx-pointer','active');
  });
 }
 function onPointerLeave(event:PointerEvent<HTMLDivElement>){
  if(frame.current)cancelAnimationFrame(frame.current);
  event.currentTarget.removeAttribute('data-nx-pointer');
 }
 return {onPointerMove,onPointerLeave};
}
