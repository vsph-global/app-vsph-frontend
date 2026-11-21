import type {Metadata} from 'next';
import Link from 'next/link';
import {loadFinanceOverview} from '@/features/operations/finance-server';
import {rupeesFromPaise} from '@/features/operations/FinanceOverviewContract';
import '../../finance-live.css';
export const metadata:Metadata={
 title:'Finance | VSPH Control Center',robots:{index:false,follow:false}
};
export default async function FinancePage(){
 const data=await loadFinanceOverview();
 if(!data)return <main className="workspace-content finance-live-workspace" id="mainContent">
   <h1>Finance unavailable</h1><p role="alert">
     Your platform-owner permission or finance service could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 const figures=[
   ['Invoiced',data.summary.invoicedPaise],['Collected',data.summary.collectedPaise],
   ['Outstanding',data.summary.outstandingPaise],['Past due',data.summary.pastDuePaise]
 ] as const;
 const counts=[
   ['Issued invoices',data.summary.issuedInvoices],
   ['Voided invoices',data.summary.voidInvoices],
   ['Customers',data.summary.clients],['Customer projects',data.summary.projects]
 ] as const;
 const maximum=data.monthly.reduce((max,row)=>{
   const n=BigInt(row.collectedPaise);
   return n>max?n:max;
 },BigInt(1));
 return <main className="workspace-content finance-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="finance-live-heading"><div><h1>Finance overview</h1>
     <p>Manual cash receipt basis · As of {data.asOf} · INR</p></div>
     <div className="finance-live-actions">
       <Link href="/admin/finance/journal">View journal</Link>
       <Link href="/admin/finance">Refresh</Link>
     </div></header>
   <section className="finance-live-money" aria-label="Finance summary in INR">
     {figures.map(([label,value])=><article key={label}>
       <span>{label}</span><strong>{rupeesFromPaise(value)}</strong></article>)}
   </section>
   <section className="finance-live-panel" aria-labelledby="countTitle">
     <h2 id="countTitle">Ledger record counts</h2>
     <div className="finance-live-counts">
       {counts.map(([label,count])=><div key={label}><span>{label}</span>
         <strong>{count.toLocaleString('en-IN')}</strong></div>)}
     </div>
   </section>
   <section className="finance-live-panel" aria-labelledby="trendTitle">
     <h2 id="trendTitle">Cash receipts by month</h2>
     <p>Recorded and non-reversed receipts on issued invoices.
       Not automatically recognized revenue or bank-verified settlement.</p>
     <div className="finance-live-months">
       {data.monthly.map(row=>{
         const height=Number((BigInt(row.collectedPaise)*BigInt(100))/maximum);
         return <div className="finance-live-month" key={row.monthStart}>
           <span>{row.monthStart.slice(0,7)}</span>
           <div className="finance-live-track">
             <div style={{width:height+'%'}} aria-hidden="true"/></div>
           <strong>{rupeesFromPaise(row.collectedPaise)}</strong>
         </div>;
       })}
     </div>
     {!data.monthly.length&&<p>No monthly receipt data is available.</p>}
   </section>
   <p className="finance-live-footnote">This overview intentionally excludes individual invoice,
     payment and customer references. Journal details and financial mutations are not yet
     enabled in the migrated frontend.</p>
 </main>;
}
