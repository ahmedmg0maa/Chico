'use client';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState,type ReactNode} from 'react';

/** Render management dialogs above the app, not inside the page fade animation.
 * That animation has a persistent transform, which otherwise makes position:fixed
 * relative to the scrolling page instead of the browser viewport.
 */
export default function ModalPortal({children,light=false,onEscape}:{
 children:ReactNode;light?:boolean;onEscape?:()=>void;
}){
 const [ready,setReady]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const escapeCallback=useRef(onEscape);
 escapeCallback.current=onEscape;
 useEffect(()=>setReady(true),[]);
 useEffect(()=>{
  if(!ready)return;
  const originalOverflow=document.body.style.overflow;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  const autofocus=()=>root.current?.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="إغلاق"],[role="dialog"] button[aria-label="إغلاق الملف"]')?.focus();
  autofocus();
  function keyboard(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();escapeCallback.current?.();return;}
   if(event.key!=='Tab')return;
   const dialog=root.current?.querySelector<HTMLElement>('[role="dialog"]');
   if(!dialog)return;
   const selector='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
   const focusable=Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(el=>el.getClientRects().length>0&&el.getAttribute('aria-hidden')!=='true');
   if(!focusable.length){event.preventDefault();dialog.focus();return;}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',keyboard);
  return()=>{
   document.removeEventListener('keydown',keyboard);
   document.body.style.overflow=originalOverflow;
   previousFocus?.focus({preventScroll:true});
  };
 },[ready]);
 if(!ready)return null;
 return createPortal(
  <div ref={root} className={'chico-v2 v11-dialog-portal'+(light?' x-light':'')} dir="rtl">{children}</div>,
  document.body
 );
}
