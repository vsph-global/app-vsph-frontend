/** Owner-only finance overview, with paise kept as exact decimal strings. */
export type FinanceSummary=Readonly<{
 invoicedPaise:string;collectedPaise:string;outstandingPaise:string;pastDuePaise:string;
 issuedInvoices:number;voidInvoices:number;clients:number;projects:number;
}>;
export type FinanceOverview=Readonly<{
 summary:FinanceSummary;monthly:ReadonlyArray<{monthStart:string;collectedPaise:string}>;
 asOf:string;currency:'INR';basis:'manual_cash_receipts';
}>;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const money=(x:unknown):x is string=>typeof x==='string'&&/^(0|[1-9]\d{0,22})$/.test(x);
const count=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=0;
const date=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
export function parseFinanceOverview(input:unknown):FinanceOverview|null{
 if(!obj(input)||!obj(input.summary)||!Array.isArray(input.monthly)||
   input.monthly.length>6||input.currency!=='INR'||
   input.basis!=='manual_cash_receipts'||!date(input.asOf))return null;
 const s=input.summary;
 const values=['invoicedPaise','collectedPaise','outstandingPaise','pastDuePaise'] as const;
 const counts=['issuedInvoices','voidInvoices','clients','projects'] as const;
 if(values.some(k=>!money(s[k]))||counts.some(k=>!count(s[k])))return null;
 const monthly:FinanceOverview['monthly'][number][]=[],seen=new Set<string>();
 for(const x of input.monthly){
   if(!obj(x)||!date(x.month_start)||!(x.month_start as string).endsWith('-01')||
     !money(x.collected_paise)||seen.has(x.month_start as string))return null;
   seen.add(x.month_start as string);
   monthly.push({monthStart:x.month_start as string,collectedPaise:x.collected_paise});
 }
 const summary=Object.fromEntries(
   [...values,...counts].map(k=>[k,s[k]])
 ) as FinanceSummary;
 return {summary,monthly,asOf:input.asOf as string,
   currency:'INR',basis:'manual_cash_receipts'};
}
export function rupeesFromPaise(amount:string){
 if(!money(amount))return '—';
 const v=BigInt(amount);
 return '₹'+(v/BigInt(100)).toLocaleString('en-IN')+'.'+String(v%BigInt(100)).padStart(2,'0');
}
