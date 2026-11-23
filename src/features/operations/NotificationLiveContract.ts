/** Current-user inbox projection, bounded to 100 backend-authorized entries. */
export type NotificationRecord=Readonly<{
 id:string;projectId:string;projectName:string;eventType:string;
 title:string|null;createdAt:string;readAt:string|null;
}>;
export type NotificationInbox=Readonly<{
 queued:number;attention:number;notifications:NotificationRecord[];
}>;
export type NotificationPreferences=Readonly<{
 assignments:boolean;delivery:boolean;overdue:boolean;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ts=(x:unknown):x is string=>typeof x==='string'&&
 !Number.isNaN(Date.parse(x));
const text=(x:unknown,max:number):x is string=>typeof x==='string'&&
 !!x.trim()&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
const id=(x:unknown)=>{
  if(typeof x==='number')return Number.isSafeInteger(x)&&x>0?
    String(x):null;
  return typeof x==='string'&&/^\d{1,16}$/.test(x)&&BigInt(x)>BigInt(0)?
    x:null;
};
export function parseNotificationInbox(value:unknown):NotificationInbox|null{
 if(!obj(value)||!Number.isSafeInteger(value.queued)||(value.queued as number)<0||
   !Number.isSafeInteger(value.attention)||(value.attention as number)<0||
   !Array.isArray(value.notifications)||value.notifications.length>100)
   return null;
 const seen=new Set<string>(),records:NotificationRecord[]=[];
 for(const row of value.notifications){
   if(!obj(row))return null;
   const notificationId=id(row.id);
   if(!notificationId||seen.has(notificationId)||
     typeof row.project_id!=='string'||!UUID.test(row.project_id)||
     !text(row.project_name,150)||!text(row.event_type,100)||
     !(row.title===null||row.title===undefined||
       (typeof row.title==='string'&&row.title.length<=200))||
     !ts(row.created_at)||!(row.read_at===null||ts(row.read_at)))
     return null;
   seen.add(notificationId);
   records.push({
     id:notificationId,projectId:row.project_id,
     projectName:row.project_name,eventType:row.event_type,
     title:typeof row.title==='string'?row.title:null,
     createdAt:row.created_at,readAt:row.read_at as string|null
   });
 }
 return {queued:value.queued as number,attention:value.attention as number,
   notifications:records};
}
export function parseNotificationPreferences(input:unknown):NotificationPreferences|null{
 if(!obj(input)||typeof input.assignments!=='boolean'||
   typeof input.delivery!=='boolean'||typeof input.overdue!=='boolean')
   return null;
 return {assignments:input.assignments,delivery:input.delivery,overdue:input.overdue};
}
export type NotificationAction='read'|'preferences'|'retry';
export function validNotificationAction(action:string,value:unknown):{
 path:string;body:Record<string,unknown>;
}|null{
 if(!obj(value))return null;
 if(action==='read'){
   const k=Object.keys(value),notificationId=id(value.notificationId);
   if(k.length!==1||k[0]!=='notificationId'||!notificationId||
      notificationId.length>16)return null;
   return {path:'/api/notifications/'+notificationId+'/read',body:{}};
 }
 if(action==='preferences'){
   if(Object.keys(value).length!==3||!Object.hasOwn(value,'assignments')||
     !Object.hasOwn(value,'delivery')||!Object.hasOwn(value,'overdue'))return null;
   const pref=parseNotificationPreferences(value);
   return pref?{path:'/api/notifications/preferences',body:pref}:null;
 }
 if(action==='retry'){
   if(Object.keys(value).length)return null;
   return {path:'/api/notifications/retry',body:{}};
 }
 return null;
}
