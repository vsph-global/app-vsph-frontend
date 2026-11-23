import {isProjectId} from '@/features/projects/ProjectDetailContract';
import { cookies } from 'next/headers';

/**
 * Trusted, server-only API access. Never build backend URLs from client
 * Host headers, query strings, or arbitrary database-supplied destinations.
 */
type ApiResult =
  | { kind: 'ok'; value: unknown }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' };

export function approvedInternalOrigin(): string | null {
  const raw = process.env.VSPH_INTERNAL_API_ORIGIN;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.origin !== raw || url.username || url.password || url.hash ||
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function portalApi(path: string): Promise<ApiResult> {
  // Never allow arbitrary paths to turn this helper into a public proxy.
  const establishedRead = /^\/api\/(?:auth\/me|hrms\/access|apps|workspaces|apps\/[A-Z][A-Z0-9_]{1,39}\/contexts)$/.test(path);
  // Explicitly limited to the existing, authenticated read-only project list.
  const projectListPath = /^\/api\/projects\?([^#]*)$/.exec(path);
  const projectDetailPath = /^\/api\/projects\/([0-9a-fA-F-]{36})$/.exec(path);
  const permittedProjectDetail = Boolean(projectDetailPath &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectDetailPath[1]));
  const workforcePath = /^\/api\/projects\/([0-9a-fA-F-]{36})\/workforce$/.exec(path);
  const permittedWorkforce = Boolean(workforcePath &&
    isProjectId(workforcePath[1]));
  let permittedProjects = false;
  if (projectListPath) {
    const params = new URLSearchParams(projectListPath[1]);
    const keys = [...params.keys()];
    const q = params.get('q');
    const status = params.get('status');
    const cursor = params.get('cursor');
    permittedProjects = keys.length >= 2 && keys.length <= 3 &&
      new Set(keys).size === keys.length &&
      keys.every(key => ['q', 'status', 'cursor'].includes(key)) &&
      q !== null && q.length <= 100 && !/[\u0000-\u001f\u007f]/.test(q) &&
      status !== null && ['', 'planned', 'active', 'paused', 'completed', 'archived'].includes(status) &&
      (cursor === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor));
  }
  // Project features can use their reviewed directory and key-based detail reads.
  const permittedCreationDirectory = path === '/api/projects/directory';
  const permittedByKey = /^\/api\/projects\/by-key\/[A-Z][A-Z0-9-]{1,19}$/.test(path);
  // Employee directory reads are restricted to documented, bounded filters.
  const employeePath = /^\/api\/employees\?([^#]*)$/.exec(path);
  let permittedEmployees = false;
  if (employeePath) {
    const params = new URLSearchParams(employeePath[1]);
    const keys = [...params.keys()];
    const cursor = params.get('afterId');
    const status = params.get('status');
    const search = params.get('search');
    permittedEmployees = keys.length <= 3 &&
      new Set(keys).size === keys.length &&
      keys.every(key => ['afterId', 'status', 'search'].includes(key)) &&
      (cursor === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor)) &&
      (status === null || ['all','onboarding','active','on_leave','inactive'].includes(status)) &&
      (search === null || (search.length <= 80 && !/[\u0000-\u001f\u007f]/.test(search)));
  }
  const permittedEmployeeAccess = path === '/api/employees/access';
  // Scoped HR leave and attendance reads. Backend performs current HR role checks.
  const hrPath = /^\/api\/hrms\/(leave|attendance)\?([^#]*)$/.exec(path);
  let permittedHrList = false;
  if (hrPath) {
    const params = new URLSearchParams(hrPath[2]);
    const keys = [...params.keys()];
    const status = params.get('status'), cursor = params.get('afterId');
    const allowed = hrPath[1] === 'leave' ? ['status','afterId'] : ['afterId'];
    permittedHrList = keys.length <= allowed.length &&
      new Set(keys).size === keys.length && keys.every(k => allowed.includes(k)) &&
      (status === null || (hrPath[1] === 'leave' &&
        ['all','pending','approved','rejected','cancelled'].includes(status))) &&
      (cursor === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor));
  }
  // Owner-only customer directory/detail, with no arbitrary query or tenant IDs.
  const customerList = /^\/api\/admin-management\/customers\?([^#]*)$/.exec(path);
  let permittedCustomers = false;
  if (customerList) {
    const params = new URLSearchParams(customerList[1]);
    const keys = [...params.keys()], cursor = params.get('afterId');
    permittedCustomers = keys.length <= 1 &&
      keys.every(k => k === 'afterId') &&
      (cursor === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor));
  }
  const permittedCustomerDetail = /^\/api\/admin-management\/customers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path);
  // Deliberately bounded, owner-only financial summary: never public invoice records.
  const permittedFinanceOverview = path === '/api/finance/overview';
  // Finance journal: immutable owner-only ledger reads with scoped cursor checks.
  const journalPath = /^\/api\/finance\/journal\?([^#]*)$/.exec(path);
  let permittedFinanceJournal = false;
  if (journalPath && journalPath[1].length <= 1100) {
    const query = new URLSearchParams(journalPath[1]);
    const keys = [...query.keys()];
    const kind = query.get('kind');
    const status = query.get('status'), search = query.get('search');
    const from = query.get('from'), to = query.get('to'), cursor = query.get('cursor');
    const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) &&
      !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10)===d;
    let validCursor = cursor === null;
    if (cursor !== null && cursor.length <= 500) {
      try {
        const value: unknown = JSON.parse(cursor);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const c = value as Record<string, unknown>;
          validCursor = Object.keys(c).length===3 &&
            typeof c.id==='string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id) &&
            typeof c.at==='string' &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(c.at) &&
            !Number.isNaN(Date.parse(c.at)) &&
            typeof c.scope==='string' && /^[a-f0-9]{32}$/.test(c.scope);
        }
      } catch { validCursor = false; }
    }
    permittedFinanceJournal = keys.length>=1 && keys.length<=6 &&
      new Set(keys).size===keys.length &&
      keys.every(k=>['kind','status','search','from','to','cursor'].includes(k)) &&
      (kind==='invoices'||kind==='receipts') &&
      (status===null||(kind==='invoices'?
        ['all','issued','void'].includes(status):
        ['all','active','reversed'].includes(status))) &&
      (search===null||(search.length<=100 &&
        !/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(search))) &&
      (from===null||validDate(from)) && (to===null||validDate(to)) &&
      (from===null||to===null||from<=to) && validCursor;
  }
  // The legacy report RPC permits only status and bounded date filters.
  const reportPath = /^\/api\/project-reports(?:\?([^#]*))?$/.exec(path);
  let permittedProjectReport = false;
  if(reportPath){
    const params=new URLSearchParams(reportPath[1]||'');
    const keys=[...params.keys()];
    const status=params.get('status'),from=params.get('from'),to=params.get('to');
    const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&
      !Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
    permittedProjectReport=keys.length<=3&&new Set(keys).size===keys.length&&
      keys.every(k=>['status','from','to'].includes(k))&&
      (status===null||['planned','active','paused','completed','archived'].includes(status))&&
      (from===null||validDate(from))&&(to===null||validDate(to))&&
      (from===null||to===null||from<=to);
  }
  // Platform owner-only administration; backend rechecks active super_admin on every read.
  const permittedAdminOverview = path === '/api/admin-management/overview';
  const permittedAdminAudit = path === '/api/admin-management/audit-logs';
  const permittedProvisioningList = path === '/api/admin-management/onboardings';
  const permittedOnboardingLookups = path === '/api/admin-management/lookups';
  // Fixed, authenticated current-account profile and session reads.
  const permittedAccountSelfService = path === '/api/account/profile' || path === '/api/account/sessions';
  // Owner-only product registry cursor and item reads; no arbitrary admin API paths.
  const productList=/^\/api\/admin-management\/product-registry(?:\?([^#]*))?$/.exec(path);
  let permittedProductList=false;
  if(productList){
    const params=new URLSearchParams(productList[1]||'');
    const keys=[...params.keys()],afterCode=params.get('afterCode');
    permittedProductList=keys.length<=1&&keys.every(k=>k==='afterCode')&&
      (afterCode===null||/^[A-Z][A-Z0-9_]{1,39}$/.test(afterCode));
  }
  const permittedProductItem=/^\/api\/admin-management\/product-registry\/item\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path);
  // Inbox and preference reads are always scoped to the current backend session.
  const permittedNotifications = path === '/api/notifications' || path === '/api/notifications/preferences';

  if (!establishedRead && !permittedProjects && !permittedProjectDetail && !permittedWorkforce &&
      !permittedCreationDirectory && !permittedByKey && !permittedEmployees &&
      !permittedEmployeeAccess && !permittedHrList && !permittedCustomers &&
      !permittedCustomerDetail && !permittedFinanceOverview && !permittedFinanceJournal &&
      !permittedProjectReport && !permittedNotifications && !permittedAdminOverview &&
      !permittedAdminAudit && !permittedProvisioningList && !permittedOnboardingLookups &&
      !permittedProductList && !permittedProductItem && !permittedAccountSelfService)
    return { kind: 'unavailable' };
  const portalCookie = (await cookies()).get('vsph.portal.sid')?.value;
  if (!portalCookie || !/^[A-Za-z0-9_-]{32,128}$/.test(portalCookie)) {
    return { kind: 'unauthorized' };
  }
  const origin = approvedInternalOrigin();
  if (!origin) return { kind: 'unavailable' };

  try {
    const response = await fetch(origin + path, {
      method: 'GET',
      headers: {
        Cookie: 'vsph.portal.sid=' + portalCookie,
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status === 403) return { kind: 'forbidden' };
    if (response.status !== 200) return { kind: 'unavailable' };
    const value: unknown = await response.json();
    return { kind: 'ok', value };
  } catch {
    return { kind: 'unavailable' };
  }
}
