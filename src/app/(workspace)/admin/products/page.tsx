import type {Metadata} from 'next';
import Link from 'next/link';
import {loadProductDirectory} from '@/features/operations/product-registry-server';
import '../../product-registry-live.css';
export const metadata:Metadata={title:'Product registry | VSPH Control Center',
  robots:{index:false,follow:false}};
type Filters={afterCode?:string|string[]};
export default async function ProductRegistryPage({searchParams}:{
 searchParams:Promise<Filters>;
}){
 const raw=await searchParams;
 const afterCode=raw.afterCode===undefined?'':raw.afterCode;
 if(typeof afterCode!=='string'||(afterCode!==''&&
   !/^[A-Z][A-Z0-9_]{1,39}$/.test(afterCode)))
   return <main className="workspace-content product-live-workspace" id="mainContent">
     <h1>Invalid registry cursor</h1><Link href="/admin/products">First page</Link>
   </main>;
 const data=await loadProductDirectory(afterCode||null);
 if(!data)return <main className="workspace-content product-live-workspace" id="mainContent">
   <h1>Product registry unavailable</h1>
   <p role="alert">Your active platform-owner access or the registry backend could not be verified.</p>
   <Link href="/admin">Return to administration</Link>
 </main>;
 return <main className="workspace-content product-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="product-live-heading">
     <div><h1>Product registry</h1><p>Owner-governed VSPH product catalog and integration metadata</p></div>
     <div className="product-live-actions">
       <Link href="/admin/products/new">Register product</Link>
       <Link href="/admin/products">Refresh</Link>
     </div>
   </header>
   <section className="product-live-panel">
     <h2>Registered applications</h2>
     <p>Only configuration metadata is shown. An enabled application is not proof
       of a working external integration.</p>
     <div className="product-live-table" role="region" tabIndex={0}
       aria-label="Registered application products">
       <table><thead><tr>{['Product','Lifecycle','Visibility','Integration','Readiness','Manage']
         .map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
         <tbody>{data.items.map(p=><tr key={p.id}>
           <td><strong>{p.name}</strong><small>{p.code}</small></td>
           <td>{p.status}</td><td>{p.visibility}</td><td>{p.integrationMode.replace('_',' ')}</td>
           <td><strong>{p.readiness.state}</strong>
             <small>{p.readiness.verified?'Verified':'Not externally verified'}</small></td>
           <td><Link href={'/admin/products/'+p.id}>Manage product</Link></td>
         </tr>)}</tbody></table>
       {!data.items.length&&<p>No registered products on this page.</p>}
     </div>
     <nav className="product-live-pagination" aria-label="Product pagination">
       <span>{data.items.length} products on this page (maximum 100)</span>
       {data.nextCode&&<Link href={'/admin/products?afterCode='+data.nextCode}>Next products</Link>}
       {afterCode&&<Link href="/admin/products">First page</Link>}
     </nav>
   </section>
 </main>;
}
