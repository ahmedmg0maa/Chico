'use client';
import WorkflowStatus from '../nexus/WorkflowStatus';
import {useEffect,useState,useRef} from 'react';
import {BookOpen,Film,Play,Upload} from 'lucide-react';
import {LESSONS} from '@/lib/academy';
import RulebookCards from './RulebookCards';
import './rulebook.css';
import {CommandIcon} from './ChicoVisualLanguage';
type LessonId=typeof LESSONS[number]['id'];
type Media={lesson:LessonId;mime:string;total_bytes:number};
const CHUNK=1048576;
export default function AcademyCenter({review}:{review:boolean}){
 const [tab,setTab]=useState<'rules'|'videos'>('rules'),[error,setError]=useState('');
 const [media,setMedia]=useState<Media[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>(review?'ready':'loading'),[selected,setSelected]=useState<LessonId>('jail'),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0);
 const input=useRef<HTMLInputElement>(null);
 async function load(){if(review)return;setStatus('loading');try{const r=await fetch('/api/academy',{credentials:'same-origin',cache:'no-store'}),v=await r.json();if(!r.ok||!v.ok||!Array.isArray(v.items))throw Error();setMedia(v.items);setStatus('ready');}catch{setStatus('error');}}
 useEffect(()=>{void load();},[review]);
 const lesson=LESSONS.find(l=>l.id===selected)!;
 const ready=media.some(m=>m.lesson===selected);
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
 <header className="ct-admin-head"><div className="ct-workspace-identity"><CommandIcon name="academy"/><div><h1>CHICO Academy</h1></div></div></header>
 <nav className="ct-academy-tabs" aria-label="مركز التدريب"><button type="button" aria-pressed={tab==='rules'} onClick={()=>{setTab('rules');setError('')}}><BookOpen size={18}/> دليل العقوبات</button><button type="button" aria-pressed={tab==='videos'} onClick={()=>{setTab('videos');setError('')}}><Film size={18}/> الفيديوهات التدريبية</button></nav>
 {error&&<p className="v9-warning" role="alert">{error}</p>}
 {tab==='rules'?<RulebookCards/>:<div className="ct-academy-lessons">
 <div className="ct-lesson-select">{LESSONS.map(l=><button type="button" aria-pressed={selected===l.id} key={l.id} disabled={busy} onClick={()=>{setSelected(l.id);setError('')}}><span className={'ct-lesson-symbol ct-kind-'+(l.id==='jail-2'?'jail':l.id)}><Play size={23}/></span><div><b>{l.title}</b><small dir="ltr">{l.example}</small><small className="nx-lesson-state" data-ready={status==='ready'&&!review&&media.some(m=>m.lesson===l.id)}>{review?'معاينة':status!=='ready'?'الحالة غير متاحة':media.some(m=>m.lesson===l.id)?'الفيديو متاح':'بانتظار الرفع'}</small></div></button>)}</div>
 <article className="ct-admin-card ct-lesson-view"><h2>{lesson.title}</h2>
 {busy&&<WorkflowStatus tone="working" title={progress===100?'جارٍ اعتماد الملف على الخادم':'جارٍ رفع الفيديو'} detail={progress+'%'}><progress value={progress} max={100} aria-label="نسبة رفع الفيديو"/></WorkflowStatus>}
 {ready?<video controls playsInline preload="metadata" key={selected+'-'+version} src={'/api/academy/media/'+selected} onError={()=>setError('تعذر تشغيل هذا الملف. صيغة MP4 (H.264) هي الأكثر توافقًا.')}/>:<div className="ct-video-empty"><Film size={40}/><b>{review?'المشغل متاح داخل الجلسة الإدارية':status==='loading'?'جارٍ تحميل حالة الدرس':status==='error'?'حالة الفيديو غير متاحة':'لم يتم رفع الفيديو بعد'}</b><small>{lesson.source}</small></div>}
 {status==='error'&&<p role="alert">تعذر تحميل مكتبة الفيديو.</p>}
 {!review&&<div className="ct-upload-row"><input ref={input} type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/><button type="button" className="v9-primary" disabled={busy||status!=='ready'} onClick={()=>input.current?.click()}><Upload size={17}/> {busy?'جاري الرفع '+progress+'%':ready?'استبدال الفيديو':'رفع الفيديو'}</button><small>MP4 موصى به · حتى 50 MB</small></div>}
 {review&&<small>معاينة فقط — لا اتصال بمكتبة الفيديو الحية.</small>}
 <h3>خطوات التطبيق</h3><ol className="ct-lesson-steps">{lesson.steps.map(s=><li key={s}>{s}</li>)}</ol><small>مرجع الدرس: {lesson.source}. راجع دليل العقوبات المعتمد قبل التطبيق.</small>
 </article></div>}
 </section>
}
