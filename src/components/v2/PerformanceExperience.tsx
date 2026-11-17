'use client';
import {useMemo,useState} from 'react';
import {Award,CalendarDays,ChartNoAxesCombined,RefreshCw,ShieldAlert,Trophy} from 'lucide-react';
import type {Admin,Reading,Week} from '@/lib/types';
import {availableWeeks,weeklyMembers,weeklyFacts,podium,weekEnd,comparableTicketChange,type RankedMember} from '@/lib/performance-insights';
import {CommandIcon,RankInsignia} from './ChicoVisualLanguage';

const fmt=(v:number|null)=>v===null?'—':v.toLocaleString('en-US',{maximumFractionDigits:2});
function previous(week:string){const d=new Date(week+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-7);return d.toISOString().slice(0,10);}
function Winner({member}:{member:RankedMember}){
 return <article className={'ct-honor-winner ct-place-'+member.place}>
  <div className="ct-honor-rays" aria-hidden="true"/><span className="ct-honor-medal"><Trophy size={21}/><b>{member.place}</b></span>
  <RankInsignia rank={member.rank}/><strong dir="auto">{member.name}</strong><span>{member.rank}</span>
  <b className="ct-honor-value">{fmt(member.tickets)}</b><small>Tickets</small>
 </article>;
}
export default function PerformanceExperience({admins,readings,weeks,currentWeek,section}:{admins:Admin[];readings:Reading[];weeks:Week[];currentWeek?:string;section:'honor'|'insights'}){
 const options=useMemo(()=>availableWeeks(readings,weeks,currentWeek),[readings,weeks,currentWeek]);
 const [selected,setSelected]=useState(''),[replay,setReplay]=useState(0);
 const week=options.includes(selected)?selected:options[0]||'';
 const members=useMemo(()=>weeklyMembers(admins,readings,week),[admins,readings,week]);
 const facts=weeklyFacts(members),closed=weeks.some(w=>w.week_start===week&&w.status==='closed');
 const prior=week?previous(week):'';
 const comparison=prior?comparableTicketChange(members,weeklyMembers(admins,readings,prior),closed,weeks.some(w=>w.week_start===prior&&w.status==='closed')):null;
 const helpers=podium(members,'helper'),mods=podium(members,'moderator');
 const active=facts.recorded>0;
 return <section className="ct-admin-studio ct-performance-experience">
  <header className="ct-admin-head"><div className="ct-workspace-identity"><CommandIcon name={section==='honor'?'rating':'server'}/><div><h2>{section==='honor'?'قاعة الشرف':'تحليل الأداء'}</h2><p>{section==='honor'?'ترتيب Tickets المسجّلة':'قراءة مبنية على البيانات المحفوظة'}</p></div></div><div className="ct-experience-controls">{options.length>0&&<label><span>الأسبوع</span><select aria-label="الأسبوع" value={week} onChange={e=>{setSelected(e.target.value);setReplay(v=>v+1);}}>{options.map(w=><option key={w} value={w}>{w} — {weekEnd(w)}</option>)}</select></label>}{section==='honor'&&active&&<button className="v9-quiet-btn" onClick={()=>setReplay(v=>v+1)}><RefreshCw size={16}/> إعادة العرض</button>}</div></header>
  {week&&<div className="ct-experience-meta"><CalendarDays size={16}/><bdi>{week} — {weekEnd(week)}</bdi><span>{closed?'أسبوع مغلق':'غير مغلق / نتائج أولية'}</span><span>{facts.recorded} / {facts.eligible} لديهم قراءات</span></div>}
  {!active?<div className="ct-experience-empty"><div className="ct-empty-emblem"><CommandIcon name={section==='honor'?'rating':'server'}/></div><h3>بانتظار البيانات</h3><p>ستظهر {section==='honor'?'المراكز المسجلة':'التحليلات'} بعد إدخال القراءات الفعلية.</p></div>:section==='honor'?<>
   {(!facts.fullCoverage||facts.unknownTickets.length>0)&&<p className="ct-insight-notice"><ShieldAlert size={17}/> الترتيب يخص Tickets المتاحة فقط؛ التغطية غير كاملة.</p>}
   <div className="ct-honor-board" key={week+'-'+replay}>
   {([['Top 3 Helpers',helpers],['Top 3 Moderators',mods]] as const).map(([title,group])=><section key={title} className={'ct-honor-group '+(title.includes('Moderators')?'ct-honor-mods':'ct-honor-helpers')}><h3><Award size={21}/>{title}</h3>{group.length?<div className="ct-honor-grid">{group.map(member=><Winner key={member.id} member={member}/>)}</div>:<p className="ct-admin-empty">لا توجد Tickets موجبة ومكتملة الحقول للترتيب.</p>}</section>)}
   </div><p className="ct-experience-caption">الترتيب حسب العدد المسجّل وليس جودة الأداء الكلية. التعادل يُمنح المركز نفسه. التصنيف بحسب الرتب الحالية؛ لا يُرحّل إلى نظام النقاط أو المكافآت.</p>
  </>:<>
   <div className="ct-insight-metrics">{[{name:'Tickets',value:fmt(facts.tickets),icon:'tickets'},{name:'Flags',value:fmt(facts.flags),icon:'flags'},{name:'Weekly Flag %',value:facts.rate===null?'—':fmt(facts.rate)+'%',icon:'rate'},{name:'Time',value:fmt(facts.hours),icon:'shift'}].map(m=><article key={m.name}><CommandIcon name={m.icon as 'tickets'|'flags'|'rate'|'shift'}/><div><small>{m.name}</small><strong>{m.value}</strong></div></article>)}</div>
   <div className="ct-insight-grid"><section className="ct-admin-card"><h3>تغطية القراءات</h3><div className="ct-coverage-track" role="meter" aria-label="نسبة الإداريين لديهم قراءات" aria-valuemin={0} aria-valuemax={100} aria-valuenow={facts.eligible?Math.round(facts.recorded/facts.eligible*100):0}><i style={{width:(facts.eligible?facts.recorded/facts.eligible*100:0)+'%'}}/></div><p>{facts.recorded} من {facts.eligible} لديهم قراءات، وليس بالضرورة تغطية الأسبوع بالكامل.</p><p>{facts.fullCoverage?'تغطية Tickets كاملة لكل الإداريين المؤهلين.':'لا تتوفر تغطية أسبوعية كاملة لكل الإداريين المؤهلين.'}</p>{facts.missing.length>0&&<details><summary>أسماء دون قراءات ({facts.missing.length})</summary><p>{facts.missing.map(m=>m.name).join('، ')}</p></details>}{facts.unknownFlags.length>0&&<details><summary>Flags غير مكتملة ({facts.unknownFlags.length})</summary><p>{facts.unknownFlags.map(m=>m.name).join('، ')}</p></details>}{facts.unknownTickets.length>0&&<details><summary>Tickets غير مكتملة ({facts.unknownTickets.length})</summary><p>{facts.unknownTickets.map(m=>m.name).join('، ')}</p></details>}</section>
   <section className="ct-admin-card"><h3><ChartNoAxesCombined size={19}/> مقارنة الأسبوع السابق</h3>{comparison?<><strong className="ct-comparison-value" dir="ltr">{comparison.delta>0?'+':''}{fmt(comparison.delta)} Tickets</strong><p>{comparison.percent===null?'النسبة غير متاحة لأن الأسبوع السابق صفر.':(comparison.percent>0?'+':'')+fmt(comparison.percent)+'%'}</p></>:<p>لا تتوفر مقارنة لأسبوعين متتاليين مغلقين بتغطية كاملة للإداريين المؤهلين حاليًا. لن تُعرض نسبة افتراضية.</p>}</section></div>
   <section className="ct-admin-card"><h3>قراءات الإداريين حسب الفترة</h3><div className="ct-insight-list">{members.filter(m=>m.recorded).map(m=><article key={m.id}><RankInsignia rank={m.rank} compact/><div><b dir="auto">{m.name}</b><small dir="ltr">{m.from} — {m.to}</small></div><strong dir="ltr">{fmt(m.tickets)} Tickets</strong><span dir="ltr">Flags: {fmt(m.flags)}</span></article>)}</div></section><p className="ct-experience-caption">الأرقام تخص القراءات المتاحة ضمن الأسبوع المحدد، ولا توزّع الزيادة على أيام منفردة. التغطية وفق القائمة الحالية، ولا تتوفر لقطة مستقلة للرتب في كل أسبوع قديم. التحليل آلي بالقواعد، وليس حكمًا أو تقييمًا بالذكاء الاصطناعي.</p>
  </>}
 </section>;
}
