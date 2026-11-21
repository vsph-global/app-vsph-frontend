'use client';

import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import {
  parseClientOnboarding,validOnboardingKey,
  type CatalogProduct,type ClientOnboardingPayload,
  type SubscriptionChoice
} from './ClientOnboardingContract';

type ProductInput={planCode:string;status:'trial'|'active';endsOn:string};
type Original={key:string;payload:ClientOnboardingPayload};
type Stage='editing'|'uncertain'|'complete';
const tomorrow=()=>new Date(Date.now()+86400000).toISOString().slice(0,10);
const slugify=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')
  .replace(/^-|-$/g,'').slice(0,160);

export function ClientOnboardingWorkspace({products}:{products:readonly CatalogProduct[]}){
 const [organizationName,setOrganizationName]=useState('');
 const [slug,setSlug]=useState('');
 const [slugEdited,setSlugEdited]=useState(false);
 const [adminName,setAdminName]=useState('');
 const [adminEmail,setAdminEmail]=useState('');
 const [organizationOnly,setOrganizationOnly]=useState(true);
 const [selected,setSelected]=useState<string[]>([]);
 const [choices,setChoices]=useState<Record<string,ProductInput>>({});
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [stage,setStage]=useState<Stage>('editing');
 const [originalMissing,setOriginalMissing]=useState(false);
 const [created,setCreated]=useState<{id:string;name:string;slug:string}|null>(null);
 const original=useRef<Original|null>(null);

 function changeProduct(id:string,checked:boolean){
   if(checked){if(selected.length>=12)return;setSelected(v=>[...v,id]);}
   else setSelected(v=>v.filter(x=>x!==id));
 }
 function changeChoice(id:string,change:Partial<ProductInput>){
   setChoices(v=>{
     const previous=v[id]??{planCode:'standard',status:'trial' as const,endsOn:tomorrow()};
     return {...v,[id]:{...previous,...change}};
   });
 }
 function buildPayload():ClientOnboardingPayload|null{
   const subscriptions:SubscriptionChoice[]=organizationOnly?[]:selected.map(id=>{
     const option=choices[id]||{planCode:'standard',status:'trial',endsOn:tomorrow()};
     return {applicationId:id,planCode:option.planCode.trim().toLowerCase(),
       status:option.status,
       endsAt:option.endsOn?option.endsOn+'T23:59:59.000Z':null};
   });
   return parseClientOnboarding({
     organizationName:organizationName.trim(),slug:slug.trim().toLowerCase(),
     adminName:adminName.trim(),adminEmail:adminEmail.trim().toLowerCase(),
     products:subscriptions
   });
 }
 async function send(request:Original){
   setBusy(true);setError('');
   try{
     const response=await fetch('/api/admin-onboarding',{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json','Idempotency-Key':request.key},
       body:JSON.stringify(request.payload)
     });
     if(response.status===401){window.location.assign('/login');return;}
     const result:unknown=await response.json().catch(()=>null);
     if(response.status===202&&result&&typeof result==='object'&&
       'id' in result&&validOnboardingKey(result.id)){
       setCreated({id:result.id,name:request.payload.organizationName,
         slug:request.payload.slug});
       setStage('complete');return;
     }
     const message=result&&typeof result==='object'&&'message' in result&&
       typeof result.message==='string'?result.message:
       'Creation was not confirmed. Check the original request before retrying.';
     setError(message);setStage('uncertain');setOriginalMissing(false);
   }catch{
     setStage('uncertain');setOriginalMissing(false);
     setError('The connection was interrupted. The request may have been committed. Check the original request.');
   }finally{setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(busy||stage!=='editing'||!confirmed)return;
   if(!organizationOnly&&!selected.length){
     setError('Choose a catalog product or select Organization only.');return;
   }
   const payload=buildPayload();
   if(!payload){setError('Review organization, customer owner and subscription fields.');return;}
   const request={key:crypto.randomUUID(),payload};
   original.current=request;
   void send(request);
 }
 async function checkOriginal(){
   const request=original.current;
   if(!request||busy)return;
   setBusy(true);setError('');
   try{
     const response=await fetch('/api/admin-onboarding/request/'+request.key,{
       method:'GET',credentials:'same-origin',cache:'no-store'
     });
     if(response.status===401){window.location.assign('/login');return;}
     const result:unknown=await response.json().catch(()=>null);
     if(!response.ok||!result||typeof result!=='object'||
       !('found' in result)||typeof result.found!=='boolean'){
       setError('The original request could not be checked. Do not start a new request.');return;
     }
     if(result.found===true){
       if(!('id' in result)||!validOnboardingKey(result.id)){
         setError('Original request response could not be verified.');return;
       }
       setCreated({id:result.id,name:request.payload.organizationName,
         slug:request.payload.slug});
       setStage('complete');return;
     }
     setOriginalMissing(true);
     setError('No committed request was found for that key. You may retry the exact same request, or review the fields before starting over.');
   }catch{setError('Could not check the original request. Do not create a second organization yet.');}
   finally{setBusy(false);}
 }
 function reviewAfterMissing(){
   if(!originalMissing||busy)return;
   original.current=null;setOriginalMissing(false);setStage('editing');
   setConfirmed(false);setError('');
 }
 return <main className="workspace-content admin-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="admin-live-breadcrumb" aria-label="Breadcrumb">
     <Link href="/admin">Administration</Link><span aria-hidden="true">/</span>
     <span>Client onboarding</span>
   </nav>
   <header className="admin-live-heading">
     <div><h1>Client onboarding</h1>
       <p>Create a customer organization with a governed owner invitation.</p></div>
     <Link href="/admin/provisioning">Provisioning recovery</Link>
   </header>
   {stage==='complete'&&created?<section className="admin-live-panel">
     <h2>Organization setup committed</h2>
     <p><strong>{created.name}</strong> ({created.slug}) was created.
       The owner invitation has been recorded and queued, but delivery has not been confirmed.</p>
     <div className="admin-live-actions">
       <Link href={'/admin/customers/'+created.id}>View organization</Link>
       <Link href="/admin/provisioning">Check invitation delivery</Link>
     </div>
   </section>:stage==='uncertain'?<section className="admin-live-panel admin-live-confirm">
     <h2>Verify the original onboarding request</h2>
     <p>Do not generate a new request key yet. The server may have already committed
       the organization and invitation. The existing request identifier is retained.</p>
     {error&&<p role="alert">{error}</p>}
     <div className="admin-live-actions">
       <button type="button" disabled={busy}
         onClick={()=>void checkOriginal()}>Check original request</button>
       {originalMissing&&<>
         <button type="button" disabled={busy}
           onClick={()=>{const request=original.current;if(request)void send(request);}}>
           Retry identical request</button>
         <button type="button" disabled={busy}
           onClick={reviewAfterMissing}>Review fields and start a new request</button>
       </>}
     </div>
   </section>:<section className="admin-live-panel">
     <h2>Organization and owner</h2>
     <p>Invitations and account creation are handled by the existing durable provisioning system.
       Creating an organization does not mean its invitation was delivered.</p>
     {error&&<p role="alert" className="feedback-state error-state">{error}</p>}
     <form className="admin-live-onboarding" onSubmit={submit}>
       <div className="admin-live-form-grid">
         <label>Organization name
           <input required minLength={2} maxLength={150} disabled={busy}
             value={organizationName} onChange={e=>{
               const v=e.target.value;setOrganizationName(v);
               if(!slugEdited)setSlug(slugify(v));
             }}/></label>
         <label>Workspace identifier
           <input required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*"
             disabled={busy} value={slug} onChange={e=>{
               setSlugEdited(true);setSlug(e.target.value.toLowerCase());
             }}/></label>
         <label>Customer owner name
           <input required minLength={2} maxLength={150} disabled={busy}
             value={adminName} onChange={e=>setAdminName(e.target.value)}/></label>
         <label>Customer owner work email
           <input required type="email" maxLength={190} disabled={busy}
             value={adminEmail} onChange={e=>setAdminEmail(e.target.value)}/></label>
       </div>
       <div className="admin-live-subsection">
         <h3>Product subscriptions</h3>
         <label className="admin-live-check">
           <input type="checkbox" checked={organizationOnly} disabled={busy}
             onChange={e=>setOrganizationOnly(e.target.checked)}/>
           Organization only — no catalog product subscription or product role grant
         </label>
         {!organizationOnly&&<>
           <p>Select up to 12 active catalog products. Trial subscriptions require
             a future expiration date.</p>
           {!products.length&&<p role="alert">
             No active catalog products were returned. Choose Organization only.</p>}
           <div className="admin-live-products">
             {products.map(product=>{
               const checked=selected.includes(product.id);
               const option=choices[product.id]||{
                 planCode:'standard',status:'trial' as const,endsOn:tomorrow()
               };
               return <div key={product.id} className="admin-live-product">
                 <label className="admin-live-check">
                   <input type="checkbox" disabled={busy||(!checked&&selected.length>=12)}
                     checked={checked}
                     onChange={e=>changeProduct(product.id,e.target.checked)}/>
                   <span><strong>{product.name}</strong> ({product.code})</span>
                 </label>
                 {checked&&<div className="admin-live-form-grid">
                   <label>Plan code
                     <input required maxLength={60}
                       pattern="[a-z0-9][a-z0-9_-]{0,59}"
                       disabled={busy} value={option.planCode}
                       onChange={e=>changeChoice(product.id,{planCode:e.target.value.toLowerCase()})}/>
                   </label>
                   <label>Subscription state
                     <select value={option.status} disabled={busy}
                       onChange={e=>changeChoice(product.id,{
                         status:e.target.value as ProductInput['status']})}>
                       <option value="trial">Trial</option>
                       <option value="active">Active</option>
                     </select>
                   </label>
                   <label>Ends on {option.status==='trial'?'(required)':'(optional)'}
                     <input type="date" disabled={busy} value={option.endsOn}
                       min={tomorrow()} required={option.status==='trial'}
                       onChange={e=>changeChoice(product.id,{endsOn:e.target.value})}/>
                   </label>
                 </div>}
               </div>;
             })}
           </div>
         </>}
       </div>
       <div className="admin-live-subsection">
         <h3>Review and create</h3>
         <p>The platform will create the organization, record the owner invitation,
           and queue delivery through its existing provisioning worker.</p>
         <label className="admin-live-check">
           <input type="checkbox" disabled={busy} checked={confirmed}
             onChange={e=>setConfirmed(e.target.checked)}/>
           I have reviewed the customer, recipient, and subscription access.
         </label>
       </div>
       <div className="admin-live-actions">
         <Link href="/admin">Cancel</Link>
         <button type="submit" disabled={busy||!confirmed||!organizationName.trim()||
           !slug.trim()||!adminName.trim()||!adminEmail.trim()||
           (!organizationOnly&&!selected.length)}>
           {busy?'Submitting…':'Create customer organization'}
         </button>
       </div>
     </form>
   </section>}
 </main>;
}
