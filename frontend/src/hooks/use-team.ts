import { useQuery, useMutation, useQueryClient } from
"@tanstack/react-query";
import { teamService } from "@/services/team-service";
import { InviteRequest } from "@/types/team";
export const teamKeys = {
all: ["team"] as const,
list: () => [...teamKeys.all, "list"] as const,
};
export function useTeam() {
return useQuery({
queryKey: teamKeys.list(),
queryFn: () => teamService.getTeam(),
});
}
export function useInviteMember() {
return useMutation({
mutationFn: (data: InviteRequest) =>
teamService.inviteMember(data),
});
}
export function useRemoveMember() {
const queryClient = useQueryClient();
return useMutation({
mutationFn: (userId: string) => teamService.removeMember(userId),
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: teamKeys.all });
},
});
}
