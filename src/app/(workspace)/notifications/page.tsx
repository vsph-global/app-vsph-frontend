import type {Metadata} from 'next';
import Link from 'next/link';
import {loadNotifications} from '@/features/operations/notification-server';
import {LiveNotificationWorkspace} from '@/features/operations/LiveNotificationWorkspace';
import '../notifications-live.css';
export const metadata:Metadata={
 title:'Notifications | VSPH Control Center',robots:{index:false,follow:false}
};
export default async function NotificationsPage(){
 const data=await loadNotifications();
 if(!data)return <main className="workspace-content notice-live-workspace" id="mainContent">
   <h1>Notifications unavailable</h1>
   <p role="alert">Your session, preferences or project inbox could not be verified.
     No previous notification records are displayed.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 return <LiveNotificationWorkspace {...data}/>;
}
