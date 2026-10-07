// import { apiClient } from "@/lib/api-client";
// import { TicketOut, TicketCreate, TicketUpdate, TicketReply } from "@/types/ticket";

// export const ticketService = {
//   getTickets: async (projectId: string, page: number = 1, pageSize: number = 20, status?: string, assignedTo?: string): Promise<TicketOut[]> => {
//     // Inject project_id into the params object
//     const params: Record<string, any> = { project_id: projectId, page, page_size: pageSize };
//     if (status && status !== "all") params.status = status;
//     if (assignedTo && assignedTo !== "all") params.assigned_to = assignedTo;

//     const response = await apiClient.get("/api/v1/tickets", { params });
//     return Array.isArray(response.data) ? response.data : (response.data.items || []);
//   },

//   getTicketById: async (projectId: string, id: string): Promise<TicketOut> => {
//     const response = await apiClient.get(`/api/v1/tickets/${id}`, {
//       params: { project_id: projectId } // Required by backend
//     });
//     return response.data;
//   },

//   createTicket: async (projectId: string, data: TicketCreate): Promise<TicketOut> => {
//     // Merge project_id into the JSON body payload
//     const payload = { ...data, project_id: projectId };
//     const response = await apiClient.post("/api/v1/tickets", payload);
//     return response.data;
//   },

//   updateTicket: async (projectId: string, id: string, data: TicketUpdate): Promise<TicketOut> => {
//     const response = await apiClient.patch(`/api/v1/tickets/${id}`, data, {
//       params: { project_id: projectId } // Required by backend
//     });
//     return response.data;
//   },

//   replyToTicket: async (projectId: string, id: string, data: TicketReply): Promise<void> => {
//     await apiClient.post(`/api/v1/tickets/${id}/reply`, data, {
//       params: { project_id: projectId } // Required by backend
//     });
//   },

//   deleteTicket: async (projectId: string, id: string): Promise<void> => {
//     await apiClient.delete(`/api/v1/tickets/${id}`, {
//       params: { project_id: projectId } // Required by backend
//     });
//   },
// };
import { apiClient } from "@/lib/api-client";
import { TicketOut, TicketCreate, TicketUpdate, TicketReply } from "@/types/ticket";

export const ticketService = {
  getTickets: async (projectId: string, page: number = 1, pageSize: number = 20, status?: string, assignedTo?: string): Promise<TicketOut[]> => {
    const params: Record<string, any> = { project_id: projectId, page, page_size: pageSize };
    if (status && status !== "all") params.status = status;
    if (assignedTo && assignedTo !== "all") params.assigned_to = assignedTo;

    const response = await apiClient.get("/api/v1/tickets", { params });
    
    // 🔥 ROBUST UNWRAPPING: Handles direct arrays, items, tickets, or data keys safely
    const raw = response.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.tickets)) return raw.tickets;
    if (Array.isArray(raw?.data)) return raw.data;
    
    return [];
  },

  getTicketById: async (projectId: string, id: string): Promise<TicketOut> => {
    const response = await apiClient.get(`/api/v1/tickets/${id}`, {
      params: { project_id: projectId }
    });
    return response.data;
  },

  createTicket: async (projectId: string, data: TicketCreate): Promise<TicketOut> => {
    const payload = { ...data, project_id: projectId };
    const response = await apiClient.post("/api/v1/tickets", payload);
    return response.data;
  },

  updateTicket: async (projectId: string, id: string, data: TicketUpdate): Promise<TicketOut> => {
    const response = await apiClient.patch(`/api/v1/tickets/${id}`, data, {
      params: { project_id: projectId }
    });
    return response.data;
  },

  replyToTicket: async (projectId: string, id: string, data: TicketReply): Promise<void> => {
    await apiClient.post(`/api/v1/tickets/${id}/reply`, data, {
      params: { project_id: projectId }
    });
  },

  deleteTicket: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/tickets/${id}`, {
      params: { project_id: projectId }
    });
  },
};
