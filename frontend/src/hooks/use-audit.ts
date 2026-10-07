import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/services/audit-service";

export function useAuditLogs(limit = 20, skip = 0) {
  return useQuery({
    queryKey: ["audit-logs", limit, skip],
    queryFn: () => auditService.getAuditLogs(limit, skip),
  });
}
