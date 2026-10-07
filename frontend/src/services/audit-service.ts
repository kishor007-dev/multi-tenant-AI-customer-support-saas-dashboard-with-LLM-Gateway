import { apiClient } from "@/lib/api-client";
import { AuditLog } from "@/types/audit";

export const auditService = {
  getAuditLogs: async (limit = 20, skip = 0): Promise<AuditLog[]> => {
    const { data } = await apiClient.get(`/api/v1/audit-logs`, {
      params: { limit, skip },
    });
    if (!Array.isArray(data)) {
      throw new Error("Unexpected audit log response");
    }
    return data;
  },
};
