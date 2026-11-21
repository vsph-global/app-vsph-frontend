import type {Metadata} from 'next';
import Link from 'next/link';
import {loadFinanceJournal,financeJournalHref,type JournalFilters} from '@/features/operations/finance-journal-server';
import {parseJournalCursor} from '@/features/operations/FinanceJournalContract';
import {rupeesFromPaise} from '@/features/operations/FinanceOverviewContract';
import '../../../finance-live.css';

export const metadata:Metadata={title:'Finance journal | VSPH Control Center',
 robots:{index:false,follow:false}};
type Filters={kind?:string|string[];status?:string|string[];search?:string|string[];
 from?:string|string[];to?:string|string[];cursor?:string|string[]};
const one=(x:string|string[]|undefined):string|null=>x===undefined?'':typeof x==='string'?x:null;
const date=(x:string)=>!x||(/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x);
export default async function FinanceJournalPage({searchParams}:{
 searchParams:Promise<Filters>;
}){
 const raw=await searchParams;
 const kindRaw=one(raw.kind),statusRaw=one(raw.status),searchRaw=one(raw.search);
 const fromRaw=one(raw.from),toRaw=one(raw.to),cursorRaw=one(raw.cursor);
 const kind=kindRaw||'invoices';
 const status=statusRaw||'all',search=searchRaw?.trim()??'';
 const from=fromRaw??'',to=toRaw??'';
 const statuses=kind==='invoices'?['all','issued','void']:['all','active','reversed'];
 let cursor:JournalFilters['cursor']=null;
 if(cursorRaw){
   try{cursor=parseJournalCursor(JSON.parse(cursorRaw));}catch{cursor=null;}
 }
 const invalid=[kindRaw,statusRaw,searchRaw,fromRaw,toRaw,cursorRaw].some(x=>x===null)||
   !['invoices','receipts'].includes(kind)||!statuses.includes(status)||
   search.length>100||/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(search)||
   !date(from)||!date(to)||(from!==''&&to!==''&&from>to)||
   (cursorRaw!==''&&(cursorRaw===null||cursorRaw.length>500||!cursor));
 if(invalid)return <main className="workspace-content finance-live-workspace" id="mainContent">
   <h1>Invalid journal filters</h1>
   <p role="alert">Clear the filters and try again. Old journal cursors cannot be reused
     with different search settings.</p>
   <Link href="/admin/finance/journal">Reset journal</Link>
 </main>;
 const filters:JournalFilters={
   kind:kind as JournalFilters['kind'],status,search,from,to,cursor
 };
 const result=await loadFinanceJournal(filters);
 if(!result)return <main className="workspace-content finance-live-workspace" id="mainContent">
   <h1>Finance journal unavailable</h1>
   <p role="alert">Your owner permission, finance backend, or selected cursor could not
     be verified. No records were displayed.</p>
   <Link href="/admin/finance">Back to Finance</Link>
 </main>;
 return <main className="workspace-content finance-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="finance-live-breadcrumb" aria-label="Breadcrumb">
     <Link href="/admin/finance">Finance</Link>
     <span aria-hidden="true">/</span><span>Journal</span>
   </nav>
   <header className="finance-live-heading"><div>
     <h1>Finance journal</h1>
     <p>Recorded INR ledger entries · Owner-only · Read-only</p>
   </div><Link href={financeJournalHref({...filters,cursor:null})}>Refresh</Link></header>
   <div className="finance-journal-tabs" aria-label="Journal record type">
     <Link href="/admin/finance/journal?kind=invoices"
       aria-current={kind==='invoices'?'page':undefined}>Invoices</Link>
     <Link href="/admin/finance/journal?kind=receipts"
       aria-current={kind==='receipts'?'page':undefined}>Receipts</Link>
   </div>
   <section className="finance-live-panel">
     <form className="finance-journal-filters" method="get" action="/admin/finance/journal">
       <input type="hidden" name="kind" value={kind}/>
       <label>Search references
         <input type="search" name="search" maxLength={100} defaultValue={search}
           placeholder="Reference, organization or project"/></label>
       <label>Status <select name="status" defaultValue={status}>
         {statuses.map(s=><option value={s} key={s}>
           {s[0].toUpperCase()+s.slice(1)}</option>)}
       </select></label>
       <label>From <input type="date" name="from" defaultValue={from}/></label>
       <label>To <input type="date" name="to" defaultValue={to}/></label>
       <button type="submit">Apply filters</button>
       <Link href={'/admin/finance/journal?kind='+kind}>Reset</Link>
     </form>
     <div className="finance-journal-table" tabIndex={0} role="region"
       aria-label={kind==='invoices'?'Invoice journal':'Receipt journal'}>
       {kind==='invoices'?<table><thead><tr>
         {['Invoice','Organization / project','Invoiced','Collected','Issued','Due','Status']
           .map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
         <tbody>{result.invoices.map(x=><tr key={x.id}>
           <td><strong>{x.reference}</strong></td>
           <td><strong>{x.organizationName}</strong><small>{x.projectName||'No project'}</small></td>
           <td>{rupeesFromPaise(x.amountPaise)}</td>
           <td>{rupeesFromPaise(x.collectedPaise)}</td>
           <td>{x.issuedOn}</td><td>{x.dueOn}</td><td>{x.status}</td>
         </tr>)}</tbody>
       </table>:<table><thead><tr>
         {['Receipt','Invoice','Organization / project','Amount','Received','Status']
           .map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
         <tbody>{result.receipts.map(x=><tr key={x.id}>
           <td><strong>{x.paymentReference}</strong></td>
           <td>{x.invoiceReference}</td>
           <td><strong>{x.organizationName}</strong><small>{x.projectName||'No project'}</small></td>
           <td>{rupeesFromPaise(x.amountPaise)}</td><td>{x.receivedOn}</td>
           <td>{x.reversed?'Reversed':'Recorded'}</td>
         </tr>)}</tbody>
       </table>}
       {!result.invoices.length&&!result.receipts.length&&
         <p className="finance-journal-empty">No ledger entries match these filters.</p>}
     </div>
     <nav className="finance-journal-pagination" aria-label="Journal pagination">
       <span>{result.invoices.length+result.receipts.length} records on this page</span>
       {result.nextCursor&&<Link href={financeJournalHref({
         ...filters,cursor:result.nextCursor
       })}>Next 25 records</Link>}
       {cursor&&<Link href={financeJournalHref({...filters,cursor:null})}>First page</Link>}
     </nav>
   </section>
   <p className="finance-live-footnote">Receipts are manually recorded cash entries,
     not proof of bank settlement. No invoices, receipts or reversals can be
     changed from this screen.</p>
 </main>;
}
