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
 return <ExecutiveCommand review={q.review==='1'}/>;
}
