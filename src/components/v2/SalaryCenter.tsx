'use client';
import {useEffect,useState,useMemo,type FormEvent} from 'react';
import {Gift,Copy,Edit3,Eye,EyeOff,Plus,Minus,X,Wallet,RefreshCw} from 'lucide-react';
import type {Admin} from '@/lib/types';
import {emptySalary,changeBonus,salaryCopy,salaryInput,type SalaryProfile} from '@/lib/salary';

export default function SalaryCenter({admins,review}:{admins:Admin[];review:boolean}){
 const [items,setItems]=useState<SalaryProfile[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>(review?'ready':'loading');
 const [search,setSearch]=useState(''),[onlyBonus,setOnlyBonus]=useState(false),[edit,setEdit]=useState<SalaryProfile|null>(null),[revealed,setRevealed]=useState<string|null>(null);
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
 async function copy(a:Admin,row:SalaryProfile){const value=salaryCopy(a.name,row);if(!value)return;try{await navigator.clipboard.writeText(value);setMessage('Salary information copied.');setError('');}catch{setError('Clipboard is unavailable.');}}
 function submit(e:FormEvent){e.preventDefault();if(edit)void save(edit,true);}
 return <section className="ct-admin-studio ct-salary" dir="ltr">
 <header className="ct-salary-head"><div><span className="ct-salary-icon"><Wallet size={24}/></span><h2>Salary Center</h2></div>{!review&&<button type="button" className="v9-quiet-btn" onClick={()=>void load()} disabled={pending||status==='loading'} aria-label="Refresh salary records"><RefreshCw size={17}/></button>}</header>
 <div className="ct-salary-summary"><div><small>Team members</small><strong>{people.length}</strong></div><div><small>Complete profiles</small><strong>{people.filter(a=>salaryCopy(a.name,byId.get(a.id)||emptySalary(a.id))).length}</strong></div><div><small>Bonus recipients</small><strong>{people.filter(a=>(byId.get(a.id)?.bonus_count||0)>0).length}</strong></div></div>
 <p className="ct-salary-policy">Minimum work requirement: 30 hours. Bonus is assigned manually. No automatic amount or eligibility calculation.</p>
 {review&&<p className="ct-salary-policy">Preview only · changes are not stored.</p>}
 <div className="ct-salary-toolbar"><input aria-label="Search salary profiles" placeholder="Search by name or RP server" value={search} onChange={e=>setSearch(e.target.value)}/><button type="button" className="v9-quiet-btn" aria-pressed={onlyBonus} onClick={()=>setOnlyBonus(v=>!v)}><Gift size={16}/> {onlyBonus?'All profiles':'Bonus only'}</button></div>
 {message&&<p className="ct-salary-status" role="status">{message}</p>}{error&&<p className="v9-warning" role="alert">{error}</p>}
 {status==='loading'?<p className="ct-admin-empty">Loading salary profiles…</p>:status==='error'?<p className="v9-warning" role="alert">Salary records unavailable. Refresh to retry.</p>:<div className="ct-salary-grid">
 {list.map(a=>{const row=byId.get(a.id)||emptySalary(a.id),editing=edit?.admin_id===a.id;return <article key={a.id} className="ct-salary-card" data-bonus={row.bonus_count>0}>
 <div className="ct-salary-name"><h3 dir="auto">{a.name}</h3>{row.bonus_count>0&&<span className="ct-bonus-mark"><Gift size={15}/> BONUS ×{row.bonus_count}</span>}</div>
 {editing&&edit?<form onSubmit={submit} className="ct-salary-edit">
 <label>Roleplay name<input value={edit.rp_name} maxLength={120} onChange={e=>setEdit({...edit,rp_name:e.target.value})}/></label>
 <label>Roleplay server<input value={edit.rp_server} maxLength={80} onChange={e=>setEdit({...edit,rp_server:e.target.value})}/></label>
 <label>Client ID<input value={edit.client_id||''} maxLength={36} onChange={e=>setEdit({...edit,client_id:e.target.value.trim()||null})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/></label>
 {edit.bonus_count>0&&<label>Bonus amount (optional)<input type="number" min="0" max="999999999999.99" step=".01" value={edit.bonus_amount??''} onChange={e=>setEdit({...edit,bonus_amount:e.target.value===''?null:Number(e.target.value)})}/></label>}
 <div className="ct-salary-actions"><button className="v9-primary" type="submit" disabled={pending}>Save</button><button className="v9-quiet-btn" type="button" disabled={pending} onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>:<>
 <div className="ct-salary-details"><p dir="auto">{row.rp_name||'—'}</p><p dir="auto">{row.rp_server||'—'}</p><p className="ct-client-id"><span>Client ID: {row.client_id?(revealed===a.id?row.client_id:'••••••••••••••••'):'—'}</span>{row.client_id&&<button type="button" className="ct-salary-icon-btn" aria-label={revealed===a.id?'Hide Client ID':'Show Client ID'} onClick={()=>setRevealed(v=>v===a.id?null:a.id)}>{revealed===a.id?<EyeOff size={16}/>:<Eye size={16}/>}</button>}</p></div>
 {row.bonus_count>0&&row.bonus_amount!==null&&<p className="ct-salary-amount">Bonus amount: {row.bonus_amount.toLocaleString('en-US',{maximumFractionDigits:2})}</p>}
 <div className="ct-salary-actions"><button className="v9-quiet-btn" type="button" disabled={pending||!!edit} onClick={()=>setEdit({...row})}><Edit3 size={15}/> Edit</button><button className="v9-quiet-btn" type="button" disabled={!salaryCopy(a.name,row)} onClick={()=>void copy(a,row)}><Copy size={15}/> Copy</button></div>
 <div className="ct-bonus-controls">{row.bonus_count===0?<button className="v9-quiet-btn ct-bonus-add" type="button" disabled={pending||!!edit} onClick={()=>void save(changeBonus(row,1))}><Gift size={16}/> Add Bonus</button>:<><button type="button" className="ct-salary-icon-btn" disabled={pending||!!edit||row.bonus_count<=1} aria-label="Decrease bonus" onClick={()=>void save(changeBonus(row,row.bonus_count-1))}><Minus size={16}/></button><strong>×{row.bonus_count}</strong><button type="button" className="ct-salary-icon-btn" disabled={pending||!!edit||row.bonus_count>=99} aria-label="Increase bonus" onClick={()=>void save(changeBonus(row,row.bonus_count+1))}><Plus size={16}/></button><button type="button" className="v9-quiet-btn" disabled={pending||!!edit} onClick={()=>void save(changeBonus(row,0))}><X size={14}/> Remove Bonus</button></>}</div>
 </>}
 </article>})}{!list.length&&<p className="ct-admin-empty">No matching profiles.</p>}
 </div>}
 </section>;
}
