import type {Metadata} from 'next';
import Link from 'next/link';
import {loadOwnProfile} from '@/features/operations/account-server';
import {ProfileWorkspace} from '@/features/operations/ProfileWorkspace';
import '../../account-live.css';
export const metadata:Metadata={title:'Your profile | VSPH Control Center',
 robots:{index:false,follow:false}};
export default async function AccountProfilePage(){
 const profile=await loadOwnProfile();
 if(!profile)return <main className="workspace-content account-live-workspace" id="mainContent">
   <h1>Your profile is unavailable</h1>
   <p role="alert">Your active session or current profile record could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 return <ProfileWorkspace profile={profile}/>;
}
