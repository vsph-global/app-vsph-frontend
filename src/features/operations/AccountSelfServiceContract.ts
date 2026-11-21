/** Current-account profile and active portal session projections. No credential fields. */
export type ProfileTone='navy'|'blue'|'slate';
export type OwnProfile=Readonly<{
 displayName:string;email:string;platformRole:string;bio:string;
 timeZone:string;avatarTone:ProfileTone;version:number;updatedAt:string;
}>;
export type OwnSession=Readonly<{
 id:string;createdAt:string;expiresAt:string;current:boolean;
}>;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&
 typeof v==='object'&&!Array.isArray(v);
const safe=(v:unknown,n:number):v is string=>
 typeof v==='string'&&v.length<=n&&!/[\u0000-\u001f\u007f]/.test(v);
const validBio=(v:unknown):v is string=>typeof v==='string'&&v.length<=500&&
 !/[\u0000-\u0009\u000b-\u001f\u007f]/.test(v);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validDate=(v:unknown):v is string=>
 typeof v==='string'&&!Number.isNaN(Date.parse(v));
const tone=(v:unknown):v is ProfileTone=>v==='navy'||v==='blue'||v==='slate';
const zone=(v:unknown):v is string=>{
 if(typeof v!=='string'||!v||v.length>100)return false;
 try{new Intl.DateTimeFormat('en-IN',{timeZone:v});return true;}catch{return false;}
};
export function parseOwnProfile(value:unknown):OwnProfile|null{
 if(!obj(value)||!safe(value.displayName,150)||!value.displayName.trim()||
   !safe(value.email,190)||!value.email||
   !safe(value.platformRole,40)||!validBio(value.bio)||
   !zone(value.timeZone)||!tone(value.avatarTone)||
   !Number.isSafeInteger(value.version)||(value.version as number)<0||
   !validDate(value.updatedAt))return null;
 return {displayName:value.displayName.trim(),email:value.email,
   platformRole:value.platformRole,bio:value.bio,timeZone:value.timeZone,
   avatarTone:value.avatarTone,version:value.version as number,updatedAt:value.updatedAt};
}
export type ProfileChange=Readonly<{
 displayName:string;bio:string;timeZone:string;avatarTone:ProfileTone;version:number;
}>;
export function parseProfileChange(value:unknown):ProfileChange|null{
 if(!obj(value)||Object.keys(value).length!==5||
   !['displayName','bio','timeZone','avatarTone','version'].every(k=>Object.hasOwn(value,k))||
   !safe(value.displayName,150)||!value.displayName.trim()||
   !validBio(value.bio)||!zone(value.timeZone)||!tone(value.avatarTone)||
   !Number.isSafeInteger(value.version)||(value.version as number)<0||
   (value.version as number)>2147483646)return null;
 return {displayName:value.displayName.trim(),bio:value.bio,
   timeZone:value.timeZone,avatarTone:value.avatarTone,version:value.version as number};
}
export function parseOwnSessions(input:unknown):OwnSession[]|null{
 if(!obj(input)||!Array.isArray(input.sessions)||input.sessions.length>100)return null;
 const result:OwnSession[]=[],seen=new Set<string>();
 let currents=0;
 for(const session of input.sessions){
   if(!obj(session)||typeof session.id!=='string'||!uuid.test(session.id)||
     seen.has(session.id.toLowerCase())||!validDate(session.created_at)||
     !validDate(session.expires_at)||typeof session.current_session!=='boolean')
     return null;
   seen.add(session.id.toLowerCase());
   if(session.current_session)currents++;
   result.push({id:session.id,createdAt:session.created_at,
     expiresAt:session.expires_at,current:session.current_session});
 }
 return currents===1?result:null;
}
export const validSessionId=(id:unknown):id is string=>
 typeof id==='string'&&uuid.test(id);
