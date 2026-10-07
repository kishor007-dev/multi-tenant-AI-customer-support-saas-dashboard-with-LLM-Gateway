import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService } from "@/services/ticket-service";
import { TicketCreate, TicketUpdate, TicketReply } from "@/types/ticket";
import { useAuthStore } from "@/lib/auth-store";

// Cache keys requiring projectId to isolate data
export const ticketKeys = {
  all: (projectId: string) => ["tickets", projectId] as const,
  lists: (projectId: string) => [...ticketKeys.all(projectId), "list"] as const,
  list: (projectId: string, page: number, pageSize: number, status?: string, assignedTo?: string) =>
    [...ticketKeys.lists(projectId), { page, pageSize, status, assignedTo }] as const,
  details: (projectId: string) => [...ticketKeys.all(projectId), "detail"] as const,
  detail: (projectId: string, id: string) => [...ticketKeys.details(projectId), id] as const,
};

export function useTickets(projectId: string, page: number, pageSize: number, status?: string, assignedTo?: string) {
  return useQuery({
    queryKey: ticketKeys.list(projectId, page, pageSize, status, assignedTo),
    queryFn: () => ticketService.getTickets(projectId, page, pageSize, status, assignedTo),
    enabled: !!projectId,
  });
}

export function useTicket(projectId: string, id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(projectId, id),
    queryFn: () => ticketService.getTicketById(projectId, id),
    enabled: !!projectId && !!id,
  });
}

export function useCreateTicket(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketCreate) => ticketService.createTicket(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(projectId) });
    },
  });
}

export function useUpdateTicket(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TicketUpdate }) => ticketService.updateTicket(projectId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(projectId, variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(projectId) });
    },
  });
}

export function useReplyToTicket(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TicketReply }) => ticketService.replyToTicket(projectId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(projectId, variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists(projectId) });
    },
  });
}

/**
 * Connects to /ws/tickets, authenticates within the 5-second window,
 * and invalidates TanStack Query ticket caches upon receiving broadcast events.
 */
export function useTicketsWebSocket(projectId?: string) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const rawWsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const wsUrl = `${rawWsUrl.replace(/\/$/, "")}/ws/tickets`;

    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Authenticate with the token frame within 5 seconds
        ws?.send(JSON.stringify({ token: accessToken }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle incoming broadcast events
          if (
            payload.event === "ticket_created" ||
            payload.event === "ticket_updated" ||
            payload.type === "ticket_update" ||
            payload.ticket_id ||
            payload.action
          ) {
            if (projectId) {
              queryClient.invalidateQueries({ queryKey: ticketKeys.all(projectId) });
            } else {
              queryClient.invalidateQueries({ queryKey: ["tickets"] });
            }
          }
        } catch {
          // Ignore non-JSON heartbeat frames
        }
      };

      ws.onerror = (err) => {
        console.warn("Tickets WebSocket error:", err);
      };
    } catch (e) {
      console.warn("Tickets WebSocket connection failed:", e);
    }

    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [accessToken, projectId, queryClient]);
}
