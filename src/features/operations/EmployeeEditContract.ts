/** Exact backend POST /api/employees/:id/update form; browser data never authorizes HR. */
import { departments } from './OperationsModels';
import type { EmployeeStatus, EmployeeType } from './EmployeeLiveContract';
export type EmployeeUpdate=Readonly<{
  fullName:string;department:string;jobTitle:string;employmentType:EmployeeType;
  startDate:string;version:number;status:EmployeeStatus;confirmed:true;
}>;
const control=/[\u0000-\u001f\u007f]/;
export const employeeUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function obj(x:unknown):x is Record<string,unknown>{
 return x!==null&&typeof x==='object'&&!Array.isArray(x);
}
const types=new Set(['full_time','part_time','intern','contract']);
const statuses=new Set(['onboarding','active','on_leave','inactive']);
export function parseEmployeeUpdate(input:unknown):EmployeeUpdate|null{
 if(!obj(input))return null;
 const fields=['fullName','department','jobTitle','employmentType','startDate',
   'version','status','confirmed'];
 if(Object.keys(input).length!==fields.length||fields.some(k=>!Object.hasOwn(input,k))||
  typeof input.fullName!=='string'||!input.fullName.trim()||input.fullName.length>150||
  control.test(input.fullName)||
  typeof input.department!=='string'||!departments.includes(input.department as typeof departments[number])||
  typeof input.jobTitle!=='string'||!input.jobTitle.trim()||input.jobTitle.length>120||
  control.test(input.jobTitle)||
  typeof input.employmentType!=='string'||!types.has(input.employmentType)||
  typeof input.status!=='string'||!statuses.has(input.status)||
  typeof input.startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)||
  Number.isNaN(Date.parse(input.startDate))||
  new Date(input.startDate).toISOString().slice(0,10)!==input.startDate||
  !Number.isSafeInteger(input.version)||(input.version as number)<1||
  (input.version as number)>2147483647||input.confirmed!==true)return null;
 return {
   fullName:(input.fullName as string).trim(),department:input.department as string,
   jobTitle:(input.jobTitle as string).trim(),employmentType:input.employmentType as EmployeeType,
   startDate:input.startDate as string,version:input.version as number,
   status:input.status as EmployeeStatus,confirmed:true
 };
}
