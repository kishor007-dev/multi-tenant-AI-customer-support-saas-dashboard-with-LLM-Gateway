"use client";

import * as React from "react";
// 🔥 ADDED: Import the new WebSocket hook
import { useTickets, useTicketsWebSocket } from "@/hooks/use-tickets";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

export default function TicketsPage({ params }: { params: { projectId: string } }) {
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [statusFilter, setStatusFilter] = React.useState<string>("open");

  // 🔥 ADDED: Call the WebSocket hook here to listen for live updates
  useTicketsWebSocket(params.projectId);

  const { data: tickets, isLoading, isError, refetch } = useTickets(params.projectId, page, pageSize, statusFilter);

  const hasMorePages = tickets ? tickets.length === pageSize : false;
  const derivedTotal = tickets ? (hasMorePages ? page * pageSize + 1 : (page - 1) * pageSize + tickets.length) : 0;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage customer support escalations.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted/50 p-1">
            {["open", "resolved", "all"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className="h-8 capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        ) : isError ? (
          <ErrorState
            variant="page"
            message="Couldn't load tickets. Please try again."
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : !tickets || tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title={statusFilter === "open" ? "No open tickets right now" : "No tickets match these filters"}
            description="Incoming escalations will appear here."
            action={
              statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex h-full flex-col gap-4">
            <TicketsTable tickets={tickets} projectId={params.projectId} />
            <Pagination variant="page_size" total={derivedTotal} page={page} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
