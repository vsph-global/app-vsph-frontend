/** Trust only backend-authorized, linked internal employees for workforce management.
 * This payload is NOT a list of all platform users or customer organization members.
 */
export type WorkforceMember = {
  userId: string;
  name: string;
  department: string;
  jobTitle: string;
  role: 'manager'|'contributor'|'viewer'|null;
  membership: 'active'|'revoked'|null;
  team: string;
  openTasks: number;
};
export type ProjectWorkforce = {
  canAssign: boolean;
  canGovernManagers: boolean;
  staff: WorkforceMember[];
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object=(x:unknown):x is Record<string,unknown> =>
  x!==null && typeof x==='object' && !Array.isArray(x);
const short=(x:unknown,max:number):x is string =>
  typeof x==='string' && x.length<=max;
export function parseProjectWorkforce(value:unknown):ProjectWorkforce|null {
  if(!object(value) || typeof value.canAssign!=='boolean' ||
     typeof value.canGovernManagers!=='boolean' ||
     !Array.isArray(value.staff) || value.staff.length>200) return null;
  const ids=new Set<string>();
  const staff:WorkforceMember[]=[];
  for(const person of value.staff) {
    if(!object(person) || typeof person.user_id!=='string' ||
       !uuid.test(person.user_id) || !short(person.full_name,200) ||
       !person.full_name.trim() || !short(person.department,150) ||
       !(person.job_title===null || short(person.job_title,150)) ||
       !(person.project_role===null || ['manager','contributor','viewer'].includes(person.project_role as string)) ||
       !(person.membership_status===null || ['active','revoked'].includes(person.membership_status as string)) ||
       !(person.team===null || short(person.team,100)) ||
       !Number.isSafeInteger(person.open_tasks) || (person.open_tasks as number)<0 ||
       (person.open_tasks as number)>500) return null;
    const id=person.user_id.toLowerCase();
    if(ids.has(id)) return null;
    ids.add(id);
    staff.push({
      userId:person.user_id,name:person.full_name,
      department:person.department,jobTitle:person.job_title??'',
      role:person.project_role as WorkforceMember['role'],
      membership:person.membership_status as WorkforceMember['membership'],
      team:person.team??'',openTasks:person.open_tasks as number
    });
  }
  return {canAssign:value.canAssign,canGovernManagers:value.canGovernManagers,staff};
}

export type WorkforceAction = 'assign'|'remove'|'manager-grant'|'manager-revoke';
export type WorkforceInput = {
 version:number;userId:string;role?:'contributor'|'viewer';team?:string;
};
export function parseWorkforceAction(action:WorkforceAction,value:unknown):
  {ok:true;data:WorkforceInput}|{ok:false;error:string} {
  const bad={ok:false as const,error:'Invalid workforce action. Reload and check the project team.'};
  if(!object(value) || !Number.isSafeInteger(value.version) ||
     (value.version as number)<1 || (value.version as number)>999999998 ||
     typeof value.userId!=='string'||!uuid.test(value.userId)) return bad;
  const keys=Object.keys(value).sort();
  if(action==='assign') {
    if(keys.join(',')!=='role,team,userId,version' ||
       !['contributor','viewer'].includes(value.role as string) ||
       !short(value.team,100) ||
       /[\u0000-\u001f\u007f]/.test(value.team as string)) return bad;
    return {ok:true,data:{version:value.version as number,userId:value.userId,
      role:value.role as 'contributor'|'viewer',team:value.team as string}};
  }
  if(keys.join(',')!=='userId,version') return bad;
  return {ok:true,data:{version:value.version as number,userId:value.userId}};
}
