import type {Metadata} from 'next';
import Link from 'next/link';
import {loadCustomerList} from '@/features/operations/customer-server';
import '../../customers-live.css';
export const metadata:Metadata={
 title:'Customers | VSPH Control Center',robots:{index:false,follow:false}
};
type Filters={afterId?:string|string[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function CustomersPage({searchParams}:{searchParams:Promise<Filters>}){
 const params=await searchParams;
 const afterId=params.afterId===undefined?'':params.afterId;
 if(typeof afterId!=='string'||(afterId!==''&&!uuid.test(afterId)))
   return <main className="workspace-content customer-live-workspace">
     <h1>Invalid directory cursor</h1><Link href="/admin/customers">Reset</Link>
   </main>;
 const page=await loadCustomerList(afterId||null);
 if(!page)return <main className="workspace-content customer-live-workspace" id="mainContent">
   <h1>Customers unavailable</h1><p role="alert">
     Your platform administration permission or customer service could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 return <main className="workspace-content customer-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="customer-live-heading"><div><h1>Customer directory</h1>
     <p>Platform-owner authorized organizations. No cross-customer sharing.</p></div>
     <Link href="/admin/customers">Refresh</Link></header>
   <section className="customer-live-panel">
     <div className="customer-live-table" tabIndex={0} role="region"
       aria-label="Organization directory">
       <table><thead><tr><th>Organization</th><th>Slug</th><th>Lifecycle</th></tr></thead>
         <tbody>{page.rows.map(o=><tr key={o.id}>
           <td><Link href={'/admin/customers/'+o.id}>{o.name}</Link></td>
           <td>{o.slug}</td><td>{o.status}</td>
         </tr>)}</tbody>
       </table>
       {!page.rows.length&&<p>No customer organizations on this page.</p>}
     </div>
     <nav className="customer-live-pagination" aria-label="Customer pagination">
       <span>{page.rows.length} organizations on this page</span>
       {page.nextId&&<Link href={'/admin/customers?afterId='+page.nextId}>
         Next organizations</Link>}
       {afterId&&<Link href="/admin/customers">First page</Link>}
     </nav>
   </section>
 </main>;
}
