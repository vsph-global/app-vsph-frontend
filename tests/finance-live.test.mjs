import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
async function load(path){
 const source=await read(path);
 const output=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const context={exports:{}};
 vm.runInNewContext(output,context,{timeout:1000});
 return context.exports;
}
const organization='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const invoice='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const stamp='2026-11-17T12:34:56.123456+00:00';
const cursor={at:stamp,id:invoice,scope:'a'.repeat(32)};
test('INR overview preserves exact paise strings and rejects unsafe amounts',async()=>{
 const {parseFinanceOverview,rupeesFromPaise}=await load('src/features/operations/FinanceOverviewContract.ts');
 const summary={invoicedPaise:'10000000000000000001',collectedPaise:'0',
   outstandingPaise:'10000000000000000001',pastDuePaise:'0',issuedInvoices:1,
   voidInvoices:0,clients:1,projects:0};
 const good={summary,monthly:[{month_start:'2026-11-01',collected_paise:'0'}],
   asOf:'2026-11-17',currency:'INR',basis:'manual_cash_receipts'};
 assert.equal(parseFinanceOverview(good)?.summary.invoicedPaise,summary.invoicedPaise);
 assert.equal(rupeesFromPaise('123456'),'₹1,234.56');
 assert.equal(rupeesFromPaise('1.5'),'—');
 assert.equal(parseFinanceOverview({...good,summary:{...summary,collectedPaise:25.5}}),null);
 assert.equal(parseFinanceOverview({...good,monthly:[{month_start:'2026-11-17',collected_paise:'0'}]}),null);
});
test('finance journal enforces exact record shape, cursor precision and filtering',async()=>{
 const {parseFinanceJournal,parseJournalCursor}=await load('src/features/operations/FinanceJournalContract.ts');
 const row={id:invoice,reference:'INV-100',organization_id:organization,
   organization_name:'Example customer',project_id:null,project_name:null,
   amount_paise:'12500',collected_paise:'5000',currency:'INR',
   issued_on:'2026-11-01',due_on:'2026-11-30',status:'issued',version:1,created_at:stamp};
 const page={items:[row],nextCursor:cursor};
 assert.equal(parseJournalCursor(cursor)?.at,stamp);
 assert.equal(parseFinanceJournal(page,'invoices')?.invoices[0].amountPaise,'12500');
 assert.equal(parseFinanceJournal({...page,items:[row,row]},'invoices'),null);
 assert.equal(parseFinanceJournal({...page,items:[{...row,amount_paise:125.05}]},'invoices'),null);
 assert.equal(parseFinanceJournal({...page,nextCursor:{...cursor,scope:'zz'}},'invoices'),null);
 const receipt={id:invoice,invoice_reference:'INV-100',payment_reference:'PAY-100',
   organization_name:'Example customer',project_name:null,amount_paise:'5000',
   received_on:'2026-11-17',recorded_at:stamp,reversed:false};
 assert.equal(parseFinanceJournal({items:[receipt],nextCursor:null},'receipts')?.receipts[0].reversed,false);
 assert.equal(parseFinanceJournal({items:[{...receipt,reversed:'false'}],nextCursor:null},'receipts'),null);
});
test('owner journal queries remain server-side and expose no mutation actions',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const server=await read('src/features/operations/finance-journal-server.ts');
 const page=await read('src/app/(workspace)/admin/finance/journal/page.tsx');
 const overview=await read('src/app/(workspace)/admin/finance/page.tsx');
 assert.match(api,/permittedFinanceJournal/);
 assert.match(api,/validCursor/);
 assert.match(server,/portalApi\(api\)/);
 assert.match(server,/parseFinanceJournal\(response.value,filters.kind\)/);
 assert.match(page,/parseJournalCursor/);
 assert.match(page,/result.nextCursor/);
 assert.match(page,/rupeesFromPaise\(x.amountPaise\)/);
 assert.match(overview,/href="\/admin\/finance\/journal"/);
 assert.doesNotMatch(page+server,/exampleInvoices|OperationsFixtures|localStorage|sessionStorage|method:'POST'|method:"POST"/);
});
