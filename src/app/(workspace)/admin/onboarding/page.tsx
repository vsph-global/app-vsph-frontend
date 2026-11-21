import type {Metadata} from 'next';
import Link from 'next/link';
import {loadClientOnboardingCatalog} from '@/features/operations/client-onboarding-server';
import {ClientOnboardingWorkspace} from '@/features/operations/ClientOnboardingWorkspace';
import '../../admin-live.css';
export const metadata:Metadata={
 title:'Client onboarding | VSPH Control Center',
 robots:{index:false,follow:false}
};
export default async function ClientOnboardingPage(){
 const products=await loadClientOnboardingCatalog();
 if(!products)return <main className="workspace-content admin-live-workspace" id="mainContent">
   <h1>Client onboarding unavailable</h1>
   <p role="alert">Your platform owner permission or live product catalog
     could not be verified. No organization data was created.</p>
   <Link href="/admin">Return to administration</Link>
 </main>;
 return <ClientOnboardingWorkspace products={products}/>;
}
