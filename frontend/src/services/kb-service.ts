import { apiClient } from "@/lib/api-client";
import {
  KBPaginatedResponse,
  KBCreateRequest,
  KBCreateResponse,
  KBSearchRequest,
  KBSearchResponse
} from "@/types/knowledge-base";

export const kbService = {
  getDocs: async (projectId: string, limit: number = 20, skip: number = 0): Promise<KBPaginatedResponse> => {
    // Passed project_id as a query parameter
    const response = await apiClient.get("/kb/", { params: { project_id: projectId, limit, skip } });
    return response.data;
  },

  createDoc: async (projectId: string, data: KBCreateRequest | FormData | any): Promise<KBCreateResponse> => {
    let formData = data;
    
    if (!(data instanceof FormData)) {
      formData = new FormData();
      if (data.title) formData.append("title", data.title);
      if (data.content) formData.append("content", data.content);
      if (data.file) formData.append("file", data.file);
    }

    // UPDATED: Append the project_id required by the backend
    formData.append("project_id", projectId);

    const response = await apiClient.post("/kb/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return response.data;
  }, 

  search: async (projectId: string, data: KBSearchRequest): Promise<KBSearchResponse> => {
    // Combine existing search data with project_id
    const payload = { ...data, project_id: projectId };
    const response = await apiClient.post("/kb/search", payload);
    return response.data;
  },

  deleteDoc: async (projectId: string, title: string): Promise<void> => {
    // Pass project_id as a query parameter
    await apiClient.delete(`/kb/document/${encodeURIComponent(title)}`, {
      params: { project_id: projectId }
    });
  },

  clearKB: async (projectId: string): Promise<void> => {
    // Pass project_id as a query parameter
    await apiClient.delete("/kb/", { params: { project_id: projectId } });
  },
};
