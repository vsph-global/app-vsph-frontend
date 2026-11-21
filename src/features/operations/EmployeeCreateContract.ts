import { departments } from './OperationsModels';
import type { EmployeeType } from './EmployeeLiveContract';
export type EmployeeCreate=Readonly<{
 fullName:string;email:string;department:string;jobTitle:string;
 employmentType:EmployeeType;startDate:string;
}>;
const object=(x:unknown):x is Record<string,unknown>=>x!==null&&
 typeof x==='object'&&!Array.isArray(x);
const control=/[\u0000-\u001f\u007f]/;
const valid=(x:unknown,max:number)=>typeof x==='string'&&!!x.trim()&&
 x.length<=max&&!control.test(x);
export function parseEmployeeCreate(input:unknown):EmployeeCreate|null{
 if(!object(input))return null;
 const keys=['fullName','email','department','jobTitle','employmentType','startDate'];
 if(Object.keys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k))||
   !valid(input.fullName,150)||!valid(input.email,190)||!valid(input.jobTitle,120)||
   typeof input.email!=='string'||!/^\S+@\S+\.\S+$/.test(input.email)||
   typeof input.department!=='string'||
   !departments.includes(input.department as typeof departments[number])||
   !['full_time','part_time','intern','contract'].includes(String(input.employmentType))||
   typeof input.startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)||
   Number.isNaN(Date.parse(input.startDate))||
   new Date(input.startDate).toISOString().slice(0,10)!==input.startDate)return null;
 return {
   fullName:(input.fullName as string).trim(),
   email:(input.email as string).toLowerCase().trim(),
   department:input.department as string,
   jobTitle:(input.jobTitle as string).trim(),
   employmentType:input.employmentType as EmployeeType,
   startDate:input.startDate as string
 };
}
