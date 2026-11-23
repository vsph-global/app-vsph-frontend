import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseNotificationInbox,parseNotificationPreferences} from './NotificationLiveContract';

export async function loadNotifications(){
 const [inboxResult,preferencesResult]=await Promise.all([
   portalApi('/api/notifications'),
   portalApi('/api/notifications/preferences')
 ]);
 if(inboxResult.kind==='unauthorized'||preferencesResult.kind==='unauthorized')
   redirect('/login');
 if(inboxResult.kind!=='ok'||preferencesResult.kind!=='ok')return null;
 const inbox=parseNotificationInbox(inboxResult.value);
 const preferences=parseNotificationPreferences(preferencesResult.value);
 if(!inbox||!preferences)return null;
 return {inbox,preferences};
}
