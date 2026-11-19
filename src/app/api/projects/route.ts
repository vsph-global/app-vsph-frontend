import { type NextRequest } from 'next/server';
import { projectWrite } from '@/features/projects/project-write-gateway';

export async function POST(request: NextRequest) {
  return projectWrite(request, 'create');
}
