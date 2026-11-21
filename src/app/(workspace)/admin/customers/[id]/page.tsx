import type {Metadata} from 'next';
import Link from 'next/link';
import {loadCustomerDetail} from '@/features/operations/customer-server';
import {CustomerMemberWorkspace} from '@/features/operations/CustomerMemberWorkspace';
import '../../../customers-live.css';
export const metadata:Metadata={
 title:'Customer organization | VSPH Control Center',robots:{index:false,follow:false}
};
export default async function CustomerPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,detail=await loadCustomerDetail(id);
 if(!detail)return <main className="workspace-content customer-live-workspace" id="mainContent">
   <h1>Customer unavailable</h1><p role="alert">
     Your permission or this organization could not be verified.</p>
   <Link href="/admin/customers">Back to customer directory</Link>
 </main>;
 return <CustomerMemberWorkspace customer={detail}/>;
}
