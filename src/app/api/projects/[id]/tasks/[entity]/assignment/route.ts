import { type NextRequest } from 'next/server';
import { projectWorkWrite } from '@/features/projects/project-work-gateway';

export async function PATCH(request:NextRequest,{params}:{
 params:Promise<{id:string;entity:string}>;
}) {
 const {id,entity}=await params;
 return projectWorkWrite(request,'task-assign',id,entity);
}
