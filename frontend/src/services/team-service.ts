import { apiClient } from "@/lib/api-client";
import { TeamMember, InviteRequest, InviteResponse } from
"@/types/team";
export const teamService = {
getTeam: async (): Promise<TeamMember[]> => {
const response = await apiClient.get("/org/team");
return Array.isArray(response.data) ? response.data : (response.data.members || []);
},
inviteMember: async (data: InviteRequest): Promise<InviteResponse> => {
const response = await apiClient.post("/org/invite", data);
return response.data;
},
removeMember: async (userId: string): Promise<void> => {
await apiClient.delete(`/org/members/${userId}`);
},
};
