'use client';

import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {
  Activity,ArrowDownToLine,ArrowLeft,ArrowUpDown,BadgeCheck,CalendarDays,Check,CheckCircle2,
  ChevronLeft,ChevronRight,Clock3,Eye,Filter,Flag,LayoutGrid,List,MoreHorizontal,
  Pencil,Plus,RefreshCw,Save,Search,Shield,ShieldAlert,SlidersHorizontal,Star,
  Ticket,Trash2,UserRound,Users,X
} from 'lucide-react';
import type {Admin,Rank} from '@/lib/types';
import {RANKS} from '@/lib/types';
import {CommandIcon,RankInsignia,RankLabel,rankToken} from './ChicoVisualLanguage';
import {applyLocalRosterChange,LOCAL_ROSTER_HISTORY_KEY,type LocalRosterEvent,type LocalRosterAction} from '@/lib/localRoster';

export type DirectoryRow={
 id:string;name:string;rank:Rank;active:boolean;in_reporting:boolean;
 admin_level?:number|null;shift_label?:string|null;
 tickets:number|null;flags:number|null;rating:number|null;hours:number|null;lastUpdate:string|null;
};
type AdminExtra=Admin&{full_name?:string|null;notes?:string|null;timezone?:string|null;supervisor_id?:string|null};
type Props={
 admins:Admin[];rows:DirectoryRow[];review:boolean;onRefresh:()=>Promise<void>;
 onPreviewChange:(admins:Admin[])=>void;onOpen:(row:DirectoryRow)=>void;editTarget?:string|null;onEditConsumed?:()=>void;searchQuery?:string;
};
type Draft={
 name:string;full_name:string;rank:Rank;admin_level:number;shift_label:string;
 joined_on:string;timezone:string;supervisor_id:string;notes:string;active:boolean;in_reporting:boolean;
};
type SortKey='name'|'rank'|'tickets'|'flags'|'rating'|'lastUpdate';
const newDraft=():Draft=>({name:'',full_name:'',rank:'Helper',admin_level:1,shift_label:'',joined_on:'',
 timezone:'Africa/Cairo',supervisor_id:'',notes:'',active:true,in_reporting:true});
