import { apiClient } from "@/lib/api-client";
import { UsageSummary } from "@/types/analytics";
export const analyticsService = {
getUsage: async (): Promise<UsageSummary> => {
const response = await apiClient.get("/analytics/usage");
return response.data;
},
};
