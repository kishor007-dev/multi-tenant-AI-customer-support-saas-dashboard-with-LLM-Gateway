import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kbService } from "@/services/kb-service";
import { KBCreateRequest, KBSearchRequest } from "@/types/knowledge-base";

// 🔥 UPDATED: Cache keys now require projectId
export const kbKeys = {
  all: (projectId: string) => ["kb", projectId] as const,
  lists: (projectId: string) => [...kbKeys.all(projectId), "list"] as const,
  list: (projectId: string, limit: number, skip: number) => [...kbKeys.lists(projectId), { limit, skip }] as const,
};

export function useKBDocs(projectId: string, limit: number, skip: number) {
  return useQuery({
    queryKey: kbKeys.list(projectId, limit, skip),
    queryFn: () => kbService.getDocs(projectId, limit, skip),
    enabled: !!projectId,
  });
}

export function useCreateKBDoc(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // Support FormData or specific JSON payload
    mutationFn: (data: KBCreateRequest | FormData | any) => kbService.createDoc(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kbKeys.all(projectId) });
    },
  });
}

export function useSearchKB(projectId: string) {
  return useMutation({
    mutationFn: (data: KBSearchRequest) => kbService.search(projectId, data),
  });
}

export function useDeleteKBDoc(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => kbService.deleteDoc(projectId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kbKeys.all(projectId) });
    },
  });
}

export function useClearKB(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => kbService.clearKB(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kbKeys.all(projectId) });
    },
  });
}
