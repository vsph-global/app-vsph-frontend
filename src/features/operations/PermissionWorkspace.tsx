'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';
import type {PermissionContext} from './PermissionLiveContract';

export function PermissionWorkspace({organization}:{organization:PermissionContext}){
 const router=useRouter();
 const [userId,setUserId]=useState('');
 const [applicationId,setApplicationId]=useState('');
 const [role,setRole]=useState('__choose__');
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const available=organization.status==='active';
 const members=organization.members.filter(x=>x.status==='active'&&x.accountStatus==='active');
 const products=organization.products.filter(p=>p.status==='active'&&
   p.accessStatus==='enabled'&&p.supportedRoles.length>0);
 const selectedMember=members.find(m=>m.userId===userId);
 const selectedProduct=products.find(p=>p.id===applicationId);
 const existing=organization.grants.find(g=>g.userId===userId&&
   g.applicationId===applicationId);
 const roles=selectedProduct?.supportedRoles.filter(r=>r!=='staff'&&r!=='musician'||
   selectedProduct.code==='MUSIC')??[];
 const roleSupported=role!==''&&roles.includes(role);
 const validChoice=!!selectedMember&&!!selectedProduct&&
   (roleSupported||(role===''&&!!existing))&&
   (role!==existing?.role)&&confirmed&&available;
 function selectMember(value:string){setUserId(value);setRole('__choose__');
   setConfirmed(false);setError('');setNotice('');}
 function selectProduct(value:string){setApplicationId(value);setRole('__choose__');
   setConfirmed(false);setError('');setNotice('');}
 async function save(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(!validChoice||busy||!selectedMember||!selectedProduct)return;
   setBusy(true);setError('');setNotice('');
   try{
     const response=await fetch('/api/product-role/'+organization.id,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({
         userId:selectedMember.userId,applicationId:selectedProduct.id,
         version:selectedMember.version,role
       })
     });
     if(response.status===401){router.replace('/login');return;}
     if(!response.ok){
       const value:unknown=await response.json().catch(()=>null);
       const message=value&&typeof value==='object'&&'message' in value&&
         typeof value.message==='string'?value.message:
         'Role update was not confirmed. Reload current membership state.';
       setError(message);return;
     }
     setNotice('Product role changed and audited. Existing application sessions were invalidated.');
     setConfirmed(false);setRole('__choose__');
     router.refresh();
   }catch{setError('Role update status is uncertain. Reload and review before retrying.');}
   finally{setBusy(false);}
 }
 return <>
   <section className="permission-live-panel">
     <header className="permission-live-section">
       <div><h2>{organization.name}</h2><p>Organization state: {organization.status}</p></div>
       <Link href={'/admin/customers/'+organization.id}>Customer details</Link>
     </header>
     <div className="permission-live-metrics">
       <div><strong>{organization.members.length}</strong><span>Memberships shown</span></div>
       <div><strong>{organization.products.length}</strong><span>Products shown</span></div>
       <div><strong>{organization.grants.length}</strong><span>Grants shown</span></div>
     </div>
     <p>Organization membership is not a product grant. Product roles do not
       create HR or platform-admin permissions. Revoking a product role ends
       affected application sessions and launch codes.</p>
   </section>
   <section className="permission-live-panel">
     <h2>Existing product-role grants</h2>
     <div className="permission-live-table" tabIndex={0} role="region"
       aria-label="Current organization product roles">
       <table><thead><tr>{['Member','Application','Product role'].map(x=>
         <th key={x} scope="col">{x}</th>)}</tr></thead>
         <tbody>{organization.grants.map(g=>{
           const user=organization.members.find(m=>m.userId===g.userId);
           const product=organization.products.find(p=>p.id===g.applicationId);
           return <tr key={g.userId+':'+g.applicationId}>
             <td>{user?.name||'Former member'}
               <small>{user?.email||'Identity not in bounded member result'}</small></td>
             <td>{product?.name||'Other product'}<small>{product?.code||'—'}</small></td>
             <td>{g.role} <small>Product scope only</small></td>
           </tr>;
         })}</tbody></table>
       {!organization.grants.length&&<p>No product role grants are listed for this organization.</p>}
     </div>
   </section>
   <section className="permission-live-panel">
     <h2>Assign or remove a product role</h2>
     <p>Only active members with active accounts and enabled product access are eligible.
       Changes use the current membership version; stale updates are rejected.</p>
     {!available&&<p role="alert">This organization is not active. Role changes are disabled.</p>}
     {!members.length&&<p role="status">No eligible active members are available.</p>}
     {!products.length&&<p role="status">No eligible enabled products have supported roles.</p>}
     {error&&<p role="alert" className="permission-live-error">{error}</p>}
     {notice&&<p role="status" className="permission-live-notice">{notice}</p>}
     <form className="permission-live-form" onSubmit={save}>
       <label>Active organization member
         <select value={userId} disabled={busy||!available} required
           onChange={e=>selectMember(e.target.value)}>
           <option value="">Select member</option>
           {members.map(m=><option key={m.userId} value={m.userId}>
             {m.name} — {m.email}</option>)}
         </select></label>
       <label>Enabled product
         <select value={applicationId} disabled={busy||!available} required
           onChange={e=>selectProduct(e.target.value)}>
           <option value="">Select product</option>
           {products.map(p=><option key={p.id} value={p.id}>
             {p.code} · {p.name}</option>)}
         </select></label>
       <label>New product-scoped role
         <select value={role} disabled={busy||!available||!selectedMember||!selectedProduct}
           onChange={e=>{setRole(e.target.value);setConfirmed(false);}}>
           <option value="__choose__">Choose an action</option>
           {roles.map(r=><option key={r} value={r}>{r==='super_admin'?
             'super_admin (product only)':r}</option>)}
           {existing&&<option value="">Remove current product role</option>}
         </select>
       </label>
       <div className="permission-live-current">
         Current assignment: <strong>{existing?.role||'No product grant'}</strong>
         {selectedMember&&<span> · Membership version {selectedMember.version}</span>}
       </div>
       <label className="permission-live-confirm">
         <input type="checkbox" checked={confirmed} disabled={busy||!available}
           onChange={e=>setConfirmed(e.target.checked)}/>
         I confirm this product-specific permission change and resulting session revocation.
       </label>
       <div className="permission-live-actions">
         <Link href="/admin/products">Review product registry</Link>
         <button type="submit" disabled={!validChoice||busy}>
           {busy?'Saving…':role===''?'Remove product role':'Save product role'}
         </button>
       </div>
     </form>
   </section>
 </>;
}
