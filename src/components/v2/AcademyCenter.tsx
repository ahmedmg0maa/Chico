'use client';
import {useEffect,useState,useRef} from 'react';
import {BookOpen,Film,LockKeyhole,MicOff,ShieldBan,LogOut,Search,Copy,Play,Upload,Check,ShieldAlert,ChevronDown} from 'lucide-react';
import {RULES,LESSONS,permission,type Kind,type TrainingRank} from '@/lib/academy';
import {CommandIcon} from './ChicoVisualLanguage';
const kinds:Kind[]=['Jail','Mute','Ban','Kick'];
const icons={Jail:LockKeyhole,Mute:MicOff,Ban:ShieldBan,Kick:LogOut};
const ranks:TrainingRank[]=['Helper','SN.Helper','Moderator'];
type LessonId=typeof LESSONS[number]['id'];
type Media={lesson:LessonId;mime:string;total_bytes:number};
const CHUNK=1048576;
export default function AcademyCenter({review}:{review:boolean}){
 const [tab,setTab]=useState<'rules'|'videos'>('rules'),[rank,setRank]=useState<TrainingRank>('Helper'),[kind,setKind]=useState<Kind|'all'>('all'),[q,setQ]=useState(''),[allowed,setAllowed]=useState(false),[copied,setCopied]=useState(''),[error,setError]=useState('');
 const [media,setMedia]=useState<Media[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>(review?'ready':'loading'),[selected,setSelected]=useState<LessonId>('jail'),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0);
 const input=useRef<HTMLInputElement>(null);
 async function load(){if(review)return;setStatus('loading');try{const r=await fetch('/api/academy',{credentials:'same-origin',cache:'no-store'}),v=await r.json();if(!r.ok||!v.ok||!Array.isArray(v.items))throw Error();setMedia(v.items);setStatus('ready');}catch{setStatus('error');}}
 useEffect(()=>{void load();},[review]);
 const rows=RULES.filter(r=>(kind==='all'||kind===r.kind)&&(!allowed||permission(r,rank)!=='restricted')&&[r.code,r.name,r.arabic,r.note].join(' ').toLowerCase().includes(q.trim().toLowerCase()));
 const lesson=LESSONS.find(l=>l.id===selected)!;
 const ready=media.some(m=>m.lesson===selected);
 async function copy(code:string){try{await navigator.clipboard.writeText(code);setCopied(code);setError('');}catch{setError('تعذر النسخ.');}}
 async function upload(file:File){if(review||busy||status!=='ready')return;
 const ext=file.name.toLowerCase().split('.').pop(),mime=ext==='mp4'?'video/mp4':ext==='webm'?'video/webm':ext==='mov'?'video/quicktime':'';
 if(!mime||file.size<1||file.size>50*CHUNK){setError('اختر MP4 أو WebM أو MOV بحجم لا يتجاوز 50 MB.');return;}
 setBusy(true);setProgress(0);setError('');
 try{const post=async(body:unknown)=>{const r=await fetch('/api/academy',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const v=await r.json();if(!r.ok||!v.ok)throw Error();return v;};
 const {id}=await post({action:'start',lesson:selected,mime,size:file.size});
 for(let offset=0;offset<file.size;offset+=CHUNK){const r=await fetch('/api/academy?id='+encodeURIComponent(id)+'&idx='+offset/CHUNK,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:file.slice(offset,Math.min(file.size,offset+CHUNK))});if(!r.ok)throw Error();setProgress(Math.floor(Math.min(file.size,offset+CHUNK)/file.size*100));}
 await post({action:'finish',id});setVersion(v=>v+1);await load();
 }catch{setError('تعذر رفع الفيديو. الملف السابق، إن وجد، يظل محفوظًا.');}finally{setBusy(false);if(input.current)input.current.value='';}
 }
 return <section className="ct-admin-studio ct-academy" dir="rtl">
 <header className="ct-admin-head"><div className="ct-workspace-identity"><CommandIcon name="academy"/><div><h1>CHICO Academy</h1><p>مركز التدريب ودليل العقوبات</p></div></div></header>
 <nav className="ct-academy-tabs" aria-label="مركز التدريب"><button type="button" aria-pressed={tab==='rules'} onClick={()=>{setTab('rules');setError('')}}><BookOpen size={18}/> دليل العقوبات</button><button type="button" aria-pressed={tab==='videos'} onClick={()=>{setTab('videos');setError('')}}><Film size={18}/> الفيديوهات التدريبية</button></nav>
 {error&&<p className="v9-warning" role="alert">{error}</p>}
 {tab==='rules'?<>
 <div className="ct-academy-kinds">{kinds.map(k=>{const Icon=icons[k];return <button key={k} type="button" className={'ct-academy-kind ct-kind-'+k.toLowerCase()} aria-pressed={kind===k} onClick={()=>setKind(v=>v===k?'all':k)}><Icon size={24}/><span>{k}</span><strong>{RULES.filter(r=>r.kind===k).length}</strong></button>})}</div>
 <div className="ct-academy-role"><span>صلاحيات الرتبة</span><div>{ranks.map(r=><button type="button" key={r} aria-pressed={rank===r} onClick={()=>setRank(r)}>{r}</button>)}</div><label><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)}/> المسموح فقط</label></div>
 <div className="ct-academy-notice"><ShieldAlert size={17}/><span>Kick يتطلب دليلًا واضحًا لجميع الرتب. الحظر الدائم وحظر الجهاز خارج صلاحيات الرتب الثلاث.</span></div>
 <div className="ct-academy-search"><Search size={18}/><input aria-label="بحث في العقوبات" placeholder="ابحث بالكود أو الاسم أو المخالفة…" value={q} onChange={e=>setQ(e.target.value)}/><span>{rows.length} / {RULES.length}</span></div>
 <div className="ct-academy-table"><table><thead><tr><th>Code</th><th>المخالفة</th><th>العقوبة</th><th>الصلاحية</th></tr></thead><tbody>{rows.map(r=>{const p=permission(r,rank);return <tr key={r.code}><td><div className="ct-rule-code"><b dir="ltr">{r.code}</b><button type="button" title={'Copy '+r.code} aria-label={'Copy '+r.code} onClick={()=>void copy(r.code)}>{copied===r.code?<Check size={15}/>:<Copy size={15}/>}</button></div></td><td><strong dir="ltr">{r.name}</strong><span>{r.arabic}</span>{r.note&&<small>{r.note}</small>}</td><td><b className={'ct-kind-'+r.kind.toLowerCase()} dir="ltr">{r.kind} · {r.duration}</b></td><td><span className={'ct-permission '+p}>{p==='restricted'?'رفع للرتبة المختصة':p==='evidence'?'بدليل واضح':'مسموح'}</span></td></tr>})}</tbody></table>{!rows.length&&<p className="ct-admin-empty">لا توجد مخالفات مطابقة.</p>}</div>
 </>:<div className="ct-academy-lessons">
 <div className="ct-lesson-select">{LESSONS.map(l=><button type="button" aria-pressed={selected===l.id} key={l.id} disabled={busy} onClick={()=>{setSelected(l.id);setError('')}}><span className={'ct-lesson-symbol ct-kind-'+l.id}><Play size={23}/></span><div><b>{l.title}</b><small dir="ltr">{l.example}</small></div></button>)}</div>
 <article className="ct-admin-card ct-lesson-view"><h2>{lesson.title}</h2>
 {ready?<video controls playsInline preload="metadata" key={selected+'-'+version} src={'/api/academy/media/'+selected} onError={()=>setError('تعذر تشغيل هذا الملف. صيغة MP4 (H.264) هي الأكثر توافقًا.')}/>:<div className="ct-video-empty"><Film size={40}/><b>لم يتم رفع الفيديو بعد</b><small>{lesson.source}</small></div>}
 {status==='error'&&<p role="alert">تعذر تحميل مكتبة الفيديو.</p>}
 {!review&&<div className="ct-upload-row"><input ref={input} type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/><button type="button" className="v9-primary" disabled={busy||status!=='ready'} onClick={()=>input.current?.click()}><Upload size={17}/> {busy?'جاري الرفع '+progress+'%':ready?'استبدال الفيديو':'رفع الفيديو'}</button><small>MP4 موصى به · حتى 50 MB</small></div>}
 {review&&<small>معاينة فقط — لا اتصال بمكتبة الفيديو الحية.</small>}
 <h3>خطوات التطبيق</h3><ol className="ct-lesson-steps">{lesson.steps.map(s=><li key={s}>{s}</li>)}</ol><small>مرجع الدرس: {lesson.source}. راجع دليل العقوبات المعتمد قبل التطبيق.</small>
 </article></div>}
 </section>
}
