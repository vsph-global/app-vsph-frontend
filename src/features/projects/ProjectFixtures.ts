import type { ProjectModel } from './ProjectModel';

// Fictional data strictly for the development-only preview.
const example = (
 id:string,key:string,name:string,kind:ProjectModel['kind'],
 status:ProjectModel['status'],priority:ProjectModel['priority'],
):ProjectModel=>({
 id,key,name,kind,status,priority,dueOn:'2026-12-18',
 description:'Illustrative workstream for the UI migration preview.',
 owner:'Preview Owner',manager:'Example Manager',
 tasks:[],milestones:[],members:[],applications:[],
 deliverables:[],updates:[],events:[],resources:[],
});
const primary=example('sample-1','CRM-PORTAL','Example CRM rollout','customer','active','high');
primary.tasks=[
 {id:'t1',title:'Review navigation',status:'done',priority:'normal',assignee:'Example Engineer',dueOn:'2026-11-10'},
 {id:'t2',title:'Complete responsive QA',status:'in_progress',priority:'high',assignee:'Example Engineer',dueOn:'2026-11-21'},
 {id:'t3',title:'Resolve access checks',status:'blocked',priority:'urgent',assignee:'Example Reviewer',
  dueOn:'2026-11-14',description:'Awaiting verified backend authorization'},
 {id:'t4',title:'Prepare handoff',status:'review',priority:'normal',assignee:'Example Manager',dueOn:'2026-11-25'},
];
primary.milestones=[
 {id:'m1',title:'Foundation ready',status:'done',dueOn:'2026-11-09',
  checks:[{id:'c1',title:'Confirm scope',done:true},{id:'c2',title:'Align components',done:true}]},
 {id:'m2',title:'Frontend acceptance',status:'active',dueOn:'2026-11-22',
  checks:[{id:'c3',title:'Review layout',done:true},{id:'c4',title:'Test responsive views',done:false}]},
 {id:'m3',title:'Release readiness',status:'planned',dueOn:'2026-12-04',
  checks:[{id:'c5',title:'Verify authorization',done:false}]},
];
primary.members=[
 {id:'u1',name:'Example Manager',email:'manager@example.invalid',team:'Projects',role:'manager',status:'active'},
 {id:'u2',name:'Example Engineer',email:'engineer@example.invalid',team:'Engineering',role:'contributor',status:'active'},
 {id:'u3',name:'Example Reviewer',email:'reviewer@example.invalid',team:'QA',role:'viewer',status:'invited'},
];
primary.applications=[
 {id:'a1',name:'Example CRM',kind:'product',status:'active',description:'Reusable CRM product',shared:true},
 {id:'a2',name:'Example Client Portal',kind:'custom',status:'building',description:'Custom project deliverable',shared:false},
];
primary.deliverables=[
 {id:'d1',title:'Design specification',status:'accepted'},
 {id:'d2',title:'Responsive interface',status:'review'},
];
primary.updates=[
 {id:'w1',author:'Example Manager',date:'13 Nov',summary:'Frontend review is underway'},
 {id:'w2',author:'Example Engineer',date:'6 Nov',summary:'Component migration started'},
];
primary.events=[
 {id:'e1',label:'Milestone updated',actor:'Example Manager',when:'13 Nov'},
 {id:'e2',label:'Task created',actor:'Example Engineer',when:'11 Nov'},
];
primary.resources=[
 {title:'Design reference',description:'Illustrative design-system documentation'},
 {title:'Release checklist',description:'Sample acceptance requirements'},
];
export const exampleProjects:ProjectModel[]=[
 primary,
 example('sample-2','GUEST-PORTAL','Example guest portal','customer','paused','normal'),
 example('sample-3','OPS-REVIEW','Example operations review','internal','active','high'),
 example('sample-4','EDU-PLATFORM','Example education platform','customer','planned','normal'),
 example('sample-5','BILLING-UX','Example billing UX','internal','completed','low'),
 example('sample-6','MOBILE-PILOT','Example mobile pilot','customer','active','urgent'),
 example('sample-7','LEGACY-ARCH','Example archived project','internal','archived','low'),
];
