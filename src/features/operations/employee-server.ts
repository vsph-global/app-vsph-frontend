import { redirect } from 'next/navigation';
import { portalApi } from '@/features/workspace/server-api';
import { parseEmployeeRoster, type EmployeeRoster, type EmployeeStatus } from './EmployeeLiveContract';

type EmployeeFilters={search:string;status:'all'|EmployeeStatus;afterId:string|null};
/** Server-only, authenticated roster. Invalid backend shape fails closed. */
export async function loadEmployeeRoster(filters:EmployeeFilters):Promise<EmployeeRoster|null>{
  const params=new URLSearchParams({search:filters.search,status:filters.status});
  if(filters.afterId)params.set('afterId',filters.afterId);
  const response=await portalApi('/api/employees?'+params.toString());
  if(response.kind==='unauthorized')redirect('/login');
  if(response.kind!=='ok')return null;
  return parseEmployeeRoster(response.value);
}
