import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseProjectReport,reportApiPath, type ReportFilters} from './ProjectReportLiveContract';

export async function loadProjectReport(filters:ReportFilters){
 const result=await portalApi(reportApiPath(filters));
 if(result.kind==='unauthorized')redirect('/login');
 return result.kind==='ok'?parseProjectReport(result.value):null;
}
export function reportExportHref(filters:ReportFilters){
 return reportApiPath(filters).replace(/^\/api\/project-reports/,'/api/project-report/export');
}
