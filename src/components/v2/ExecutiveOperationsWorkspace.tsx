'use client';
import {useState} from 'react';
import {CalendarDays,FileSpreadsheet,ShieldAlert,BarChart3,Download,Plus,ChevronDown} from 'lucide-react';
import AdvancedAdministration from './AdvancedAdministration';
import type {Admin,State} from '@/lib/types';
import ExecutiveOperations,{type OperationTab} from './ExecutiveOperations';
import {CommandIcon} from './ChicoVisualLanguage';

type Props={state:State|null;previewAdmins?:Admin[];review:boolean;onRefresh:()=>Promise<void>;onNavigate:(tab:'dashboard'|'team'|'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings')=>void};
type AdminTool='points'|'shifts'|'activity';
const tools:{id:OperationTab|AdminTool;label:string;desc:string}[]=[
 {id:'points',label:'النقاط والمكافآت',desc:'سجل مستقل'},
 {id:'shifts',label:'المناوبات الثابتة',desc:'جدول الفريق'},
 {id:'activity',label:'سجل الإجراءات',desc:'تاريخ التغييرات'},
 {id:'excel',label:'استيراد Excel',desc:'مراجعة الملف ثم الحفظ'},
 {id:'server',label:'أداء السيرفر',desc:'إحصائيات الأسبوع'},
 {id:'weeks',label:'إغلاق الأسبوع',desc:'ضبط الفترة الأسبوعية'},
 {id:'alerts',label:'التنبيهات',desc:'متابعة الأداء'},
 {id:'settings',label:'إعدادات الإدارة',desc:'النسخ والحماية'}
];
export default function ExecutiveOperationsWorkspace({state,previewAdmins=[],review,onRefresh,onNavigate}:Props){
 const [selected,setSelected]=useState<OperationTab|AdminTool>('excel');
 const advanced=selected==='points'||selected==='shifts'||selected==='activity';
 const [lastTool,setLastTool]=useState<OperationTab>('excel');
 return <section className="v9-tools-shell">
  <header className="v9-tools-top"><div className="ct-workspace-identity"><CommandIcon name="operations"/><div><h1>أدوات الإدارة</h1></div></div>
   <div className="v9-tools-shortcuts"><button type="button" onClick={()=>onNavigate('updates')}><Plus size={17}/>تسجيل قراءة</button><button type="button" onClick={()=>onNavigate('reports')}><Download size={17}/>صورة Discord</button></div>
  </header>
  <div className="v9-tools-content"><nav className="v9-tools-nav" aria-label="أدوات الإدارة">
   {tools.map(t=><button key={t.id} type="button" className={selected===t.id?'active':''} onClick={()=>{setSelected(t.id);if(t.id!=='points'&&t.id!=='shifts'&&t.id!=='activity')setLastTool(t.id);}} aria-current={selected===t.id?'page':undefined}>
    <CommandIcon name={t.id==='points'?'rating':t.id==='shifts'?'shift':t.id==='activity'?'history':t.id}/><span><b>{t.label}</b></span></button>)}
  </nav>
  <div className="v9-tools-active ct-content-reveal"><div hidden={advanced}><ExecutiveOperations tab={lastTool} state={state} review={review} onRefresh={onRefresh} compactHead/></div>{advanced&&<AdvancedAdministration admins={review?previewAdmins:state?.admins||[]} review={review} section={selected} onTeam={()=>onNavigate('team')}/>}</div></div>
 </section>;
}
