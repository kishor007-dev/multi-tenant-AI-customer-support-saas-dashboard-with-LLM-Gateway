import { apiClient } from "@/lib/api-client";
import { ConversationOut, ChatEscalateRequest } from "@/types/chat";

export const chatService = {
  getConversations: async (projectId: string, limit: number = 20, skip: number = 0): Promise<ConversationOut[]> => {
    // Passed project_id as a query parameter
    const response = await apiClient.get("/chat/", { 
      params: { project_id: projectId, limit, skip } 
    });
    return Array.isArray(response.data) ? response.data : (response.data.items || []);
  },

  getConversationById: async (id: string): Promise<ConversationOut> => { 
    const response = await apiClient.get(`/chat/${id}`);
    return response.data;
  },

  createConversation: async (projectId: string): Promise<ConversationOut> => {
    // Send project_id in the JSON body
    const response = await apiClient.post("/chat/conversation", { project_id: projectId });
    return response.data;
  },

  sendMessage: async (id: string, message: string): Promise<ConversationOut> => {
    const response = await apiClient.post(`/chat/${id}`, { message });
    return response.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await apiClient.delete(`/chat/${id}`);
  },

  // Update this method inside chatService:
 // Update this method in your frontend src/services/chat-service.ts
  escalateConversation: async (projectId: string, id: string, data: ChatEscalateRequest): Promise<void> => {
    await apiClient.post(`/api/v1/chat/${id}/escalate`, data, {
      params: { project_id: projectId } // 🔥 Pass project_id so the backend receives it
    }); 
  },


};
