import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {EmployeeOnboardForm} from '@/features/operations/EmployeeOnboardForm';
import '../../employees-live.css';
export const metadata:Metadata={
 title:'Onboard employee | VSPH Control Center',robots:{index:false,follow:false}
};
export default async function EmployeeOnboardPage(){
 const result=await portalApi('/api/employees/access');
 if(result.kind==='unauthorized')redirect('/login');
 const value=result.kind==='ok'&&result.value&&typeof result.value==='object'&&
   !Array.isArray(result.value)?result.value as Record<string,unknown>:null;
 if(!value||!['owner','hr'].includes(String(value.role))||
   typeof value.canManageHr!=='boolean')return <main className="workspace-content employee-live-workspace"
   id="mainContent">
     <h1>Employee onboarding unavailable</h1>
     <p role="alert">Your current workforce management permission could not be verified.</p>
     <Link href="/employees">Return to employee directory</Link>
   </main>;
 return <EmployeeOnboardForm/>;
}
