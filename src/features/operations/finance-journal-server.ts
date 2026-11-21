import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseFinanceJournal, type JournalKind, type JournalCursor} from './FinanceJournalContract';

export type JournalFilters=Readonly<{
 kind:JournalKind;status:string;search:string;from:string;to:string;cursor:JournalCursor|null;
}>;
export function financeJournalHref(filters:JournalFilters):string{
 const q=new URLSearchParams({kind:filters.kind});
 if(filters.status!=='all')q.set('status',filters.status);
 if(filters.search)q.set('search',filters.search);
 if(filters.from)q.set('from',filters.from);
 if(filters.to)q.set('to',filters.to);
 if(filters.cursor)q.set('cursor',JSON.stringify(filters.cursor));
 return '/admin/finance/journal?'+q.toString();
}
export async function loadFinanceJournal(filters:JournalFilters){
 const url=financeJournalHref(filters);
 const api='/api/finance/journal?'+url.slice(url.indexOf('?')+1);
 const response=await portalApi(api);
 if(response.kind==='unauthorized')redirect('/login');
 if(response.kind!=='ok')return null;
 return parseFinanceJournal(response.value,filters.kind);
}
