import type {Metadata} from 'next';
import Link from 'next/link';
import {loadProvisioningQueue} from '@/features/operations/provisioning-server';
import {ProvisioningRecoveryWorkspace} from '@/features/operations/ProvisioningRecoveryWorkspace';
import '../../admin-live.css';

export const metadata:Metadata={
  title:'Provisioning recovery | VSPH Control Center',
  robots:{index:false,follow:false}
};
export default async function ProvisioningPage(){
 const jobs=await loadProvisioningQueue();
 if(jobs===null)return <main className="workspace-content admin-live-workspace" id="mainContent">
   <h1>Provisioning recovery unavailable</h1>
   <p role="alert">Your platform owner access or provisioning queue could not be verified.</p>
   <Link href="/admin">Back to administration</Link>
 </main>;
 return <ProvisioningRecoveryWorkspace jobs={jobs}/>;
}
