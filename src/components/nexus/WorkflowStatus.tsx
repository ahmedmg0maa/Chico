import type {ReactNode} from 'react';
import {CheckCircle2,Clock3,AlertTriangle,Info} from 'lucide-react';
export type WorkflowTone='info'|'ready'|'blocked'|'working';
export default function WorkflowStatus({tone='info',title,detail,children}:{tone?:WorkflowTone;title:string;detail?:string;children?:ReactNode}){
 const Icon=tone==='ready'?CheckCircle2:tone==='blocked'?AlertTriangle:tone==='working'?Clock3:Info;
 return <div className="nx-workflow-status" data-tone={tone} role="status" aria-live="polite"><span className="nx-workflow-icon" aria-hidden="true"><Icon size={19}/></span><div className="nx-workflow-copy"><b>{title}</b>{detail&&<small>{detail}</small>}</div>{children}</div>;
}
