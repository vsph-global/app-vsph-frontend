import {employeeUuid} from './EmployeeEditContract';
export type CustomerMemberChange=Readonly<{
 userId:string;version:number;role:'owner'|'admin'|'member'|'viewer';
 status:'active'|'suspended';
}>;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&
 typeof x==='object'&&!Array.isArray(x);
export function parseCustomerMemberChange(input:unknown):CustomerMemberChange|null{
 if(!obj(input))return null;
 const fields=['userId','version','role','status'];
 if(Object.keys(input).length!==fields.length||fields.some(k=>!Object.hasOwn(input,k))||
   typeof input.userId!=='string'||!employeeUuid.test(input.userId)||
   !Number.isSafeInteger(input.version)||(input.version as number)<1||
   (input.version as number)>2147483647||
   !['owner','admin','member','viewer'].includes(String(input.role))||
   !['active','suspended'].includes(String(input.status)))return null;
 return {
   userId:input.userId as string,version:input.version as number,
   role:input.role as CustomerMemberChange['role'],
   status:input.status as CustomerMemberChange['status']
 };
}
