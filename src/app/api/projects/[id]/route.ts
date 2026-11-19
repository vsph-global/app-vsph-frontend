import { type NextRequest } from 'next/server';
import { projectWrite } from '@/features/projects/project-write-gateway';

export async function PATCH(request: NextRequest, {
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return projectWrite(request, 'edit', id);
}
