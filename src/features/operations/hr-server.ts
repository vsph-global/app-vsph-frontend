import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseLeavePage,parseAttendancePage} from './HrLiveContract';

export async function loadHrWorkspace(filters:{
  leaveStatus:'all'|'pending'|'approved'|'rejected'|'cancelled';
  leaveAfter:string|null;attendanceAfter:string|null;
}){
 const leave=new URLSearchParams({status:filters.leaveStatus});
 if(filters.leaveAfter)leave.set('afterId',filters.leaveAfter);
 const attendance=new URLSearchParams();
 if(filters.attendanceAfter)attendance.set('afterId',filters.attendanceAfter);
 const [leaveResponse,attendanceResponse]=await Promise.all([
   portalApi('/api/hrms/leave?'+leave.toString()),
   portalApi('/api/hrms/attendance?'+attendance.toString())
 ]);
 if(leaveResponse.kind==='unauthorized'||attendanceResponse.kind==='unauthorized')
   redirect('/login');
 if(leaveResponse.kind!=='ok'||attendanceResponse.kind!=='ok')return null;
 const leaves=parseLeavePage(leaveResponse.value);
 const attendanceRows=parseAttendancePage(attendanceResponse.value);
 if(!leaves||!attendanceRows||leaves.role!==attendanceRows.role)return null;
 return {role:leaves.role,leaves,attendance:attendanceRows};
}
