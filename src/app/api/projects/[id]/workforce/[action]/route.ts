import {type NextRequest,NextResponse} from 'next/server';
import {projectWorkforceWrite} from '@/features/projects/project-workforce-gateway';
import type {WorkforceAction} from '@/features/projects/ProjectWorkforceContract';

const actions=new Set<WorkforceAction>(['assign','remove','manager-grant','manager-revoke']);
export async function POST(request:NextRequest,{params}:{
 params:Promise<{id:string;action:string}>;
}) {
 const {id,action}=await params;
 if(!actions.has(action as WorkforceAction))
   return NextResponse.json({message:'Unknown workforce action.'},
     {status:404,headers:{'Cache-Control':'no-store'}});
 return projectWorkforceWrite(request,id,action as WorkforceAction);
}
