import type {Metadata} from 'next';
import ExecutiveCommand,{type Tab} from '@/components/v2/ExecutiveCommand';
import '@/components/v2/executive.css';
import '@/components/v2/executive-v7.css';
import '@/components/v2/executive-v8.css';

export const metadata:Metadata={
 title:'CHICO GENERAL TEAM — إدارة الفريق',
 description:'CHICO Elite Administration Suite · approved visual direction · preview review'
};
export const dynamic='force-dynamic';
export default async function ExecutivePreview({searchParams}:{searchParams:Promise<{review?:string;tab?:string}>}){
 const q=await searchParams;
 // Preview is a read-only visual environment until a separate test database is provisioned.
 // Never allow ?review=1 to bypass the production login screen.
 const isPreview=process.env.VERCEL_ENV==='preview';
 const tabs:Tab[]=['dashboard','team','operations','updates','excel','server','reports','weeks','alerts','settings'];
 const initialTab=tabs.find(t=>t===q.tab)||'dashboard';
 return <ExecutiveCommand initialTab={initialTab} review={(isPreview&&q.review!=='live')||(process.env.NODE_ENV==='development'&&q.review==='1')}/>;
}
