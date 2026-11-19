'use client';
import { useState } from 'react';
import { ProjectPortfolio } from './ProjectPortfolio';
import { ProjectDetails } from './ProjectDetails';
import type { ProjectModel } from './ProjectModel';

export function ProjectsPreview({projects}:{projects:ProjectModel[]}) {
 const [selected,setSelected]=useState<string|null>(null);
 const project=selected?projects.find(p=>p.id===selected):null;
 return project
   ? <div className="project-detail-route">
       <ProjectDetails key={project.id} project={project} onBack={()=>setSelected(null)}/>
     </div>
   : <ProjectPortfolio projects={projects} onOpen={setSelected}/>;
}
