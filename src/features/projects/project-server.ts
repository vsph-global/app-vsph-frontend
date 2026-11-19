import { redirect } from 'next/navigation';
import { portalApi } from '@/features/workspace/server-api';
import { parseProjectPage, type ProjectRow } from './ProjectListContract';

/** Only backend-authorized GETs, never preview records or browser-side API calls. */
export async function loadLiveProjects(filters: {
  q: string; status: string; page: number;
}): Promise<{ projects: ProjectRow[]; canCreate: boolean; hasMore: boolean } | null> {
  const projects: ProjectRow[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let canCreate = false;
  let hasMore = false;
  // Re-read at most ten 50-row pages to preserve original append-on-load behavior.
  for (let i = 0; i < filters.page; i++) {
    const params = new URLSearchParams({ q: filters.q, status: filters.status });
    if (cursor) params.set('cursor', cursor);
    const result = await portalApi('/api/projects?' + params.toString());
    if (result.kind === 'unauthorized') redirect('/login');
    if (result.kind !== 'ok') return null;
    const data = parseProjectPage(result.value);
    if (!data) return null;
    canCreate = data.canCreate;
    for (const item of data.projects) {
      if (seen.has(item.id)) return null;
      seen.add(item.id);
      projects.push(item);
    }
    hasMore = data.projects.length === 50;
    if (!hasMore) break;
    cursor = data.projects[data.projects.length - 1].id;
  }
  return { projects, canCreate, hasMore };
}
