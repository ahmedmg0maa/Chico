import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import DashboardWeekDemo from '@/components/v2/DashboardWeekDemo';
import '@/components/v2/executive-unified.css';

export const metadata:Metadata={title:'CHICO — معاينة الأسبوع الجديد'};
export const dynamic='force-dynamic';

export default function Page(){
 // Demo must never expose sample statistics through the production website.
 if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV!=='development')notFound();
 return <DashboardWeekDemo/>;
}
