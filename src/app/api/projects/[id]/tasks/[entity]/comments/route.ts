import { type NextRequest } from 'next/server';
import { projectWorkWrite } from '@/features/projects/project-work-gateway';

export async function POST(request:NextRequest,{params}:{
 params:Promise<{id:string;entity:string}>;
}) {
 const {id,entity}=await params;
 return projectWorkWrite(request,'task-comment-create',id,entity);
}
