import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {loadCustomerList} from './customer-server';
import {parsePermissionContext,validPermissionId} from './PermissionLiveContract';

export async function loadPermissionDirectory(afterId:string|null,organizationId:string|null){
 if((afterId!==null&&!validPermissionId(afterId))||
   (organizationId!==null&&!validPermissionId(organizationId)))return null;
 const list=await loadCustomerList(afterId);
 if(!list)return null;
 if(!organizationId)return {directory:list,organization:null};
 const detail=await portalApi('/api/admin-management/customers/'+organizationId);
 if(detail.kind==='unauthorized')redirect('/login');
 if(detail.kind!=='ok')return null;
 const organization=parsePermissionContext(detail.value);
 if(!organization||organization.id.toLowerCase()!==organizationId.toLowerCase())return null;
 return {directory:list,organization};
}
