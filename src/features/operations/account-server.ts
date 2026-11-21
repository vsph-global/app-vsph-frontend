import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseOwnProfile,parseOwnSessions} from './AccountSelfServiceContract';
export async function loadOwnProfile(){
 const result=await portalApi('/api/account/profile');
 if(result.kind==='unauthorized')redirect('/login');
 return result.kind==='ok'?parseOwnProfile(result.value):null;
}
export async function loadOwnSessions(){
 const result=await portalApi('/api/account/sessions');
 if(result.kind==='unauthorized')redirect('/login');
 return result.kind==='ok'?parseOwnSessions(result.value):null;
}
