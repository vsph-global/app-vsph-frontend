/** Authenticated HRMS list responses. No unauthenticated or preview records. */
export type LeaveRow=Readonly<{
 id:string;employeeId:string;employeeName:string;startOn:string;endOn:string;
 kind:'annual'|'sick'|'unpaid'|'other';reason:string;
 status:'pending'|'approved'|'rejected'|'cancelled';version:number;
 requestedAt:string;decisionNote:string;
}>;
export type AttendanceRow=Readonly<{
 id:string;employeeId:string;employeeName:string;workDay:string;
 checkedInAt:string;checkedOutAt:string|null;
 status:'open'|'closed'|'incomplete';version:number;recoveryNote:string|null;
}>;
export type HrPage<T>=Readonly<{role:'owner'|'hr';items:T[];nextId:string|null}>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&
 typeof v==='object'&&!Array.isArray(v);
const id=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x);
const date=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const version=(x:unknown)=>Number.isSafeInteger(x)&&(x as number)>=1;
const str=(x:unknown,max:number)=>typeof x==='string'&&x.length<=max;
function base(input:unknown):{role:'owner'|'hr';items:unknown[];nextId:string|null}|null{
 if(!obj(input)||!['owner','hr'].includes(String(input.role))||
   !Array.isArray(input.items)||input.items.length>25||
   !(input.nextId===null||id(input.nextId)))return null;
 return {role:input.role as 'owner'|'hr',items:input.items,nextId:input.nextId as string|null};
}
export function parseLeavePage(input:unknown):HrPage<LeaveRow>|null{
 const page=base(input);if(!page)return null;
 const seen=new Set<string>(),items:LeaveRow[]=[];
 for(const r of page.items){
   if(!obj(r)||!id(r.id)||!id(r.employee_id)||seen.has(r.id.toLowerCase())||
     !str(r.employee_name,150)||!date(r.start_on)||!date(r.end_on)||
     !['annual','sick','unpaid','other'].includes(String(r.kind))||
     !str(r.reason,500)||!['pending','approved','rejected','cancelled'].includes(String(r.status))||
     !version(r.version)||!str(r.requested_at,80)||Number.isNaN(Date.parse(r.requested_at as string))||
     !str(r.decision_note,300))return null;
   seen.add(r.id.toLowerCase());
   items.push({
     id:r.id,employeeId:r.employee_id,employeeName:r.employee_name as string,
     startOn:r.start_on as string,endOn:r.end_on as string,
     kind:r.kind as LeaveRow['kind'],reason:r.reason as string,
     status:r.status as LeaveRow['status'],version:r.version as number,
     requestedAt:r.requested_at as string,decisionNote:r.decision_note as string
   });
 }
 if(page.nextId&&(!items.length||page.nextId.toLowerCase()!==items[items.length-1].id.toLowerCase()))
   return null;
 return {...page,items};
}
export function parseAttendancePage(input:unknown):HrPage<AttendanceRow>|null{
 const page=base(input);if(!page)return null;
 const seen=new Set<string>(),items:AttendanceRow[]=[];
 for(const r of page.items){
   if(!obj(r)||!id(r.id)||!id(r.employee_id)||seen.has(r.id.toLowerCase())||
     !str(r.employee_name,150)||!date(r.work_day)||
     !str(r.checked_in_at,80)||Number.isNaN(Date.parse(r.checked_in_at as string))||
     !(r.checked_out_at===null||(str(r.checked_out_at,80)&&
       !Number.isNaN(Date.parse(r.checked_out_at as string))))||
     !['open','closed','incomplete'].includes(String(r.status))||
     !version(r.version)||!(r.recovery_note===null||str(r.recovery_note,300)))return null;
   seen.add(r.id.toLowerCase());
   items.push({
     id:r.id,employeeId:r.employee_id,employeeName:r.employee_name as string,
     workDay:r.work_day as string,checkedInAt:r.checked_in_at as string,
     checkedOutAt:r.checked_out_at as string|null,
     status:r.status as AttendanceRow['status'],version:r.version as number,
     recoveryNote:r.recovery_note as string|null
   });
 }
 if(page.nextId&&(!items.length||page.nextId.toLowerCase()!==items[items.length-1].id.toLowerCase()))
   return null;
 return {...page,items};
}
