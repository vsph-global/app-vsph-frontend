import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {parseProvisioningJobs} from './ProvisioningLiveContract';

export async function loadProvisioningQueue(){
 const session=await portalApi('/api/auth/me');
 if(session.kind==='unauthorized')redirect('/login');
 const identity=session.kind==='ok'?portalIdentity(session.value):null;
 if(!identity||identity.platformRole!=='super_admin')return null;
 const result=await portalApi('/api/admin-management/onboardings');
 if(result.kind==='unauthorized')redirect('/login');
 if(result.kind!=='ok')return null;
 return parseProvisioningJobs(result.value);
}
