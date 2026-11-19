/** Display-only contracts; no access decisions are made from these types. */
export const departments = ['Engineering','Marketing','Human Resources','Finance',
  'Customer Support','Sales & Business Development'] as const;
export type EmployeeState = 'onboarding'|'active'|'on_leave'|'inactive'|'archived';
export type Employee = {
  id:string;fullName:string;email:string;department:string;jobTitle:string;
  employmentType:'full_time'|'part_time'|'intern'|'contract';startDate:string;
  status:EmployeeState;isHr:boolean;
};
export type LeaveRequest = {id:string;employee:string;type:string;
  from:string;through:string;status:'pending'|'approved'|'rejected';reason:string};
export type Attendance = {id:string;employee:string;date:string;in:string;out:string};
export type Subscription = {product:string;plan:string;status:string;role:string;renewal:string};
export type OrgMember = {id:string;name:string;email:string;role:string;status:string};
export type Organization = {id:string;name:string;slug:string;status:'active'|'suspended'|'closed';
  owner:string;members:OrgMember[];subscriptions:Subscription[];invites:{id:string;name:string;status:string}[];
  changes:{id:string;event:string;when:string}[]};
export type LedgerInvoice={id:string;reference:string;customer:string;project:string;
  invoiced:number;collected:number;due:string;issued:string;status:'issued'|'void'|'paid'|'past_due'};
export type LedgerReceipt={id:string;reference:string;invoice:string;amount:number;
  received:string;status:'recorded'|'reversed'};
export type ProductRecord={id:string;code:string;name:string;status:string;visibility:string};
export type AuditEvent={id:string;actor:string;action:string;target:string;when:string};
export type Notice={id:string;title:string;message:string;kind:string;date:string;read:boolean};
