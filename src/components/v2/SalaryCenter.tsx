'use client';
import WorkflowStatus from '../nexus/WorkflowStatus';
import {useEffect,useState,useMemo,type FormEvent} from 'react';
import {Gift,Copy,Edit3,Eye,EyeOff,Plus,Minus,X,Wallet,RefreshCw,Download} from 'lucide-react';
import type {Admin} from '@/lib/types';
import {emptySalary,changeBonus,salaryCopy,salaryInput,type SalaryProfile} from '@/lib/salary';

export default function SalaryCenter({admins,review}:{admins:Admin[];review:boolean}){
 const [items,setItems]=useState<SalaryProfile[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>(review?'ready':'loading');
 const [search,setSearch]=useState(''),[onlyBonus,setOnlyBonus]=useState(false),[edit,setEdit]=useState<SalaryProfile|null>(null),[hiddenIds,setHiddenIds]=useState<Set<string>>(()=>new Set()),[hideAll,setHideAll]=useState(false),[exporting,setExporting]=useState(false);
 const [pending,setPending]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function load(){setStatus('loading');setError('');try{const r=await fetch('/api/salary',{cache:'no-store',credentials:'same-origin'}),v=await r.json();if(!r.ok||!v.ok||!Array.isArray(v.items))throw Error();setItems(v.items);setStatus('ready');}catch{setStatus('error');}}
 useEffect(()=>{if(!review)void load();},[review]);
 const byId=useMemo(()=>new Map(items.map(x=>[x.admin_id,x])),[items]);
 const people=admins.filter(a=>a.active).sort((a,b)=>a.sort_order-b.sort_order);
 const list=people.filter(a=>{const p=byId.get(a.id);return (!onlyBonus||!!p?.bonus_count)&&[a.name,p?.rp_name,p?.rp_server].join(' ').toLowerCase().includes(search.toLowerCase().trim());});
 async function save(row:SalaryProfile,close=false){
  if(pending||status!=='ready')return;setPending(true);setMessage('');setError('');
  try{
   // The preview never sends salary data to a server or writes to browser storage.
   const validation=salaryInput.safeParse(review?{...row,admin_id:'11111111-1111-4111-8111-111111111111'}:row);
   if(!validation.success){setError('Check the Client ID, names and bonus value.');return;}
   let saved:SalaryProfile;
   if(review)saved={...row,rp_name:row.rp_name.trim(),rp_server:row.rp_server.trim(),revision:row.revision+1};
   else{const r=await fetch('/api/salary',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(row)}),v=await r.json();
    if(r.status===409){setError('This record changed in another session. Refresh and try again.');return;}
    if(!r.ok||!v.ok||!v.item)throw Error();saved=v.item;}
   setItems(prev=>[...prev.filter(x=>x.admin_id!==saved.admin_id),saved]);if(close)setEdit(null);setMessage(review?'Saved in this preview only.':'Saved.');
  }catch{setError('Could not save. No change confirmed.');}finally{setPending(false);}
 }
 async function copyValue(value:string,label:string){if(!value)return;try{await navigator.clipboard.writeText(value);setMessage(label+' copied.');setError('');}catch{setError('Clipboard is unavailable.');}}
 function toggleId(id:string){setHiddenIds(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next;});}
 async function exportExcel(){
 if(review||exporting||status!=='ready')return;setExporting(true);setError('');
 try{const r=await fetch('/api/salary/export',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error();const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='CHICO_Salary.xlsx';document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);setMessage('Excel exported.');}catch{setError('Excel export failed.');}finally{setExporting(false);}
 }
 function copyField(value:string|null,label:string){return <button type="button" className="ct-salary-icon-btn ct-copy-field" title={'Copy '+label} aria-label={'Copy '+label} disabled={!value} onClick={()=>void copyValue(value||'',label)}><Copy size={15}/></button>;}
 function submit(e:FormEvent){e.preventDefault();if(edit)void save(edit,true);}
 return <section className="ct-admin-studio ct-salary" dir="ltr">
 <header className="ct-salary-head"><div><span className="ct-salary-icon"><Wallet size={24}/></span><h1>Salary Center</h1></div><div className="ct-salary-head-actions"><button className="v9-quiet-btn" type="button" aria-pressed={hideAll} onClick={()=>{setHideAll(v=>!v);setHiddenIds(new Set());}}>{hideAll?<Eye size={16}/>:<EyeOff size={16}/>} {hideAll?'Show All IDs':'Hide All IDs'}</button>{!review&&<><button className="v9-primary" type="button" disabled={exporting||status!=='ready'||pending||!!edit} onClick={()=>void exportExcel()}><Download size={17}/> {exporting?'Exporting…':'Export Excel'}</button><button type="button" className="v9-quiet-btn" onClick={()=>void load()} disabled={pending||!!edit||status==='loading'} aria-label="Refresh salary records"><RefreshCw size={17}/></button></>}</div></header>
 <div className="ct-salary-summary"><div><small>Team members</small><strong>{people.length}</strong></div><div><small>Complete profiles</small><strong>{people.filter(a=>salaryCopy(a.name,byId.get(a.id)||emptySalary(a.id))).length}</strong></div><div><small>Bonus recipients</small><strong>{people.filter(a=>(byId.get(a.id)?.bonus_count||0)>0).length}</strong></div></div>
 {review&&<p className="ct-salary-policy">Preview only · changes are not stored.</p>}
 <div className="ct-salary-toolbar"><input aria-label="Search salary profiles" placeholder="Search by name or RP server" value={search} onChange={e=>setSearch(e.target.value)}/><button type="button" className="v9-quiet-btn" aria-pressed={onlyBonus} onClick={()=>setOnlyBonus(v=>!v)}><Gift size={16}/> {onlyBonus?'All profiles':'Bonus only'}</button></div>
 <WorkflowStatus tone={status==='error'||error?'blocked':status==='loading'||pending||exporting?'working':message?'ready':'info'} title={status==='error'?'Salary records unavailable':error?'Check the operation':status==='loading'?'Loading salary records':pending?'Saving profile':exporting?'Preparing Excel':message||'Salary workspace'} detail={status==='ready'?list.length+' of '+people.length+' profiles visible':undefined}/>{error&&<p className="v9-warning" role="alert">{error}</p>}
 {status==='loading'?<p className="ct-admin-empty">Loading salary profiles…</p>:status==='error'?<p className="v9-warning" role="alert">Salary records unavailable. Refresh to retry.</p>:<div className="ct-salary-grid">
 {list.map(a=>{const row=byId.get(a.id)||emptySalary(a.id),editing=edit?.admin_id===a.id,hidden=hideAll?!hiddenIds.has(a.id):hiddenIds.has(a.id);return <article key={a.id} className="ct-salary-card" data-bonus={row.bonus_count>0}>
 <div className="ct-salary-name"><div className="ct-salary-field ct-salary-name-field"><small>Administrative Name</small><h3 dir="auto">{a.name}</h3>{copyField(a.name,'Admin name')}</div>{row.bonus_count>0&&<span className="ct-bonus-mark"><Gift size={15}/> BONUS ×{row.bonus_count}</span>}</div>
 {editing&&edit?<form onSubmit={submit} className="ct-salary-edit">
 <label>Roleplay name<input value={edit.rp_name} maxLength={120} onChange={e=>setEdit({...edit,rp_name:e.target.value})}/></label>
 <label>Roleplay server<input value={edit.rp_server} maxLength={80} onChange={e=>setEdit({...edit,rp_server:e.target.value})}/></label>
 <label>Client ID<input value={edit.client_id||''} maxLength={36} onChange={e=>setEdit({...edit,client_id:e.target.value.trim()||null})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/></label>
 {edit.bonus_count>0&&<label>Bonus amount (optional)<input type="number" min="0" max="999999999999.99" step=".01" value={edit.bonus_amount??''} onChange={e=>setEdit({...edit,bonus_amount:e.target.value===''?null:Number(e.target.value)})}/></label>}
 <div className="ct-salary-actions"><button className="v9-primary" type="submit" disabled={pending}>Save</button><button className="v9-quiet-btn" type="button" disabled={pending} onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>:<>
 <div className="ct-salary-details"><div className="ct-salary-field"><div><small>Roleplay Name</small><p dir="auto">{row.rp_name||'—'}</p></div>{copyField(row.rp_name,'Roleplay name')}</div><div className="ct-salary-field"><div><small>Server</small><p dir="auto">{row.rp_server||'—'}</p></div>{copyField(row.rp_server,'Roleplay server')}</div><div className="ct-salary-field ct-client-id"><span>Client ID: {row.client_id?(hidden?'••••••••••••••••':row.client_id):'—'}</span>{row.client_id&&<button type="button" className="ct-salary-icon-btn" aria-label={hidden?'Show Client ID':'Hide Client ID'} title={hidden?'Show Client ID':'Hide Client ID'} onClick={()=>toggleId(a.id)}>{hidden?<Eye size={16}/>:<EyeOff size={16}/>}</button>}{copyField(row.client_id,'Client ID')}</div></div>
 {row.bonus_count>0&&row.bonus_amount!==null&&<p className="ct-salary-amount">Bonus amount: {row.bonus_amount.toLocaleString('en-US',{maximumFractionDigits:2})}</p>}
 <div className="ct-salary-actions"><button className="v9-quiet-btn" type="button" disabled={pending||!!edit} onClick={()=>setEdit({...row})}><Edit3 size={15}/> Edit</button><button className="v9-quiet-btn" type="button" onClick={()=>void copyValue([a.name,row.rp_name,row.rp_server,'Client ID: '+(row.client_id||'')].join('\n'),'Salary information')}><Copy size={15}/> Copy All</button></div>
 <div className="ct-bonus-controls">{row.bonus_count===0?<button className="v9-quiet-btn ct-bonus-add" type="button" disabled={pending||!!edit} onClick={()=>void save(changeBonus(row,1))}><Gift size={16}/> Add Bonus</button>:<><button type="button" className="ct-salary-icon-btn" disabled={pending||!!edit||row.bonus_count<=1} aria-label="Decrease bonus" onClick={()=>void save(changeBonus(row,row.bonus_count-1))}><Minus size={16}/></button><strong>×{row.bonus_count}</strong><button type="button" className="ct-salary-icon-btn" disabled={pending||!!edit||row.bonus_count>=99} aria-label="Increase bonus" onClick={()=>void save(changeBonus(row,row.bonus_count+1))}><Plus size={16}/></button><button type="button" className="v9-quiet-btn" disabled={pending||!!edit} onClick={()=>void save(changeBonus(row,0))}><X size={14}/> Remove Bonus</button></>}</div>
 </>}
 </article>})}{!list.length&&<p className="ct-admin-empty">No matching profiles.</p>}
 </div>}
 </section>;
}
