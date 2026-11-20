'use client';

import {useEffect,useRef,useState} from 'react';
import {loadLuxuryArt,renderLuxuryPoster,type LuxuryPosterRow} from './PremiumPosterRenderer';

// Original CHICO 30-row Excel source fixture: 26 evaluated members, 2026-11-09..12.
// Never used in production statistics, rankings or real team reports.
const SAMPLE:LuxuryPosterRow[] = [
 {
  "id": "1",
  "name": "Ahmedd",
  "rank": "Helper",
  "order": 2,
  "tickets": 52,
  "flags": 5,
  "rating": 4.63,
  "flagsIncomplete": false
 },
 {
  "id": "2",
  "name": "Bieso",
  "rank": "Helper",
  "order": 3,
  "tickets": 147,
  "flags": 3,
  "rating": 4.92,
  "flagsIncomplete": false
 },
 {
  "id": "3",
  "name": "Coconot",
  "rank": "Helper",
  "order": 4,
  "tickets": 60,
  "flags": 2,
  "rating": 4.86,
  "flagsIncomplete": false
 },
 {
  "id": "4",
  "name": "SN.Gaby",
  "rank": "SN.Helper",
  "order": 5,
  "tickets": 133,
  "flags": 3,
  "rating": 4.9,
  "flagsIncomplete": false
 },
 {
  "id": "5",
  "name": "SN.Gehad",
  "rank": "SN.Helper",
  "order": 6,
  "tickets": 127,
  "flags": 1,
  "rating": 4.93,
  "flagsIncomplete": false
 },
 {
  "id": "6",
  "name": "Kararr",
  "rank": "Helper",
  "order": 7,
  "tickets": 3,
  "flags": 0,
  "rating": 5,
  "flagsIncomplete": false
 },
 {
  "id": "7",
  "name": "Kyrlous",
  "rank": "Helper",
  "order": 8,
  "tickets": 2,
  "flags": 0,
  "rating": 5,
  "flagsIncomplete": false
 },
 {
  "id": "8",
  "name": "Leogirl",
  "rank": "Helper",
  "order": 9,
  "tickets": 97,
  "flags": 0,
  "rating": 4.95,
  "flagsIncomplete": false
 },
 {
  "id": "9",
  "name": "Mohamad",
  "rank": "Helper",
  "order": 10,
  "tickets": 50,
  "flags": 0,
  "rating": 5,
  "flagsIncomplete": false
 },
 {
  "id": "10",
  "name": "SN.Moody",
  "rank": "SN.Helper",
  "order": 11,
  "tickets": 25,
  "flags": 0,
  "rating": 4.96,
  "flagsIncomplete": false
 },
 {
  "id": "11",
  "name": "Nsnas",
  "rank": "Helper",
  "order": 12,
  "tickets": 26,
  "flags": 1,
  "rating": 4.92,
  "flagsIncomplete": false
 },
 {
  "id": "12",
  "name": "Pot",
  "rank": "Helper",
  "order": 13,
  "tickets": 21,
  "flags": 0,
  "rating": 4.8,
  "flagsIncomplete": false
 },
 {
  "id": "13",
  "name": "Rare",
  "rank": "Helper",
  "order": 14,
  "tickets": 201,
  "flags": 2,
  "rating": 4.94,
  "flagsIncomplete": false
 },
 {
  "id": "14",
  "name": "Shahd",
  "rank": "Helper",
  "order": 15,
  "tickets": 68,
  "flags": 1,
  "rating": 4.85,
  "flagsIncomplete": false
 },
 {
  "id": "15",
  "name": "SN.Sherlock",
  "rank": "SN.Helper",
  "order": 16,
  "tickets": 73,
  "flags": 0,
  "rating": 5,
  "flagsIncomplete": false
 },
 {
  "id": "16",
  "name": "Me",
  "rank": "Helper",
  "order": 17,
  "tickets": 77,
  "flags": 4,
  "rating": 4.63,
  "flagsIncomplete": false
 },
 {
  "id": "17",
  "name": "M.Alhassan",
  "rank": "Moderator",
  "order": 18,
  "tickets": 65,
  "flags": 1,
  "rating": 4.83,
  "flagsIncomplete": false
 },
 {
  "id": "18",
  "name": "M.Bish",
  "rank": "Moderator",
  "order": 19,
  "tickets": 56,
  "flags": 4,
  "rating": 4.71,
  "flagsIncomplete": false
 },
 {
  "id": "19",
  "name": "M.Bnammoo",
  "rank": "Moderator",
  "order": 20,
  "tickets": 355,
  "flags": 7,
  "rating": 4.87,
  "flagsIncomplete": false
 },
 {
  "id": "20",
  "name": "M.Dark",
  "rank": "Moderator",
  "order": 21,
  "tickets": 225,
  "flags": 5,
  "rating": 4.87,
  "flagsIncomplete": false
 },
 {
  "id": "21",
  "name": "M.Darklight",
  "rank": "Moderator",
  "order": 22,
  "tickets": 155,
  "flags": 0,
  "rating": 4.99,
  "flagsIncomplete": false
 },
 {
  "id": "22",
  "name": "M.Elyas",
  "rank": "Moderator",
  "order": 23,
  "tickets": 201,
  "flags": 1,
  "rating": 4.94,
  "flagsIncomplete": false
 },
 {
  "id": "23",
  "name": "M.Gambul",
  "rank": "Moderator",
  "order": 24,
  "tickets": 603,
  "flags": 4,
  "rating": 4.95,
  "flagsIncomplete": false
 },
 {
  "id": "24",
  "name": "M.Haitham",
  "rank": "Moderator",
  "order": 25,
  "tickets": 95,
  "flags": 2,
  "rating": 4.9,
  "flagsIncomplete": false
 },
 {
  "id": "25",
  "name": "M.Sirbos",
  "rank": "Moderator",
  "order": 26,
  "tickets": 85,
  "flags": 1,
  "rating": 4.95,
  "flagsIncomplete": false
 },
 {
  "id": "26",
  "name": "M.Zeroo",
  "rank": "Moderator",
  "order": 27,
  "tickets": 220,
  "flags": 3,
  "rating": 4.93,
  "flagsIncomplete": false
 }
];

