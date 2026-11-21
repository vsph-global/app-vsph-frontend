/** Authenticated VSPH internal employee roster projection.
 * Counts and employee details are supplied only by the authorized backend.
 * Do not use public profiles, preview fixtures, or client-side role checks as access grants.
 */
export type EmployeeStatus='onboarding'|'active'|'on_leave'|'inactive';
export type EmployeeType='full_time'|'part_time'|'intern'|'contract';
export type RosterEmployee=Readonly<{
 id:string;fullName:string;email:string;department:string;jobTitle:string;
 employmentType:EmployeeType;startDate:string;status:EmployeeStatus;
 version:number;isHr:boolean;
}>;
export type EmployeeRoster=Readonly<{
 role:'owner'|'hr';canManageHr:boolean;employees:RosterEmployee[];
 hasMore:boolean;nextCursor:string|null;
 counts:Readonly<{total:number;active:number;onboarding:number;onLeave:number;inactive:number;hrManagers:number}>;
 departments:ReadonlyArray<{department:string;members:number}>;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=new Set(['onboarding','active','on_leave','inactive']);
const types=new Set(['full_time','part_time','intern','contract']);
const nonNegative=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&
 typeof v==='object'&&!Array.isArray(v);
const textValue=(v:unknown,max:number):v is string=>typeof v==='string'&&
 !!v.trim()&&v.length<=max&& !/[\u0000-\u001f\u007f]/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
export function parseEmployeeRoster(value:unknown):EmployeeRoster|null{
 if(!object(value)||!['owner','hr'].includes(String(value.role))||
   typeof value.canManageHr!=='boolean'||
   (value.role==='hr'&&value.canManageHr)||
   !Array.isArray(value.employees)||value.employees.length>51||
   !object(value.counts)||!Array.isArray(value.departments)||value.departments.length>10)
   return null;
 const counts=value.counts;
 const countKeys=['total','active','onboarding','onLeave','inactive','hrManagers'] as const;
 if(countKeys.some(k=>!nonNegative(counts[k]))|| (counts.active as number)> (counts.total as number)||
   (counts.onboarding as number)>(counts.total as number)||
   (counts.onLeave as number)>(counts.total as number)||
   (counts.inactive as number)>(counts.total as number))return null;
 const seen=new Set<string>(),employees:RosterEmployee[]=[];
 for(const row of value.employees){
   if(!object(row)||!uuid(row.id)||seen.has(row.id.toLowerCase())||
     !textValue(row.full_name,150)||!textValue(row.email,190)||
     !textValue(row.department,100)||!textValue(row.job_title,120)||
     !types.has(String(row.employment_type))||!statuses.has(String(row.status))||
     typeof row.start_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)||
     !Number.isSafeInteger(row.version)||(row.version as number)<1||
     typeof row.is_hr!=='boolean')return null;
   seen.add(row.id.toLowerCase());
   employees.push({
     id:row.id,fullName:row.full_name,email:row.email,
     department:row.department,jobTitle:row.job_title,
     employmentType:row.employment_type as EmployeeType,startDate:row.start_date,
     status:row.status as EmployeeStatus,version:row.version as number,isHr:row.is_hr,
   });
 }
 const departments:{department:string;members:number}[]=[];
 const departmentsSeen=new Set<string>();
 for(const row of value.departments){
   if(!object(row)||!textValue(row.department,100)||departmentsSeen.has(row.department)||
     !nonNegative(row.members))return null;
   departmentsSeen.add(row.department);
   departments.push({department:row.department,members:row.members});
 }
 const hasMore=employees.length>50;
 const visible=employees.slice(0,50);
 return {
   role:value.role as EmployeeRoster['role'],
   canManageHr:value.canManageHr,employees:visible,hasMore,
   nextCursor:hasMore&&visible.length?visible[visible.length-1].id:null,
   counts:{
     total:counts.total as number,active:counts.active as number,
     onboarding:counts.onboarding as number,onLeave:counts.onLeave as number,
     inactive:counts.inactive as number,hrManagers:counts.hrManagers as number,
   },departments,
 };
}
