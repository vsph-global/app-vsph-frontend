/** Backend-authorized project report: first 100 matching non-client projects only. */
export type ReportStatus=''|'planned'|'active'|'paused'|'completed'|'archived';
export type ReportFilters=Readonly<{status:ReportStatus;from:string;to:string}>;
export type ProjectReportRow=Readonly<{
 id:string;key:string;name:string;status:Exclude<ReportStatus,''>;
 ownerName:string;organizationName:string|null;dueOn:string|null;
 completedTasks:number;totalTasks:number;assignedToMe:number;overdueTasks:number;
 completedMilestones:number;pendingMilestones:number;openPrs:number;
 prsAwaitingReview:number;failedBuildRecords:number;
 lastSyncAt:string|null;lastActivityAt:string|null;
}>;
export type ProjectReport=Readonly<{
 generatedAt:string;deploymentStatus:string;projects:ProjectReportRow[];
 limitReached:boolean;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const ts=(x:unknown):x is string=>typeof x==='string'&&!Number.isNaN(Date.parse(x));
const int=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=0;
const string=(x:unknown,max=150):x is string=>typeof x==='string'&&
 !!x.trim()&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
export function validReportFilters(value:unknown):value is ReportFilters{
 if(!obj(value)||Object.keys(value).length!==3||
   !Object.hasOwn(value,'status')||!Object.hasOwn(value,'from')||
   !Object.hasOwn(value,'to'))return false;
 const {status,from,to}=value;
 return typeof status==='string'&&['','planned','active','paused','completed','archived'].includes(status)&&
   typeof from==='string'&&typeof to==='string'&&
   (from===''||validDate(from))&&(to===''||validDate(to))&&
   (from===''||to===''||from<=to);
}
export function reportApiPath(filters:ReportFilters){
 const query=new URLSearchParams();
 if(filters.status)query.set('status',filters.status);
 if(filters.from)query.set('from',filters.from);
 if(filters.to)query.set('to',filters.to);
 return '/api/project-reports'+(query.size?'?'+query.toString():'');
}
export function parseProjectReport(value:unknown):ProjectReport|null{
 if(!obj(value)||!ts(value.generatedAt)||
   typeof value.deploymentStatus!=='string'||value.deploymentStatus.length>80||
   !Array.isArray(value.projects)||value.projects.length>100)return null;
 const seen=new Set<string>(),projects:ProjectReportRow[]=[];
 const numeric=['completed_tasks','total_tasks','assigned_to_me','overdue_tasks',
   'completed_milestones','pending_milestones','open_prs',
   'prs_awaiting_requested_review','failed_build_records'] as const;
 for(const p of value.projects){
   if(!obj(p)||typeof p.id!=='string'||!UUID.test(p.id)||
     seen.has(p.id.toLowerCase())||
     typeof p.key!=='string'||!/^[A-Z][A-Z0-9-]{1,19}$/.test(p.key)||
     !string(p.name)||!['planned','active','paused','completed','archived'].includes(String(p.status))||
     !string(p.owner_name)||!(p.organization_name===null||string(p.organization_name))||
     !(p.due_on===null||(typeof p.due_on==='string'&&validDate(p.due_on)))||
     numeric.some(k=>!int(p[k]))||
     !(p.last_sync_at===null||ts(p.last_sync_at))||
     !(p.last_activity_at===null||ts(p.last_activity_at)))return null;
   seen.add(p.id.toLowerCase());
   projects.push({
     id:p.id,key:p.key,name:p.name,status:p.status as ProjectReportRow['status'],
     ownerName:p.owner_name,organizationName:p.organization_name as string|null,
     dueOn:p.due_on as string|null,
     completedTasks:p.completed_tasks as number,totalTasks:p.total_tasks as number,
     assignedToMe:p.assigned_to_me as number,overdueTasks:p.overdue_tasks as number,
     completedMilestones:p.completed_milestones as number,
     pendingMilestones:p.pending_milestones as number,
     openPrs:p.open_prs as number,prsAwaitingReview:p.prs_awaiting_requested_review as number,
     failedBuildRecords:p.failed_build_records as number,
     lastSyncAt:p.last_sync_at as string|null,
     lastActivityAt:p.last_activity_at as string|null,
   });
 }
 return {generatedAt:value.generatedAt,deploymentStatus:value.deploymentStatus,
   projects,limitReached:projects.length===100};
}
