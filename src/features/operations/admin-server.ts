import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {parseAdminOverview,parseAdminAudit} from './AdminLiveContract';

/** Never render platform admin data until active owner session is verified. */
export async function loadAdminWorkspace(){
 const identity=await portalApi('/api/auth/me');
 if(identity.kind==='unauthorized')redirect('/login');
 const user=identity.kind==='ok'?portalIdentity(identity.value):null;
 if(!user||user.platformRole!=='super_admin')return null;
 const [overview,audit]=await Promise.all([
   portalApi('/api/admin-management/overview'),
   portalApi('/api/admin-management/audit-logs')
 ]);
 if(overview.kind==='unauthorized'||audit.kind==='unauthorized')redirect('/login');
 return {
   overview:overview.kind==='ok'?parseAdminOverview(overview.value):null,
   audit:audit.kind==='ok'?parseAdminAudit(audit.value):null
 };
}