export default function PrestigePosterDemo(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   const art=await Promise.all([
    loadLuxuryArt('/assets/chico-command-mark.webp'),
    loadLuxuryArt('/assets/banners/reports.webp')
   ]);
   await document.fonts?.ready;
   if(cancelled||!canvas.current)return;
   renderLuxuryPoster(canvas.current,SAMPLE,'2026-11-09 — 2026-11-12',30,29,art,
    'إحصائيات الفترة المحددة',{tickets:3222,flags:50,rating:null});
   setReady(true);
  })().catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'تعذّر رسم المعاينة');});
  return ()=>{cancelled=true};
 },[]);
 const download=()=>{
  if(!canvas.current||!ready)return;
  canvas.current.toBlob(blob=>{
   if(!blob){setError('تعذّر إنشاء PNG');return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='CHICO_Approved_Prestige_Demo_2026-11-09_12.png';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/png');
 };
 return <main className="chico-v2" dir="rtl" style={{minHeight:'100vh',background:'#070608',color:'#f6edcf',padding:'22px 14px 55px'}}>
  <section style={{maxWidth:1150,margin:'0 auto'}}>
   <header style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18}}>
    <div><h1 style={{margin:'0 0 7px',fontSize:23}}>معاينة تصميم CHICO الجديد</h1>
     <p style={{margin:0,fontSize:13,color:'#d5ba86'}}>معاينة ببيانات ملف الاختبار المحفوظ • ليست تقريرًا مباشرًا ولا تغيّر بيانات الفريق</p></div>
    <button type="button" disabled={!ready} onClick={download}
     style={{padding:'12px 20px',borderRadius:9,background:'#d6a44c',color:'#17100a',fontWeight:850,opacity:ready?1:.5,cursor:ready?'pointer':'not-allowed',border:0}}>
     تنزيل صورة الاختبار PNG</button>
   </header>
   {error&&<p role="alert">{error}</p>}
   <div className="v9-poster-preview" role="region" aria-label="معاينة تقرير CHICO مع تمرير أفقي على الهاتف"
    style={{overflowX:'auto',width:'100%',maxWidth:'100%',display:'flex',justifyContent:'flex-start',padding:8,background:'#130a0b',border:'1px solid #b98539',borderRadius:12}}>
    <canvas ref={canvas} role="img" aria-label="تقرير CHICO التجريبي للفترة 9 إلى 12 نوفمبر 2026"
     style={{display:'block',width:'1100px',minWidth:'880px',maxWidth:'none',height:'auto'}} />
   </div>
  </section>
 </main>;
}
