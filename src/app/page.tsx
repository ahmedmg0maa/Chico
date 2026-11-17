import type {Metadata} from 'next';
import ExecutiveCommand from '@/components/v2/ExecutiveCommand';
// Share the complete responsive design system with /v2, including mobile poster scrolling.
import '@/components/v2/executive-unified.css';

export const metadata:Metadata={title:'CHICO TEAM | مركز إدارة الفريق',description:'ONE STATE RP · CHICO TEAM — إدارة الفريق والقراءات والتقارير'};
export const dynamic='force-dynamic';
// The actual team is loaded only through the authenticated server API.
export default function Home(){return <ExecutiveCommand review={false}/>;}
