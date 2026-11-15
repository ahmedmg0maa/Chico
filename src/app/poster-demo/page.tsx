import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import PrestigePosterDemo from '@/components/v2/PrestigePosterDemo';
import '@/components/v2/executive-unified.css';

export const metadata:Metadata={title:'CHICO — معاينة تقرير Discord'};
export const dynamic='force-dynamic';
export default function PosterDemoPage(){
 // Keep the fixture-only illustration out of the live production site.
 if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV!=='development')notFound();
 return <PrestigePosterDemo/>;
}
