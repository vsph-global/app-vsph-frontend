/** Exact paise-preserving read-only projection of the owner finance journal. */
export type JournalKind='invoices'|'receipts';
export type JournalCursor=Readonly<{at:string;id:string;scope:string}>;
export type JournalInvoice=Readonly<{
  id:string;reference:string;organizationName:string;projectName:string|null;
  amountPaise:string;collectedPaise:string;issuedOn:string;dueOn:string;
  status:'issued'|'void';createdAt:string;
}>;
export type JournalReceipt=Readonly<{
  id:string;invoiceReference:string;paymentReference:string;
  organizationName:string;projectName:string|null;amountPaise:string;
  receivedOn:string;recordedAt:string;reversed:boolean;
}>;
export type JournalPage=Readonly<{
  kind:JournalKind;invoices:JournalInvoice[];receipts:JournalReceipt[];
  nextCursor:JournalCursor|null;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const uid=(x:unknown):x is string=>typeof x==='string'&&UUID.test(x);
const money=(x:unknown):x is string=>typeof x==='string'&&/^(0|[1-9][0-9]{0,22})$/.test(x);
const label=(x:unknown,max=190):x is string=>typeof x==='string'&&
  x.length>0&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
const date=(x:unknown):x is string=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const timestamp=(x:unknown):x is string=>typeof x==='string'&&TIMESTAMP.test(x)&&
  !Number.isNaN(Date.parse(x));
export function parseJournalCursor(x:unknown):JournalCursor|null{
  if(!obj(x)||Object.keys(x).length!==3||!uid(x.id)||
    !timestamp(x.at)||typeof x.scope!=='string'||!/^[a-f0-9]{32}$/.test(x.scope))
    return null;
  return {id:x.id,at:x.at,scope:x.scope};
}
export function parseFinanceJournal(input:unknown,kind:JournalKind):JournalPage|null{
  if(!obj(input)||!Array.isArray(input.items)||input.items.length>25||
    !(input.nextCursor===null||parseJournalCursor(input.nextCursor)!==null))
    return null;
  const seen=new Set<string>(),invoices:JournalInvoice[]=[],receipts:JournalReceipt[]=[];
  for(const item of input.items){
    if(!obj(item)||!uid(item.id)||seen.has(item.id.toLowerCase()))return null;
    seen.add(item.id.toLowerCase());
    if(kind==='invoices'){
      if(!label(item.reference,80)||!label(item.organization_name,150)||
        !(item.project_name===null||label(item.project_name,150))||
        !money(item.amount_paise)||!money(item.collected_paise)||
        !date(item.issued_on)||!date(item.due_on)||
        !['issued','void'].includes(String(item.status))||!timestamp(item.created_at))
        return null;
      invoices.push({
        id:item.id,reference:item.reference,organizationName:item.organization_name,
        projectName:item.project_name as string|null,amountPaise:item.amount_paise,
        collectedPaise:item.collected_paise,issuedOn:item.issued_on,dueOn:item.due_on,
        status:item.status as JournalInvoice['status'],createdAt:item.created_at
      });
    }else{
      if(!label(item.invoice_reference,80)||!label(item.payment_reference,100)||
        !label(item.organization_name,150)||
        !(item.project_name===null||label(item.project_name,150))||
        !money(item.amount_paise)||!date(item.received_on)||
        !timestamp(item.recorded_at)||typeof item.reversed!=='boolean')
        return null;
      receipts.push({
        id:item.id,invoiceReference:item.invoice_reference,
        paymentReference:item.payment_reference,
        organizationName:item.organization_name,
        projectName:item.project_name as string|null,
        amountPaise:item.amount_paise,receivedOn:item.received_on,
        recordedAt:item.recorded_at,reversed:item.reversed
      });
    }
  }
  const cursor=input.nextCursor===null?null:parseJournalCursor(input.nextCursor);
  const entries=kind==='invoices'?invoices:receipts;
  if(cursor && (!entries.length||cursor.id.toLowerCase()!==entries[entries.length-1].id.toLowerCase()||
    cursor.at!==(kind==='invoices'?invoices[invoices.length-1].createdAt:receipts[receipts.length-1].recordedAt)))
    return null;
  return {kind,invoices,receipts,nextCursor:cursor};
}