const format=(v:number|null|undefined,digits=0)=>v==null?'—':v.toLocaleString('en-US',{maximumFractionDigits:digits});
const csvValue=(v:unknown)=>{
 const text=String(v??'');
 // Prevent spreadsheet formulas when the exported CSV is opened.
 const safe=/^[=+\-@\t\r]/.test(text)?'\''+text:text;
 return '"'+safe.replace(/"/g,'""')+'"';
};
function CSVExport({items}:{items:DirectoryRow[]}){
 const download=()=>{
  const cells=[['الاسم','الرتبة','المستوى','الحالة','ضمن التقارير','المناوبة','Tickets','Flags','Rating','TIME','آخر قراءة']];
  for(const r of items)cells.push([r.name,r.rank,String(r.admin_level??''),r.active?'نشط':'غير نشط',r.in_reporting?'نعم':'لا',r.shift_label||'',String(r.tickets??''),String(r.flags??''),String(r.rating??''),String(r.hours??''),r.lastUpdate||'']);
  const csv='\uFEFF'+cells.map(row=>row.map(csvValue).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='CHICO_Team_Roster.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
 };
 return <button type="button" className="v7-btn v7-btn-muted" onClick={download}><ArrowDownToLine size={17}/>تصدير CSV</button>;
}
function RoleSeal({rank}:{rank:Rank}){return <RankInsignia rank={rank} compact/>;}
function Stat({title,value,icon:Icon,tone}:{title:string;value:number;icon:typeof Users;tone?:string}){
 const glyph=title.includes('إجمالي')?'members':title.includes('نشط حاليًا')?'coverage':title.includes('غير نشط')?'alerts':'updates';
 return <div className={'v7-directory-stat '+(tone||'')}><CommandIcon name={glyph}/><span>{title}</span><b>{format(value)}</b></div>;
}

export default function ExecutiveTeamStudio({admins,rows,review,onRefresh,onPreviewChange,onOpen,editTarget,onEditConsumed,searchQuery=''}:Props){
 const [search,setSearch]=useState('');
 useEffect(()=>{setSearch(searchQuery);setPage(1);},[searchQuery]);
 const [rank,setRank]=useState<'all'|Rank>('all');
 const [status,setStatus]=useState<'all'|'active'|'inactive'|'unreported'>('all');
 const [sort,setSort]=useState<SortKey>('name');
 const [descending,setDescending]=useState(false);
 const [page,setPage]=useState(1);
 const [size,setSize]=useState(10);
 const [layout,setLayout]=useState<'table'|'cards'>('table');
 const [target,setTarget]=useState<string|null>(null);
 const [showEditor,setShowEditor]=useState(false);
 const [draft,setDraft]=useState<Draft>(newDraft);
 const [saving,setSaving]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [failure,setFailure]=useState('');
 const [confirmDelete,setConfirmDelete]=useState(false);
 const [confirmName,setConfirmName]=useState('');
 const [showAdvanced,setShowAdvanced]=useState(false);
 const editorAdmin=admins.find(a=>a.id===target) as AdminExtra|undefined;
 const isEditing=!!target;
 const beginAdd=()=>{setTarget(null);setDraft(newDraft());setFeedback('');setFailure('');setConfirmDelete(false);setConfirmName('');setShowEditor(true);};
 const beginEdit=(a:Admin)=>{
  const record=a as AdminExtra;
  setTarget(a.id);
  setDraft({name:a.name,full_name:record.full_name||'',rank:a.rank,admin_level:a.admin_level||1,
   shift_label:a.shift_label||'',joined_on:a.joined_on||'',timezone:record.timezone||'Africa/Cairo',
   supervisor_id:record.supervisor_id||'',notes:record.notes||'',active:a.active,in_reporting:a.in_reporting});
  setFeedback('');setFailure('');setConfirmDelete(false);setConfirmName('');setShowEditor(true);
 };
 useEffect(()=>{
  if(editTarget){
   const a=admins.find(x=>x.id===editTarget);
   if(a)beginEdit(a);
   onEditConsumed?.();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[editTarget]);
 useEffect(()=>{
  if(!showEditor)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!saving)setShowEditor(false);};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[showEditor,saving]);
 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase();
  return rows.filter(r=>{
   if(rank!=='all'&&r.rank!==rank)return false;
   if(status==='active'&&!r.active)return false;
   if(status==='inactive'&&r.active)return false;
   if(status==='unreported'&&r.lastUpdate!==null)return false;
   if(q&&!([r.name,r.rank,String(r.admin_level||''),r.shift_label||''].some(x=>x.toLowerCase().includes(q))))return false;
   return true;
  }).sort((a,b)=>{
   const av=a[sort],bv=b[sort];
   if(av==null&&bv!=null)return 1;
   if(av!=null&&bv==null)return -1;
   const diff=sort==='rank'?RANKS.indexOf(a.rank)-RANKS.indexOf(b.rank):typeof av==='number'&&typeof bv==='number'?av-bv:String(av??'').localeCompare(String(bv??''),'en',{numeric:true});
   return descending?-diff:diff;
  });
 },[rows,search,rank,status,sort,descending]);
 const pages=Math.max(1,Math.ceil(filtered.length/size));
 const selectedPage=Math.min(page,pages);
 const shown=filtered.slice((selectedPage-1)*size,selectedPage*size);
 const setFilterRole=(r:'all'|Rank)=>{setRank(r);setPage(1);};
 const setOrder=(k:SortKey)=>{if(sort===k)setDescending(x=>!x);else{setSort(k);setDescending(k==='tickets'||k==='rating');}setPage(1);};
 const run=async(method:'POST'|'PATCH'|'DELETE',payload?:Record<string,unknown>)=>{
  setSaving(true);setFailure('');setFeedback('');
  try{
   if(review){
    const action:LocalRosterAction=method==='DELETE'?{kind:'delete',id:target||''}:method==='POST'
      ?{kind:'add',id:'local-'+crypto.randomUUID(),input:{name:draft.name,rank:draft.rank,admin_level:draft.admin_level,shift_label:draft.shift_label||null,active:true,in_reporting:true}}
      :{kind:'edit',id:target||'',input:{name:draft.name,rank:draft.rank,admin_level:draft.admin_level,shift_label:draft.shift_label||null,active:draft.active,in_reporting:draft.in_reporting}};
    const result=applyLocalRosterChange(admins,action,new Date().toISOString());
    onPreviewChange(result.admins);
    if(result.events.length){
     const current=JSON.parse(localStorage.getItem(LOCAL_ROSTER_HISTORY_KEY)||'[]') as LocalRosterEvent[];
     localStorage.setItem(LOCAL_ROSTER_HISTORY_KEY,JSON.stringify([...(Array.isArray(current)?current:[]),...result.events].slice(-500)));
    }
   }else{
    const endpoint=method==='POST'?'/api/roster':'/api/roster/'+encodeURIComponent(target||'');
    const response=await fetch(endpoint,{method,credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})});
    const body=await response.json();
    if(!response.ok||body.ok===false)throw new Error(String(body.error||'تعذر حفظ التغييرات'));
    await onRefresh();
   }
   setFeedback(method==='DELETE'?'تم حذف الإداري وحفظ نسخة احتياطية':'تم حفظ بيانات الإداري بنجاح');
   setShowEditor(false);setConfirmDelete(false);setConfirmName('');setTarget(null);
  }catch(e){setFailure(e instanceof Error?e.message:'تعذر تنفيذ العملية');}
  finally{setSaving(false);}
 };
 const save=(e:FormEvent)=>{
  e.preventDefault();
  if(!draft.name.trim())return setFailure('اسم الإداري مطلوب');
  if(admins.some(a=>a.id!==target&&a.name.trim().toLowerCase()===draft.name.trim().toLowerCase()))return setFailure('يوجد إداري بالاسم نفسه');
  const payload={name:draft.name.trim(),full_name:draft.full_name.trim()||null,rank:draft.rank,admin_level:draft.admin_level,
   shift_label:draft.shift_label.trim()||null,joined_on:draft.joined_on||null,timezone:draft.timezone,
   supervisor_id:draft.supervisor_id||null,notes:draft.notes.trim(),active:draft.active,in_reporting:draft.in_reporting};
  void run(isEditing?'PATCH':'POST',payload);
 };
 const destroy=()=>{if(!editorAdmin||confirmName.trim()!==editorAdmin.name)return;
  void run('DELETE',{confirm:'DELETE'});
 };
 return <div className="v7-team-studio">
  <div className="v7-directory-summary">
   <Stat title="إجمالي الإداريين" value={rows.length} icon={Users}/>
   <Stat title="نشط حاليًا" value={rows.filter(r=>r.active).length} icon={CheckCircle2} tone="v7-green"/>
   <Stat title="غير نشط" value={rows.filter(r=>!r.active).length} icon={ShieldAlert} tone="v7-red"/>
   <Stat title="لهم قراءات" value={rows.filter(r=>r.lastUpdate!==null).length} icon={Activity} tone="v7-blue"/>
  </div>
  <section className="v7-directory-board" aria-label="إدارة أعضاء الفريق">
   <div className="v7-board-heading">
    <div><small>TEAM MANAGEMENT / CHICO ME</small><h2><Users size={22}/> إدارة الفريق والإداريين</h2><p>إضافة وتعديل وحذف ومراجعة أعضاء الفريق من مكان واحد</p></div>
    <div className="v7-board-actions">
     <button type="button" onClick={()=>void onRefresh()} className="v7-btn v7-btn-icon" title="تحديث البيانات" disabled={review}><RefreshCw size={19}/></button>
     <CSVExport items={filtered}/>
     <button type="button" onClick={beginAdd} className="v7-btn v7-btn-primary"><Plus size={19}/>إضافة إداري</button>
    </div>
   </div>
   <div className="v7-toolbar">
    <div className="v7-search"><Search size={20}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="ابحث بالاسم أو الرتبة أو المناوبة" aria-label="البحث في الإداريين"/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="مسح البحث"><X size={15}/></button>}</div>
    <button type="button" className={'v7-btn v7-btn-muted '+(showAdvanced?'v7-active':'')} onClick={()=>setShowAdvanced(v=>!v)}><SlidersHorizontal size={18}/>فلاتر</button>
    <select aria-label="الترتيب" value={sort} onChange={e=>setOrder(e.target.value as SortKey)}>
     <option value="name">ترتيب بالاسم</option><option value="rank">ترتيب بالرتبة</option><option value="tickets">أعلى Tickets</option><option value="flags">الفلاجات</option><option value="rating">التقييم</option><option value="lastUpdate">آخر تحديث</option>
    </select>
    <button type="button" className="v7-btn v7-btn-icon" aria-label="عكس الترتيب" title="عكس الترتيب" onClick={()=>setDescending(x=>!x)}><ArrowUpDown size={18}/></button>
    <div className="v7-layout-switch"><button type="button" className={layout==='table'?'selected':''} onClick={()=>setLayout('table')} aria-label="عرض الجدول"><List size={19}/></button><button type="button" className={layout==='cards'?'selected':''} onClick={()=>setLayout('cards')} aria-label="عرض البطاقات"><LayoutGrid size={19}/></button></div>
   </div>
   <div className="v7-role-filter" role="group" aria-label="فلترة حسب الرتب">
    {[{id:'all',label:'الكل'},...RANKS.map(r=>({id:r,label:r}))].map(r=><button key={r.id} type="button" className={(rank===r.id?'active ':'')+(r.id==='all'?'':'v8-rank-filter v8-rank--'+rankToken(r.id as Rank))} onClick={()=>setFilterRole(r.id as 'all'|Rank)}>{r.label}<b>{r.id==='all'?rows.length:rows.filter(a=>a.rank===r.id).length}</b></button>)}
   </div>
   {showAdvanced&&<div className="v7-advanced-filter">
    <label><Filter size={16}/>حالة الإداري <select value={status} onChange={e=>{setStatus(e.target.value as typeof status);setPage(1);}}><option value="all">الكل</option><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="unreported">بلا قراءات مسجلة</option></select></label>
    <button type="button" onClick={()=>{setSearch('');setRank('all');setStatus('all');setSort('name');setDescending(false);setPage(1);}}>إزالة كل الفلاتر</button>
   </div>}
   <div className="v7-list-heading"><h3><Users size={18}/>قائمة الإداريين</h3><span>عرض {filtered.length?((selectedPage-1)*size+1):0}–{Math.min(selectedPage*size,filtered.length)} من {filtered.length} إداري</span></div>
   {layout==='table'?<div className="v7-table-scroll"><table className="v7-directory-table">
    <thead><tr><th>#</th><th>الإداري</th><th>الرتبة</th><th>المستوى</th><th>المناوبة</th><th>Tickets</th><th>Flags</th><th>Rating</th><th>TIME</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
    <tbody>{shown.map((row,i)=>{
     const current=admins.find(a=>a.id===row.id);
     return <tr key={row.id}>
      <td className="v7-index">{String((selectedPage-1)*size+i+1).padStart(2,'0')}</td>
      <td><div className="v7-person-name"><RoleSeal rank={row.rank}/><div><b dir="auto">{row.name}</b><small>{(current as AdminExtra)?.full_name||'CHICO GENERAL TEAM'}</small></div></div></td>
      <td><RankLabel rank={row.rank}/></td>
      <td>{row.admin_level??'—'}</td><td>{row.shift_label||'—'}</td>
      <td className="v7-figure">{format(row.tickets)}</td>
      <td><span className={'v7-number-chip '+(row.flags===null?'neutral':row.flags>7?'danger':row.flags>5?'warning':'success')}>{format(row.flags)}</span></td>
      <td><span className={'v7-number-chip '+(row.rating===null?'neutral':row.rating<4.8?'danger':'success')}>{format(row.rating,2)}</span></td>
      <td className="v7-figure">{row.hours==null?'—':format(row.hours,2)+'h'}</td>
      <td><span className={'v7-state-chip '+(row.active?'on':'off')}><i/>{row.active?'نشط':'غير نشط'}</span></td>
      <td><div className="v7-row-actions"><button type="button" onClick={()=>onOpen(row)} aria-label={'ملف '+row.name} title="عرض الملف"><Eye size={17}/></button><button type="button" data-chico-edit-id={row.id} onClick={()=>current&&beginEdit(current)} aria-label={'تعديل '+row.name} title="تعديل"><Pencil size={17}/></button><button type="button" className="destructive" onClick={()=>{if(current){beginEdit(current);setConfirmDelete(true);}}} aria-label={'حذف '+row.name} title="حذف"><Trash2 size={17}/></button></div></td>
     </tr>;
    })}</tbody>
   </table></div>:<div className="v7-team-cards">{shown.map(row=>{const a=admins.find(x=>x.id===row.id);return <article className="v7-person-card" key={row.id}><RoleSeal rank={row.rank}/><h3>{row.name}</h3><p><RankLabel rank={row.rank}/> · المستوى {row.admin_level||'—'}</p><span className={'v7-state-chip '+(row.active?'on':'off')}>{row.active?'نشط':'غير نشط'}</span><div><span>Tickets: {format(row.tickets)}</span><span>Flags: {format(row.flags)}</span></div><footer><button onClick={()=>onOpen(row)}>فتح الملف</button><button onClick={()=>a&&beginEdit(a)}>تعديل</button></footer></article>;})}</div>}
   {!filtered.length&&<div className="v7-empty-people"><Users size={33}/><b>لا يوجد إداريون مطابقون</b><p>غيّر البحث أو أزل الفلاتر، أو أضف إداريًا جديدًا.</p></div>}
   <div className="v7-table-footer"><label>صفوف لكل صفحة<select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="v7-paginator"><button disabled={selectedPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="الصفحة السابقة"><ChevronRight size={17}/></button><b>{selectedPage} / {pages}</b><button disabled={selectedPage===pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} aria-label="الصفحة التالية"><ChevronLeft size={17}/></button></div></div>
  </section>
  {feedback&&<div className="v7-toast" role="status"><CheckCircle2 size={20}/>{feedback}<button type="button" onClick={()=>setFeedback('')} aria-label="إغلاق"><X size={17}/></button></div>}
  {showEditor&&<div className="v7-editor-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setShowEditor(false);}}>
   <aside className="v7-editor-panel" role="dialog" aria-modal="true" aria-label={isEditing?'تعديل الإداري':'إضافة إداري'}>
    <header><span>CHICO / TEAM CONTROL</span><button onClick={()=>setShowEditor(false)} disabled={saving} aria-label="إغلاق"><X size={21}/></button></header>
    <div className="v7-editor-art"><img src="/assets/chico-illustrated-team.avif" alt="" /><div><RoleSeal rank={draft.rank}/><h2>{isEditing?'تعديل بيانات الإداري':'إضافة إداري جديد'}</h2><p>{draft.name||'CHICO GENERAL TEAM'}</p></div></div>
    <form onSubmit={save} className="v7-editor-form">
     <h3><UserRound size={18}/> المعلومات الأساسية</h3>
     <label>اسم اللعبة <em>*</em><input required maxLength={80} value={draft.name} onChange={e=>setDraft(s=>({...s,name:e.target.value}))} disabled={saving}/></label>
     <div className="v7-field-pair"><label>الرتبة<select value={draft.rank} onChange={e=>setDraft(s=>({...s,rank:e.target.value as Rank}))} disabled={saving}>{RANKS.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
     <label>المستوى الإداري<select value={draft.admin_level} onChange={e=>setDraft(s=>({...s,admin_level:Number(e.target.value)}))} disabled={saving}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label></div>
     <label>المناوبة الثابتة<input maxLength={120} value={draft.shift_label} onChange={e=>setDraft(s=>({...s,shift_label:e.target.value}))} disabled={saving} placeholder="مثال: السبت 20:00 إلى 22:00"/></label>
     <h3><Shield size={18}/> الحالة والصلاحية في التقارير</h3>
     <label className="v7-toggle-row"><span><b>حالة الإداري</b><small>نشط أو غير نشط ضمن الفريق</small></span><input type="checkbox" checked={draft.active} onChange={e=>setDraft(s=>({...s,active:e.target.checked}))} disabled={saving}/></label>
     <label className="v7-toggle-row"><span><b>الظهور في التقارير</b><small>تضمين العضو عند عرض التقارير</small></span><input type="checkbox" checked={draft.in_reporting} onChange={e=>setDraft(s=>({...s,in_reporting:e.target.checked}))} disabled={saving}/></label>
     <details className="v9-editor-extras"><summary>بيانات وملاحظات إضافية (اختياري)</summary><div>
       <label>الاسم الكامل<input maxLength={120} value={draft.full_name} onChange={e=>setDraft(s=>({...s,full_name:e.target.value}))} disabled={saving}/></label>
       <div className="v7-field-pair"><label>تاريخ الانضمام<input type="date" value={draft.joined_on} onChange={e=>setDraft(s=>({...s,joined_on:e.target.value}))} disabled={saving}/></label>
       <label>المنطقة الزمنية<select value={draft.timezone} onChange={e=>setDraft(s=>({...s,timezone:e.target.value}))} disabled={saving}><option value="Africa/Cairo">القاهرة</option><option value="Asia/Riyadh">السعودية</option><option value="UTC">UTC</option></select></label></div>
       <label>المشرف<select value={draft.supervisor_id} onChange={e=>setDraft(s=>({...s,supervisor_id:e.target.value}))} disabled={saving}><option value="">غير محدد</option>{admins.filter(a=>a.id!==target).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
       <label>ملاحظات إدارية<textarea rows={3} maxLength={2000} value={draft.notes} onChange={e=>setDraft(s=>({...s,notes:e.target.value}))} disabled={saving}/></label>
     </div></details>
     {failure&&<p className="v7-form-error" role="alert"><ShieldAlert size={17}/>{failure}</p>}
     {confirmDelete&&editorAdmin&&<div className="v7-delete-confirm"><strong><ShieldAlert size={19}/> حذف نهائي للإداري</strong><p>سيحذف سجلات الإداري أيضًا، وسيُحفظ Backup قبل الحذف. اكتب اسم الإداري <b>{editorAdmin.name}</b> للتأكيد.</p><input value={confirmName} onChange={e=>setConfirmName(e.target.value)} placeholder="اكتب اسم الإداري كما هو" disabled={saving}/><button type="button" className="v7-btn v7-btn-danger" onClick={destroy} disabled={saving||confirmName.trim()!==editorAdmin.name}><Trash2 size={16}/> تأكيد الحذف النهائي</button><button type="button" onClick={()=>setConfirmDelete(false)}>إلغاء الحذف</button></div>}
     <div className="v7-editor-footer">
      {isEditing&&!confirmDelete&&<button type="button" className="v7-btn v7-btn-danger" onClick={()=>setConfirmDelete(true)} disabled={saving}><Trash2 size={17}/>حذف</button>}
      <button type="button" className="v7-btn v7-btn-muted" onClick={()=>setShowEditor(false)} disabled={saving}>إلغاء</button>
      <button type="submit" className="v7-btn v7-btn-primary" disabled={saving||!draft.name.trim()}><Save size={17}/>{saving?'جارٍ الحفظ…':isEditing?'حفظ التغييرات':'إنشاء الإداري'}</button>
     </div>
    </form>
   </aside>
  </div>}
 </div>;
}
