import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {parseOnboardingCatalog} from './ClientOnboardingContract';

export async function loadClientOnboardingCatalog(){
 const identity=await portalApi('/api/auth/me');
 if(identity.kind==='unauthorized')redirect('/login');
 const user=identity.kind==='ok'?portalIdentity(identity.value):null;
 if(!user||user.platformRole!=='super_admin')return null;
 const result=await portalApi('/api/admin-management/lookups');
 if(result.kind==='unauthorized')redirect('/login');
 if(result.kind!=='ok')return null;
 return parseOnboardingCatalog(result.value);
}
