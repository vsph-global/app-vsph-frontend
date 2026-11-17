import type { OwnerDashboardModel } from './OwnerDashboard';
import type { EmployeeDashboardModel } from './EmployeeDashboard';

/** Explicitly fictional values. This module is imported only by local preview. */
export const ownerPreviewData: OwnerDashboardModel = {
  cashCollected: 724000, invoiced: 915000, outstanding: 191000, pastDue: 48000,
  months: [
    { month: 'Jun', collected: 87000 }, { month: 'Jul', collected: 104000 },
    { month: 'Aug', collected: 121000 }, { month: 'Sep', collected: 110000 },
    { month: 'Oct', collected: 143000 }, { month: 'Nov', collected: 159000 },
  ],
  customers: 12, activeProjects: 9, employees: 18,
  products: [
    {code:'CRM', name:'CRM Enterprise',description:'Customer relationships'},
    {code:'OUTREACH', name:'Outreach',description:'Campaign management'},
    {code:'MUSIC', name:'Music',description:'Venue experiences'},
  ],
  completion: 68, completedProjects: 5, openTasks: 27, doneTasks: 57,
  blockedTasks: 4, overdueTasks: 3, overdueMilestones: 1,
  team: {active:15,onboarding:2,other:1},
  milestones: [
    {title:'API integration review',project:'Example CRM',due:'18 Nov'},
    {title:'Design handoff',project:'Example Portal',due:'21 Nov'},
    {title:'QA checkpoint',project:'Example Music',due:'24 Nov'},
  ],
  projects: [
    {name:'Example CRM',state:'In progress',done:14,total:19},
    {name:'Example Portal',state:'Design review',done:9,total:16},
    {name:'Example Music',state:'QA',done:11,total:15},
  ],
  activity: [
    {label:'Task marked complete',detail:'Example CRM · UI review',when:'Today'},
    {label:'Milestone updated',detail:'Example Portal · Handoff',when:'Yesterday'},
    {label:'Project activity',detail:'Example Music · QA notes',when:'2 days ago'},
  ],
};
export const employeePreviewData: EmployeeDashboardModel = {
  tasks: [
    {id:'sample-1',title:'Review dashboard navigation',project:'Example CRM',status:'In progress',due:'18 Nov'},
    {id:'sample-2',title:'Prepare responsive QA checklist',project:'Example Portal',status:'In review',due:'19 Nov'},
    {id:'sample-3',title:'Verify component spacing',project:'Example Music',status:'Blocked',due:'20 Nov'},
    {id:'sample-4',title:'Document design tokens',project:'Example CRM',status:'Done',due:'14 Nov'},
  ],
  notifications: [
    {title:'Review requested',context:'Example CRM · Work item'},
    {title:'Milestone changed',context:'Example Portal · Delivery'},
  ],
  attendance: [
    {day:'Mon 9 Nov',clockIn:'09:30',clockOut:'17:45'},
    {day:'Tue 10 Nov',clockIn:'09:20',clockOut:'17:35'},
    {day:'Wed 11 Nov',clockIn:'09:40',clockOut:'18:00'},
  ],
  leaves: [
    {id:'sample-leave-1',from:'25 Nov',through:'26 Nov',kind:'Annual',status:'Pending'},
    {id:'sample-leave-2',from:'4 Nov',through:'4 Nov',kind:'Sick',status:'Approved'},
  ],
  events: [
    {id:'s-event-1',day:10,month:11,year:2026,title:'Daily standup',category:'meeting',time:'10:00'},
    {id:'s-event-2',day:12,month:11,year:2026,title:'Milestone review',category:'task',time:'14:00'},
    {id:'s-event-3',day:16,month:11,year:2026,title:'Team sync',category:'meeting',time:'11:00'},
    {id:'s-event-4',day:18,month:11,year:2026,title:'Frontend QA',category:'task',time:'15:30'},
    {id:'s-event-5',day:23,month:11,year:2026,title:'Prepare release notes',category:'reminder',time:'09:00'},
    {id:'s-event-6',day:25,month:11,year:2026,title:'Focus time',category:'personal',time:'13:00'},
  ],
};
