'use client';
import { useMemo,useState } from 'react';
import type { LedgerInvoice,LedgerReceipt } from './OperationsModels';
const money=(n:number)=>'₹'+new Intl.NumberFormat('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
export function FinancePreview({invoices,receipts,mode}:{
 invoices:LedgerInvoice[];receipts:LedgerReceipt[];mode:'ledger'|'journal';
}) {
 const [customer,setCustomer]=useState('all');
 const [kind,setKind]=useState<'invoices'|'receipts'>('invoices');
 const [status,setStatus]=useState('all');
 const [search,setSearch]=useState('');
 const [from,setFrom]=useState('');
 const [to,setTo]=useState('');
 const [filters,setFilters]=useState({kind:'invoices',status:'all',search:'',from:'',to:''});
 const [page,setPage]=useState(0);
 const customers=[...new Set(invoices.map(i=>i.customer))];
 const filteredInvoice=invoices.filter(i=>customer==='all'||i.customer===customer);
 const journal=useMemo(()=>{
   const rows=filters.kind==='invoices'?invoices.map(i=>({
     id:i.id,reference:i.reference,organization:i.customer,project:i.project,
     date:i.issued,amount:i.invoiced,status:i.status
   })):receipts.map(r=>({
     id:r.id,reference:r.reference,organization:r.invoice,project:'Receipt',
     date:r.received,amount:r.amount,status:r.status
   }));
   return rows.filter(r=> (filters.status==='all'||r.status===filters.status) &&
    (!filters.from||r.date>=filters.from)&&(!filters.to||r.date<=filters.to) &&
    (!filters.search||[r.reference,r.organization,r.project].join(' ')
     .toLowerCase().includes(filters.search.toLowerCase())));
 },[filters,invoices,receipts]);
 const rows=journal.slice(page*25,(page+1)*25);
 const totalInvoice=invoices.filter(i=>i.status!=='void').reduce((a,i)=>a+i.invoiced,0);
 const totalCollected=receipts.filter(r=>r.status==='recorded').reduce((a,r)=>a+r.amount,0);
 const totalOutstanding=invoices.filter(i=>i.status!=='void').reduce((a,i)=>a+Math.max(0,i.invoiced-i.collected),0);
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
  <section className="finance-shell">
   <header className="finance-header"><div><h1>{mode==='ledger'?'Finance ledger':'Finance journal'}<span>.</span></h1></div></header>
   <p className="finance-notice"><strong>Development preview:</strong> All amounts, payment references,
    invoices, dates, customers, and statuses are fictional. This screen does not record or
    verify payments, provide financial statements, or download company records.</p>
   {mode==='ledger'?<>
     <section className="finance-stats" aria-label="Finance overview">
       {[
         ['Total invoiced',money(totalInvoice),'Fictional issued invoices'],
         ['Cash received',money(totalCollected),'Example recorded receipts'],
         ['Outstanding',money(totalOutstanding),'Unpaid example balances'],
         ['Past due',money(invoices.filter(i=>i.status==='past_due').reduce((a,i)=>a+i.invoiced-i.collected,0)),'Example overdue balances']
       ].map(([name,amount,desc])=><article key={name}>
        <span>{name}</span><strong>{amount}</strong><small>{desc}</small>
       </article>)}
     </section>
     <div className="finance-grid">
       <section className="finance-panel">
        <h2>Create invoice record</h2><p className="finance-hint">An invoice creates a receivable, not cash collected.</p>
        <div className="ops-form-grid">
          <label>Customer<select disabled><option>Select customer</option></select></label>
          <label>Project (optional)<select disabled><option>No linked project</option></select></label>
          <label>Invoice reference<input disabled placeholder="INV-2026-001"/></label>
          <label>Amount in INR<input disabled placeholder="10000.00"/></label>
          <label>Issued date<input type="date" disabled/></label>
          <label>Due date<input type="date" disabled/></label>
        </div><button className="finance-button" type="button" disabled>Save invoice</button>
       </section>
       <section className="finance-panel">
        <h2>Record cash receipt</h2>
        <p className="finance-hint">A payment must be verified outside this portal before recording.</p>
        <div className="ops-form-grid">
          <label>Open invoice<select disabled><option>Select invoice</option></select></label>
          <label>Payment reference<input disabled placeholder="BANK-RECEIPT-001"/></label>
          <label>Amount received (INR)<input disabled placeholder="2500.00"/></label>
          <label>Cash received date<input type="date" disabled/></label>
        </div><button className="finance-button" type="button" disabled>Record receipt</button>
       </section>
     </div>
     <section className="finance-panel">
       <div className="finance-panel-head"><h2>Recent invoices</h2>
         <span>Example ledger · no persistence</span></div>
       <label className="finance-filter">Filter visible invoices by customer
         <select value={customer} onChange={e=>setCustomer(e.target.value)}>
         <option value="all">All customers</option>
         {customers.map(c=><option value={c} key={c}>{c}</option>)}</select></label>
       <div className="finance-scroll"><table><thead><tr>
       {['Invoice','Customer / project','Invoiced','Collected','Outstanding','Due / status','Action']
        .map(v=><th scope="col" key={v}>{v}</th>)}</tr></thead>
       <tbody>{filteredInvoice.map(i=><tr key={i.id}>
        <td><strong>{i.reference}</strong></td><td>{i.customer}<small>{i.project}</small></td>
        <td>{money(i.invoiced)}</td><td>{money(i.collected)}</td>
        <td>{money(Math.max(0,i.invoiced-i.collected))}</td>
        <td>{i.due}<small>{i.status}</small></td><td><button type="button" disabled>Review</button></td>
       </tr>)}</tbody></table></div>
     </section>
     <section className="finance-panel">
       <div className="finance-panel-head"><h2>Recent receipts and corrections</h2>
       <span>Fictional records</span></div>
       <div className="finance-scroll"><table><thead><tr>
        {['Reference','Invoice','Amount','Received','Status','Action']
         .map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
        <tbody>{receipts.map(r=><tr key={r.id}>
          <td>{r.reference}</td><td>{r.invoice}</td><td>{money(r.amount)}</td>
          <td>{r.received}</td><td>{r.status}</td>
          <td><button type="button" disabled>Reverse receipt</button></td></tr>)}</tbody></table></div>
     </section>
     <p className="finance-hint">Real corrections must use an audited transaction and never
       silently edit or delete a receipt.</p>
   </>:<>
      <p className="finance-notice">Read-only history. Dates filter invoice issue dates or cash
       received dates. A real page must retrieve current authorized records at each request.</p>
      <form className="finance-panel journal-filters" onSubmit={e=>{
        e.preventDefault();setFilters({kind,status,search:search.trim(),from,to});setPage(0);}}>
        <label>Records<select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setStatus('all');}}>
          <option value="invoices">Invoices</option><option value="receipts">Receipts</option></select></label>
        <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>
         <option value="all">All statuses</option>
         {kind==='invoices'?['issued','paid','past_due','void'].map(s=><option key={s}>{s}</option>):
           ['recorded','reversed'].map(s=><option key={s}>{s}</option>)}
        </select></label>
        <label>Reference, customer or project<input type="search" maxLength={100}
          value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <label>From date<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label>To date<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <button className="finance-button" type="submit">Apply filters</button>
      </form>
      <p role="status" className="finance-hint">Showing {rows.length} of {journal.length} example records</p>
      <section className="finance-panel" aria-label="Matching financial history">
        <div className="finance-scroll"><table><thead><tr>
         {['Reference','Customer / invoice','Project','Amount','Date','Status']
          .map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
         <tbody>{rows.map(r=><tr key={r.id}><td>{r.reference}</td>
          <td>{r.organization}</td><td>{r.project}</td>
          <td>{money(r.amount)}</td><td>{r.date}</td><td>{r.status}</td></tr>)}</tbody>
        </table>{!rows.length&&<p>No example records match these filters.</p>}</div>
        <div className="journal-pages">
         <button type="button" className="finance-button secondary" disabled={page===0}
          onClick={()=>setPage(page-1)}>Previous page</button>
         <span>Page {page+1}</span>
         <button type="button" className="finance-button secondary" disabled={(page+1)*25>=journal.length}
          onClick={()=>setPage(page+1)}>Next page</button>
        </div>
      </section>
      <p className="finance-hint">Real journal entries remain scoped to platform-owner authorization.</p>
     </>}
  </section>
 </main>;
}
