import { apiClient } from "@/lib/api-client";
import { ProjectOut, ProjectCreate } from "@/types/project";
export const projectService = {
getProjects: async (limit: number = 20, skip: number = 0):
Promise<ProjectOut[]> => {
const response = await apiClient.get("/projects/", { params: {
limit, skip } });
return Array.isArray(response.data) ? response.data :
(response.data.items || []);
},
createProject: async (data: ProjectCreate): Promise<ProjectOut> => {
const response = await apiClient.post("/projects/", data);
return response.data;
},
deleteProject: async (id: string): Promise<void> => {
await apiClient.delete(`/projects/${id}`);
},
};
