import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics-service";
import { apiClient } from "@/lib/api-client"; 
export const analyticsKeys = {
all: ["analytics"] as const,
usage: () => [...analyticsKeys.all, "usage"] as const,
};
export function useUsage() {
return useQuery({
queryKey: analyticsKeys.usage(),
queryFn: () => analyticsService.getUsage(),
staleTime: 5 * 60 * 1000,
});
}

export function useTicketSummary() {
  return useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => {
      // Adjust the prefix (/api/v1) if your backend requires it
      const { data } = await apiClient.get("/analytics/summary");
      return data;
    },
  });
}

