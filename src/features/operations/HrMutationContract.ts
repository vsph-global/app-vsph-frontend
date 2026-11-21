import {employeeUuid} from './EmployeeEditContract';
export type HrAction='leave-review'|'attendance-incomplete';
export type HrCommand={path:string;body:Record<string,unknown>};
const object=(x:unknown):x is Record<string,unknown>=>x!==null&&
 typeof x==='object'&&!Array.isArray(x);
function exact(x:Record<string,unknown>,keys:string[]){
 return Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
}
export function hrMutation(kind:string,id:string,input:unknown):HrCommand|null{
 if(!employeeUuid.test(id)||!object(input)||
   !Number.isSafeInteger(input.version)||(input.version as number)<1||
   (input.version as number)>2147483646||input.confirmed!==true||
   typeof input.note!=='string'||input.note.length>300||
   /[\u0000-\u001f\u007f]/.test(input.note))return null;
 if(kind==='leave-review'){
   if(!exact(input,['version','decision','note','confirmed'])||
     !['approved','rejected'].includes(String(input.decision)))return null;
   return {path:'/api/hrms/leave/'+id+'/review',body:input};
 }
 if(kind==='attendance-incomplete'){
   if(!exact(input,['version','note','confirmed'])||input.note.trim().length<8)return null;
   return {path:'/api/hrms/attendance/'+id+'/incomplete',
     body:{...input,note:input.note.trim()}};
 }
 return null;
}
