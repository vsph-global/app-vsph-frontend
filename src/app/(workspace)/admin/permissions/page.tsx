import type {Metadata} from 'next';
import Link from 'next/link';
import {loadPermissionDirectory} from '@/features/operations/permission-server';
import {PermissionWorkspace} from '@/features/operations/PermissionWorkspace';
import '../../permissions-live.css';

export const metadata:Metadata={
 title:'Product roles & permissions | VSPH Control Center',
 robots:{index:false,follow:false}
};
type Filters={organizationId?:string|string[];afterId?:string|string[]};
export default async function PermissionsPage({searchParams}:{
 searchParams:Promise<Filters>;
}){
 const raw=await searchParams;
 const id=raw.organizationId===undefined?'':raw.organizationId;
 const afterId=raw.afterId===undefined?'':raw.afterId;
 if(typeof id!=='string'||typeof afterId!=='string'||
   (id!==''&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))||
   (afterId!==''&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(afterId)))
   return <main className="workspace-content permission-live-workspace" id="mainContent">
     <h1>Invalid organization filter</h1><Link href="/admin/permissions">Reset</Link>
   </main>;
 const loaded=await loadPermissionDirectory(afterId||null,id||null);
 if(!loaded)return <main className="workspace-content permission-live-workspace" id="mainContent">
   <h1>Permissions unavailable</h1>
   <p role="alert">Active platform-owner authorization or the organization role data could not be verified.</p>
   <Link href="/admin">Back to administration</Link>
 </main>;
 return <main className="workspace-content permission-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="permission-live-heading"><div>
     <h1>Roles & permissions</h1>
     <p>Organization-scoped product roles, independent of platform administration</p>
   </div><Link href="/admin">Administration</Link></header>
   <section className="permission-live-panel">
     <h2>Select a customer organization</h2>
     <p>Only platform owners can change these grants. A product role does not grant HR or
       platform administration access.</p>
     <div className="permission-live-orgs">
       {loaded.directory.rows.map(o=><Link
         key={o.id} href={'/admin/permissions?organizationId='+o.id}
         aria-current={o.id===id?'page':undefined}>
         {o.name} <small>{o.status}</small></Link>)}
       {!loaded.directory.rows.length&&<p>No organizations on this page.</p>}
     </div>
     <nav className="permission-live-pagination" aria-label="Organization pagination">
       {loaded.directory.nextId&&<Link href={'/admin/permissions?afterId='+loaded.directory.nextId}>Next organizations</Link>}
       {afterId&&<Link href="/admin/permissions">First organizations</Link>}
     </nav>
   </section>
   {loaded.organization?<PermissionWorkspace organization={loaded.organization}/>:<section className="permission-live-panel">
     <h2>Choose an organization</h2>
     <p>Choose a customer above to inspect its active members, application entitlements,
       and existing product-role assignments.</p>
   </section>}
 </main>;
}
