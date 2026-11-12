import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'CHICO · General Team',description:'OneState · CHICO ME — Private Administration Command Center',icons:{icon:'/assets/chico-wolf-safe-192.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" suppressHydrationWarning><body>{children}</body></html>;}
