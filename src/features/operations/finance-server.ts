import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseFinanceOverview} from './FinanceOverviewContract';
export async function loadFinanceOverview(){
 const result=await portalApi('/api/finance/overview');
 if(result.kind==='unauthorized')redirect('/login');
 return result.kind==='ok'?parseFinanceOverview(result.value):null;
}
