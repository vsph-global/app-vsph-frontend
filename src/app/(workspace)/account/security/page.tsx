import type {Metadata} from 'next';
import Link from 'next/link';
import {loadOwnSessions} from '@/features/operations/account-server';
import {SessionWorkspace} from '@/features/operations/SessionWorkspace';
import '../../account-live.css';
export const metadata:Metadata={title:'Account security | VSPH Control Center',
 robots:{index:false,follow:false}};
export default async function AccountSecurityPage(){
 const sessions=await loadOwnSessions();
 if(!sessions)return <main className="workspace-content account-live-workspace" id="mainContent">
   <h1>Your sessions are unavailable</h1>
   <p role="alert">Your active session or current session list could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 return <SessionWorkspace sessions={sessions}/>;
}
