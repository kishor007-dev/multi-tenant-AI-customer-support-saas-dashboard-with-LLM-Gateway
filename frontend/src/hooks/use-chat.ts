import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat-service";
import { ChatEscalateRequest } from "@/types/chat";
import { useRouter } from "next/navigation";

// 🔥 UPDATED: Cache keys now require projectId
export const chatKeys = {
  all: (projectId: string) => ["chat", projectId] as const,
  lists: (projectId: string) => [...chatKeys.all(projectId), "list"] as const,
  list: (projectId: string, limit: number, skip: number) => [...chatKeys.lists(projectId), { limit, skip }] as const,
  details: (projectId: string) => [...chatKeys.all(projectId), "detail"] as const,
  detail: (projectId: string, id: string) => [...chatKeys.details(projectId), id] as const,
};

export function useConversations(projectId: string, limit: number, skip: number) {
  return useQuery({
    queryKey: chatKeys.list(projectId, limit, skip),
    queryFn: () => chatService.getConversations(projectId, limit, skip),
    enabled: !!projectId,
  });
}

export function useConversation(projectId: string, id: string) {
  return useQuery({
    queryKey: chatKeys.detail(projectId, id),
    queryFn: () => chatService.getConversationById(id), // Note: Verify if getConversationById needs projectId based on your service update
    enabled: !!projectId && !!id,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 3;
    },
  });
}

export function useCreateConversation(projectId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => chatService.createConversation(projectId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.lists(projectId) });
      
      console.log("Backend response for new chat:", data);
      const chatId = data?.id || data?._id || data?.conversation_id || data?.data?.id;
      
      // 🔥 CRITICAL FIX: Redirects to the project-scoped chat route!
      if (chatId) {
        router.push(`/projects/${projectId}/chat/${chatId}`);
      } else {
        console.error("Chat was created, but frontend couldn't find the ID to redirect!", data);
        alert("Chat created, but couldn't redirect. Check your browser's Developer Tools Console.");
      }
    },
  });
}

export function useSendMessage(projectId: string, conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => chatService.sendMessage(conversationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(projectId, conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.lists(projectId) });
    },
  });
}

export function useEscalateConversation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChatEscalateRequest }) => 
      chatService.escalateConversation(projectId,id, data),
    onSuccess: (_, variables) => {
      // Invalidate chat details and lists
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(projectId, variables.id) });
      queryClient.invalidateQueries({ queryKey: chatKeys.lists(projectId) });
      
      // 🔥 CRITICAL: Force the project's tickets list to refetch so the new ticket appears!
      queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    },
  });
}




export function useDeleteConversation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id), // If service requires projectId, pass it here
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.all(projectId) });
    },
  });
}
