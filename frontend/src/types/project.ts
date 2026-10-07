export interface ProjectMember { 
  user_id: string; 
  role: "editor" | "owner"; 
} 
 
export interface ProjectOut { 
  id: string; 
  name: string; 
  description?: string; 
  owner_id: string; 
  created_at: string; 
  members: ProjectMember[]; 
  status?: string; 
} 
 
export interface ProjectCreate { 
  name: string; 
  description?: string; 
  members?: ProjectMember[]; 
}