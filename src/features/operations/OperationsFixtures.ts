import type {Employee,LeaveRequest,Attendance,Organization,
 LedgerInvoice,LedgerReceipt,ProductRecord,AuditEvent,Notice} from './OperationsModels';
// All records in this module are fictional, isolated from server-side routes.
// The .invalid TLD makes example addresses non-deliverable by design.
export const exampleEmployees:Employee[]=[
 ['e1','Example Manager','Human Resources','HR Manager','active',true],
 ['e2','Example Engineer','Engineering','Software Engineer','active',false],
 ['e3','Example Developer','Engineering','Frontend Developer','active',false],
 ['e4','Example Analyst','Finance','Finance Analyst','on_leave',false],
 ['e5','Example Specialist','Marketing','Marketing Specialist','active',false],
 ['e6','Example Coordinator','Customer Support','Support Associate','onboarding',false],
 ['e7','Example Consultant','Sales & Business Development','Business Developer','active',false],
 ['e8','Example Designer','Engineering','Product Designer','active',false],
 ['e9','Example Recruiter','Human Resources','Talent Partner','active',false],
 ['e10','Example Intern','Engineering','Developer Intern','onboarding',false],
 ['e11','Example Archivist','Finance','Former Analyst','archived',false],
 ['e12','Example Associate','Customer Support','Support Specialist','inactive',false],
].map(([id,fullName,department,jobTitle,status,isHr],index)=>({
 id:String(id),fullName:String(fullName),
 email:String(id)+'@example.invalid',department:String(department),jobTitle:String(jobTitle),
 employmentType:(index===9?'intern':index===6?'contract':'full_time') as Employee['employmentType'],
 startDate:'2026-0'+(index%8+1)+'-05',
 status:status as Employee['status'],isHr:Boolean(isHr),
}));
export const exampleLeaves:LeaveRequest[]=[
 {id:'l1',employee:'Example Engineer',type:'Annual',from:'2026-11-20',through:'2026-11-22',
  status:'pending',reason:'Example planned time away'},
 {id:'l2',employee:'Example Analyst',type:'Sick',from:'2026-11-10',through:'2026-11-12',
  status:'approved',reason:'Fictional leave request'},
 {id:'l3',employee:'Example Designer',type:'Personal',from:'2026-11-27',through:'2026-11-27',
  status:'rejected',reason:'Illustrative request'},
];
export const exampleAttendance:Attendance[]=[
 {id:'a1',employee:'Example Engineer',date:'2026-11-12',in:'09:30',out:'17:45'},
 {id:'a2',employee:'Example Manager',date:'2026-11-12',in:'09:20',out:'18:00'},
 {id:'a3',employee:'Example Specialist',date:'2026-11-11',in:'10:10',out:'18:15'},
];
export const exampleOrganizations:Organization[]=[
 {id:'org1',name:'Example Client One',slug:'example-client-one',status:'active',
  owner:'Example Owner',
  members:[
   {id:'m1',name:'Example Customer Owner',email:'owner1@example.invalid',role:'owner',status:'active'},
   {id:'m2',name:'Example Operator',email:'operator@example.invalid',role:'admin',status:'active'},
   {id:'m3',name:'Example Viewer',email:'viewer@example.invalid',role:'viewer',status:'invited'},
  ],
  subscriptions:[
   {product:'CRM Enterprise',plan:'business',status:'active',role:'admin',renewal:'2027-01-31'},
   {product:'Music',plan:'trial',status:'trial',role:'viewer',renewal:'2026-12-01'},
  ],
  invites:[{id:'i1',name:'viewer@example.invalid',status:'Pending acceptance'}],
  changes:[{id:'c1',event:'Example access review',when:'2026-11-12'},
   {id:'c2',event:'Example organization created',when:'2026-11-04'}],
 },
 {id:'org2',name:'Example Client Two',slug:'example-client-two',status:'suspended',
  owner:'Example Owner',
  members:[{id:'m4',name:'Example Contact',email:'contact2@example.invalid',role:'owner',status:'active'}],
  subscriptions:[{product:'Outreach',plan:'starter',status:'past_due',role:'suspended',
   renewal:'2026-10-30'}],
  invites:[{id:'i2',name:'newcontact@example.invalid',status:'Expired'}],
  changes:[{id:'c3',event:'Example suspension',when:'2026-11-01'}],
 },
 {id:'org3',name:'Example Internal Unit',slug:'example-internal',status:'active',
  owner:'Preview Owner',
  members:[{id:'m5',name:'Preview Member',email:'member@example.invalid',role:'admin',status:'active'}],
  subscriptions:[{product:'CRM Enterprise',plan:'internal',status:'active',role:'user',
   renewal:'2027-06-30'}],
  invites:[],changes:[{id:'c4',event:'Example subscription granted',when:'2026-11-10'}],
 },
];
export const exampleProducts:ProductRecord[]=[
 {id:'p1',code:'CRM',name:'CRM Enterprise',status:'active',visibility:'catalog'},
 {id:'p2',code:'OUTREACH',name:'Outreach',status:'maintenance',visibility:'internal'},
 {id:'p3',code:'MUSIC',name:'Music',status:'active',visibility:'catalog'},
];
export const exampleInvoices:LedgerInvoice[]=[
 {id:'fi1',reference:'INV-EXAMPLE-001',customer:'Example Client One',project:'Example CRM',
  invoiced:24000,collected:12000,due:'2026-11-25',issued:'2026-11-02',status:'issued'},
 {id:'fi2',reference:'INV-EXAMPLE-002',customer:'Example Client One',project:'Example Music',
  invoiced:18000,collected:18000,due:'2026-11-10',issued:'2026-10-22',status:'paid'},
 {id:'fi3',reference:'INV-EXAMPLE-003',customer:'Example Client Two',project:'Example Portal',
  invoiced:15000,collected:5000,due:'2026-10-18',issued:'2026-10-01',status:'past_due'},
 {id:'fi4',reference:'INV-EXAMPLE-004',customer:'Example Internal Unit',project:'Internal',
  invoiced:4500,collected:0,due:'2026-11-20',issued:'2026-11-04',status:'void'},
];
export const exampleReceipts:LedgerReceipt[]=[
 {id:'fr1',reference:'RECEIPT-SAMPLE-001',invoice:'INV-EXAMPLE-001',
  amount:12000,received:'2026-11-06',status:'recorded'},
 {id:'fr2',reference:'RECEIPT-SAMPLE-002',invoice:'INV-EXAMPLE-002',
  amount:18000,received:'2026-10-29',status:'recorded'},
 {id:'fr3',reference:'RECEIPT-SAMPLE-003',invoice:'INV-EXAMPLE-003',
  amount:5000,received:'2026-10-12',status:'recorded'},
 {id:'fr4',reference:'RECEIPT-SAMPLE-004',invoice:'INV-EXAMPLE-004',
  amount:0,received:'2026-11-05',status:'reversed'},
];
export const exampleAudit:AuditEvent[]=[
 {id:'au1',actor:'Preview Owner',action:'Product registration',target:'Example CRM',when:'2026-11-12'},
 {id:'au2',actor:'Example Manager',action:'Employee removed',target:'Example Former Analyst',when:'2026-11-10'},
 {id:'au3',actor:'Preview Owner',action:'Organization created',target:'Example Client One',when:'2026-11-05'},
 {id:'au4',actor:'Preview Owner',action:'Role updated',target:'Example Manager',when:'2026-10-28'},
];
export const exampleNotices:Notice[]=[
 {id:'n1',title:'Task assigned',message:'Example CRM · Responsive QA',
  kind:'assignments',date:'2026-11-13',read:false},
 {id:'n2',title:'Milestone updated',message:'Example Portal · Design handoff',
  kind:'delivery',date:'2026-11-12',read:false},
 {id:'n3',title:'Work overdue',message:'Example CRM · QA task',
  kind:'overdue',date:'2026-11-10',read:true},
];
