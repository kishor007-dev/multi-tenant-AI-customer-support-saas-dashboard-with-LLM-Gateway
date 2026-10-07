import { useQuery, useMutation, useQueryClient } from
"@tanstack/react-query";
import { projectService } from "@/services/project-service";
import { ProjectCreate } from "@/types/project";
export const projectKeys = {
all: ["projects"] as const,
lists: () => [...projectKeys.all, "list"] as const,
list: (limit: number, skip: number) => [...projectKeys.lists(), {
limit, skip }] as const,
};
export function useProjects(limit: number, skip: number) {
return useQuery({
queryKey: projectKeys.list(limit, skip),
queryFn: () => projectService.getProjects(limit, skip),
});
}
export function useCreateProject() {
const queryClient = useQueryClient();
return useMutation({
mutationFn: (data: ProjectCreate) =>
projectService.createProject(data),
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: projectKeys.all });
},
});
} export function useDeleteProject() {
const queryClient = useQueryClient();
return useMutation({
mutationFn: (id: string) => projectService.deleteProject(id),
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: projectKeys.all });
},
});
}
