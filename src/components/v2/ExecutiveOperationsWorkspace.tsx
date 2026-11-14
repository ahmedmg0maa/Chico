'use client';
import {useState} from 'react';
import {CalendarDays,FileSpreadsheet,ShieldAlert,BarChart3,Download,Plus,ChevronDown} from 'lucide-react';
import type {State} from '@/lib/types';
import ExecutiveOperations,{type OperationTab} from './ExecutiveOperations';
import {CommandIcon} from './ChicoVisualLanguage';

type Props={state:State|null;review:boolean;onRefresh:()=>Promise<void>;onNavigate:(tab:'dashboard'|'team'|'updates'|'excel'|'server'|'reports'|'weeks'|'alerts'|'settings')=>void};
const tools:{id:OperationTab;label:string;desc:string}[]=[
 {id:'excel',label:'استيراد Excel',desc:'مراجعة الملف ثم الحفظ'},
 {id:'server',label:'أداء السيرفر',desc:'إحصائيات الأسبوع'},
 {id:'weeks',label:'إغلاق الأسبوع',desc:'ضبط الفترة الأسبوعية'},
 {id:'alerts',label:'التنبيهات',desc:'متابعة الأداء'},
 {id:'settings',label:'إعدادات الإدارة',desc:'النسخ والحماية'}
];
export default function ExecutiveOperationsWorkspace({state,review,onRefresh,onNavigate}:Props){
 const [selected,setSelected]=useState<OperationTab>('excel');
 return <section className="v9-tools-shell">
  <header className="v9-tools-top"><div><small>CHICO / MANAGEMENT TOOLS</small><h1>أدوات الإدارة</h1><p>كل وظيفة في مكان واحد، من غير تكرار بطاقات الأداء أو التقارير.</p></div>
   <div className="v9-tools-shortcuts"><button type="button" onClick={()=>onNavigate('updates')}><Plus size={17}/>تسجيل قراءة</button><button type="button" onClick={()=>onNavigate('reports')}><Download size={17}/>صورة Discord</button></div>
  </header>
  <div className="v9-tools-content"><nav className="v9-tools-nav" aria-label="أدوات الإدارة">
   {tools.map(t=><button key={t.id} type="button" className={selected===t.id?'active':''} onClick={()=>setSelected(t.id)} aria-current={selected===t.id?'page':undefined}>
    <CommandIcon name={t.id}/><span><b>{t.label}</b><small>{t.desc}</small></span><ChevronDown size={16}/></button>)}
  </nav>
  <div className="v9-tools-active"><ExecutiveOperations tab={selected} state={state} review={review} onRefresh={onRefresh}/></div></div>
 </section>;
}
