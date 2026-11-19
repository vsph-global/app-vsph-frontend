import { type NextRequest } from 'next/server';
import { projectWorkWrite } from '@/features/projects/project-work-gateway';

export async function POST(request: NextRequest, {params}:{
  params: Promise<{id:string}>;
}) {
  const {id} = await params;
  return projectWorkWrite(request,'milestone-create',id);
}
