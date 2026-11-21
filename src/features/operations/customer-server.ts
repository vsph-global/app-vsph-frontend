import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseCustomerList,parseCustomerDetail} from './CustomerLiveContract';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function loadCustomerList(afterId:string|null){
 if(afterId&&!uuid.test(afterId))return null;
 const params=new URLSearchParams();
 if(afterId)params.set('afterId',afterId);
 const response=await portalApi('/api/admin-management/customers?'+params.toString());
 if(response.kind==='unauthorized')redirect('/login');
 if(response.kind!=='ok')return null;
 return parseCustomerList(response.value);
}
export async function loadCustomerDetail(id:string){
 if(!uuid.test(id))return null;
 const response=await portalApi('/api/admin-management/customers/'+id);
 if(response.kind==='unauthorized')redirect('/login');
 if(response.kind!=='ok')return null;
 const detail=parseCustomerDetail(response.value);
 return detail?.organization.id.toLowerCase()===id.toLowerCase()?detail:null;
}
