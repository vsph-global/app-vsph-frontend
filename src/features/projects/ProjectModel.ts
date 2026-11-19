/** Browser-only presentation data model. API validation/authorization happens separately. */
export type ProjectStatus = 'planned'|'active'|'paused'|'completed'|'archived';
export type ProjectTask = {
 id:string; title:string; status:'todo'|'in_progress'|'review'|'done'|'blocked'|'cancelled';
 priority:'low'|'normal'|'high'|'urgent'; assignee:string; dueOn:string; description?:string;
};
export type ProjectMilestone = {
 id:string; title:string; status:'planned'|'active'|'done'|'blocked';
 dueOn:string; checks:{id:string;title:string;done:boolean}[];
};
export type ProjectMember = {
 id:string; name:string; role:'manager'|'contributor'|'viewer'|'client';
 team:string; status:'active'|'invited'; email:string;
};
export type ProjectApplication = {
 id:string; name:string; kind:'product'|'custom'; status:string; description:string; shared:boolean;
};
export type ProjectUpdate = {id:string;author:string;date:string;summary:string};
export type ProjectEvent = {id:string;label:string;actor:string;when:string};
export type ProjectModel = {
 id:string; key:string; name:string; kind:'internal'|'customer';
 status:ProjectStatus; priority:'low'|'normal'|'high'|'urgent';
 dueOn:string; description:string; owner:string; manager:string;
 tasks:ProjectTask[]; milestones:ProjectMilestone[]; members:ProjectMember[];
 applications:ProjectApplication[]; deliverables:{id:string;title:string;status:string}[];
 updates:ProjectUpdate[]; events:ProjectEvent[]; resources:{title:string;description:string}[];
};
export const lifecycle:ProjectStatus[]=['planned','active','paused','completed','archived'];
export const completed=(project:ProjectModel)=>project.tasks.filter(t=>t.status==='done').length;
export const activeTasks=(project:ProjectModel)=>project.tasks.filter(t=>t.status!=='cancelled');
