import type {Metadata} from 'next';
import ExecutiveCommand from '@/components/v2/ExecutiveCommand';
import '@/components/v2/executive.css';

export const metadata:Metadata={
 title:'CHICO GENERAL TEAM — Executive Preview',
 description:'CHICO Elite Administration Suite · approved visual direction · preview review'
};
export const dynamic='force-dynamic';
export default async function ExecutivePreview({searchParams}:{searchParams:Promise<{review?:string}>}){
 const q=await searchParams;
 // Preview is a read-only visual environment until a separate test database is provisioned.
 // Never allow ?review=1 to bypass the production login screen.
 const isPreview=process.env.VERCEL_ENV==='preview';
 return <ExecutiveCommand review={(isPreview&&q.review!=='live')||(process.env.NODE_ENV==='development'&&q.review==='1')}/>;
}
