'use client';

import {useState} from 'react';
import DashboardWeekNotice from './DashboardWeekNotice';
import type {PreviousRecordedWeek} from '@/lib/dashboard-history';

// Verified CHICO fixture totals. Preview-only: never used as live site data.
const previous:PreviousRecordedWeek={
 weekStart:'2026-11-09',from:'2026-11-09',to:'2026-11-12',
 records:26,members:26,tickets:3222,flags:50,hours:259
};

export default function DashboardWeekDemo(){
 const [mode,setMode]=useState<'history'|'empty'>('history');
 const [message,setMessage]=useState('');
 const switchMode=(value:'history'|'empty')=>{setMode(value);setMessage('');};
 return <main className="chico-v2" dir="rtl" style={{minHeight:'100vh',padding:'30px 15px 75px'}}>
  <div style={{maxWidth:1240,margin:'0 auto'}}>
   <header style={{display:'flex',flexWrap:'wrap',gap:14,alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
    <div>
     <small style={{fontWeight:850,color:'var(--ch-gold)'}}>CHICO GENERAL TEAM / PREVIEW</small>
     <h1 style={{fontSize:28,margin:'7px 0'}}>معاينة حالة الأسبوع الجديد</h1>
     <p style={{fontSize:13,color:'var(--ch-muted)',lineHeight:1.8}}>بيانات العرض مأخوذة من ملف اختبار CHICO، وليست اتصالًا بإحصائيات فريق الإنتاج أو تعديلًا لها.</p>
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <button type="button" aria-pressed={mode==='history'} onClick={()=>switchMode('history')} style={{padding:'12px 15px',border:'1px solid var(--ch-line-strong)',borderRadius:10,background:mode==='history'?'var(--ch-gold)':'var(--ch-surface)',color:mode==='history'?'#23190d':'var(--ch-text)',fontWeight:850}}>أسبوع جديد + سجل سابق</button>
     <button type="button" aria-pressed={mode==='empty'} onClick={()=>switchMode('empty')} style={{padding:'12px 15px',border:'1px solid var(--ch-line)',borderRadius:10,background:mode==='empty'?'var(--ch-gold)':'var(--ch-surface)',color:mode==='empty'?'#23190d':'var(--ch-text)',fontWeight:850}}>بدون أي سجل سابق</button>
    </div>
   </header>
   <DashboardWeekNotice currentWeek="2026-11-16" previous={mode==='history'?previous:null}
    onRecord={()=>setMessage('في الموقع الحقيقي، الزر بيفتح صفحة تسجيل قراءة للأسبوع الحالي.')}
    onReadReports={()=>setMessage('في الموقع الحقيقي، الزر بيفتح التقرير اليومي على نطاق التواريخ المحفوظ بالكامل.')}/>
   {message&&<p role="status" style={{padding:15,marginBottom:17,border:'1px solid var(--ch-line)',borderRadius:10,background:'var(--ch-surface)',color:'var(--ch-muted)'}}>{message}</p>}
   <div className="x-kpi-grid v8-kpi-grid" aria-label="مؤشرات الأسبوع الحالي">
    {['تذاكر الأسبوع','الفلاجات','معدل الفلاجات','تغطية الفريق'].map(label=>
     <div className="x-kpi v8-kpi" key={label}><div className="x-kpi-title"><div><b>{label}</b><small>الأسبوع الحالي — بدون قراءات</small></div></div><strong>—</strong><span>لم تُسجَّل بعد</span></div>)}
   </div>
  </div>
 </main>;
}
