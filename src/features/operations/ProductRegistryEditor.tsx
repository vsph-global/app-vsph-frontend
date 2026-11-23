'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {parseProductCommand,type ProductRow,type ProductCommand,
 type ProductState,type ProductVisibility,type IntegrationMode} from './ProductRegistryContract';

type Draft={
 code:string;name:string;status:ProductState;visibility:ProductVisibility;
 integrationMode:IntegrationMode;description:string;ownerId:string;
 supportEmail:string;docsUrl:string;
};
type Pending={signature:string;id:string};
const start=(product:ProductRow|null):Draft=>({
 code:product?.code||'',name:product?.name||'',
 status:product?.status||'disabled',visibility:product?.visibility||'unlisted',
 integrationMode:product?.integrationMode||'portal_only',
 description:product?.description||'',ownerId:product?.ownerId||'',
 supportEmail:product?.supportEmail||'',docsUrl:product?.docsUrl||''
});
const lifecycle:ProductState[]=['active','disabled','maintenance','retired'];
export function ProductRegistryEditor({product}:{product:ProductRow|null}){
 const router=useRouter();
 const [draft,setDraft]=useState<Draft>(()=>start(product));
 const [confirmed,setConfirmed]=useState(false);
 const [lifecycleConfirmed,setLifecycleConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const pending=useRef<Pending|null>(null);
 const statusChanged=!!product&&product.status!==draft.status;
 const destructive=statusChanged&&(product?.status==='active'||
   draft.status==='retired'||draft.status==='disabled'||draft.status==='maintenance');
 const retired=product?.status==='retired';
 const builtin=['CRM','MUSIC'].includes(draft.code);
 const update=<K extends keyof Draft>(key:K,value:Draft[K])=>{
   setDraft(previous=>({...previous,[key]:value}));
   setConfirmed(false);setLifecycleConfirmed(false);setError('');setNotice('');
 };
 function payload():ProductCommand|null{
   const fields={
     ...draft,loginPath:'/apps/'+draft.code.toLowerCase()+'/login',
     ...(product?{version:product.version}:{})
   };
   return parseProductCommand(fields,product?'update':'create');
 }
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(busy||!confirmed||(destructive&&!lifecycleConfirmed)||retired)return;
   const command=payload();
   if(!command){setError('Review product code, required metadata, active owner ID, and HTTPS documentation link.');return;}
   const signature=JSON.stringify(command);
   let id=product?.id;
   if(!product){
     if(!pending.current||pending.current.signature!==signature)
       pending.current={signature,id:crypto.randomUUID()};
     id=pending.current.id;
   }
   if(!id)return;
   setBusy(true);setError('');setNotice('');
   try{
     const response=await fetch('/api/product-command/'+(product?'update':'create')+'/'+id,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:signature
     });
     if(response.status===401){router.replace('/login');return;}
     const result:unknown=await response.json().catch(()=>null);
     if(!response.ok){
       const message=result&&typeof result==='object'&&'message' in result&&
         typeof result.message==='string'?result.message:
         'The operation was not confirmed. Check the current registry before retrying.';
       setError(message);return;
     }
     setNotice('Product metadata was saved. External integration acceptance remains unverified.');
     setConfirmed(false);setLifecycleConfirmed(false);
     if(!product){
       router.replace('/admin/products/'+id);
     }else router.refresh();
   }catch{
     setError('Connection interrupted. The operation might have committed. Refresh the registry before retrying; unchanged creation retries reuse the same request ID.');
   }finally{setBusy(false);}
 }
 async function probe(){
   if(!product||busy)return;
   setBusy(true);setError('');setNotice('');
   try{
     const response=await fetch('/api/product-command/check/'+product.id,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:'{}'
     });
     if(response.status===401){router.replace('/login');return;}
     if(!response.ok){
       const result:unknown=await response.json().catch(()=>null);
       setError(result&&typeof result==='object'&&'message' in result&&
         typeof result.message==='string'?result.message:
         'Local check could not be confirmed.');return;
     }
     setNotice('Local adapter observation saved. External provider connectivity is not verified.');
     router.refresh();
   }catch{setError('Local check failed or its result is uncertain. Reload before trying again.');}
   finally{setBusy(false);}
 }
 return <main className="workspace-content product-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="product-live-crumbs" aria-label="Breadcrumb">
     <Link href="/admin/products">Product registry</Link><span>/</span>
     <span>{product?product.code:'Register product'}</span>
   </nav>
   <header className="product-live-heading">
     <div><h1>{product?'Manage '+product.name:'Register product'}</h1>
       <p>Platform-governed catalog metadata · No credentials or secrets</p></div>
     <Link href="/admin/products">Back to directory</Link>
   </header>
   {product&&<section className="product-live-panel">
     <h2>Integration readiness</h2>
     <p><strong>{product.readiness.state}</strong> · {product.readiness.reason}</p>
     <p>Configured: {product.readiness.configured?'Yes':'No'} ·
       External acceptance verified: <strong>No</strong></p>
     <p>Last local observation: {product.observedAt?
       new Date(product.observedAt).toLocaleString():'None recorded'}
       {product.lastObservedState?' · '+product.lastObservedState:''}</p>
     <button type="button" disabled={busy} onClick={()=>void probe()}>
       {busy?'Checking…':'Check local integration only'}
     </button>
     <p>Local adapter checks never claim that an external service is reachable.</p>
   </section>}
   <section className="product-live-panel">
     <h2>{product?'Product metadata':'New product details'}</h2>
     <p>Editing a product does not automatically subscribe an organization,
       grant application roles, or deploy an integration.</p>
     {error&&<p role="alert" className="product-live-error">{error}</p>}
     {notice&&<p role="status" className="product-live-notice">{notice}</p>}
     <form className="product-live-form" onSubmit={submit}>
       <div className="product-live-form-grid">
         <label>Product code
           <input required maxLength={40} pattern="[A-Z][A-Z0-9_]{1,39}"
             readOnly={!!product} disabled={busy}
             value={draft.code}
             onChange={event=>{
               const code=event.target.value.toUpperCase();
               setDraft(previous=>({...previous,code,
                 integrationMode:['CRM','MUSIC'].includes(code)?'adapter':previous.integrationMode}));
               setConfirmed(false);setLifecycleConfirmed(false);setError('');setNotice('');
             }}/>
         </label>
         <label>Name
           <input required maxLength={150} disabled={busy}
             value={draft.name} onChange={event=>update('name',event.target.value)}/>
         </label>
         <label>Lifecycle status
           <select value={draft.status} disabled={busy||retired}
             onChange={event=>update('status',event.target.value as ProductState)}>
             {lifecycle.map(s=><option key={s} value={s}>{s}</option>)}
           </select>
         </label>
         <label>Catalog visibility
           <select value={draft.visibility} disabled={busy||retired}
             onChange={event=>update('visibility',event.target.value as ProductVisibility)}>
             <option value="listed">Listed</option><option value="unlisted">Unlisted</option>
           </select>
         </label>
         <label>Integration mode
           <select value={draft.integrationMode} disabled={busy||retired||builtin}
             onChange={event=>update('integrationMode',event.target.value as IntegrationMode)}>
             <option value="adapter">Reviewed local adapter</option>
             <option value="portal_only">Portal only (no adapter)</option>
           </select>
         </label>
         <label>Product owner account UUID (optional)
           <input maxLength={36} disabled={busy||retired} value={draft.ownerId}
             placeholder="Active platform account UUID"
             onChange={event=>update('ownerId',event.target.value)}/>
         </label>
         <label>Support email (optional)
           <input type="email" maxLength={190} disabled={busy||retired}
             value={draft.supportEmail}
             onChange={event=>update('supportEmail',event.target.value)}/>
         </label>
         <label>Documentation URL (optional, HTTPS)
           <input type="url" maxLength={1000} disabled={busy||retired}
             value={draft.docsUrl} placeholder="https://example.com/docs"
             onChange={event=>update('docsUrl',event.target.value)}/>
         </label>
       </div>
       <label>Description
         <textarea rows={4} maxLength={2000} disabled={busy||retired}
           value={draft.description}
           onChange={event=>update('description',event.target.value)}/>
       </label>
       <p>Login path (fixed by product code):
         <code> /apps/{draft.code.toLowerCase()||'code'}/login</code></p>
       {product&&<p>Current record version: <strong>{product.version}</strong>.
         The backend rejects stale updates and any attempt to change a product code.
         {retired?' Retired products cannot be reactivated.':''}</p>}
       {destructive&&<label className="product-live-checkbox">
         <input type="checkbox" disabled={busy||retired}
           checked={lifecycleConfirmed}
           onChange={e=>setLifecycleConfirmed(e.target.checked)}/>
         I understand this lifecycle change can revoke product sessions
         and launch codes; retirement cannot be reversed.
       </label>}
       <label className="product-live-checkbox">
         <input type="checkbox" disabled={busy||retired}
           checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
         I reviewed the product metadata, lifecycle and integration mode.
       </label>
       <div className="product-live-actions">
         <Link href="/admin/products">Cancel</Link>
         <button type="submit" disabled={busy||retired||!confirmed||
           (destructive&&!lifecycleConfirmed)}>
           {busy?'Saving…':product?'Save product changes':'Register product'}
         </button>
       </div>
     </form>
   </section>
 </main>;
}
