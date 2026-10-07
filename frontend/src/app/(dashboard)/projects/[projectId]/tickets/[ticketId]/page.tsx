"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTicket } from "@/hooks/use-tickets";
import { ticketService } from "@/services/ticket-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TicketDetailPage({ params }: { params: { projectId: string; ticketId: string } }) {
  const router = useRouter();

  const { data: ticket, isLoading, isError, refetch } = useTicket(params.projectId, params.ticketId);

  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResolve = async () => {
    if (!ticket) return;
    try {
      setIsResolving(true);
      await ticketService.updateTicket(params.projectId, params.ticketId, { status: "resolved" });
      refetch();
      router.refresh();
    } catch (error) {
      console.error("Failed to resolve ticket", error);
      alert("Failed to resolve ticket. Please try again.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (!ticket) return;

    const confirmed = window.confirm("Are you sure you want to permanently delete this ticket?");
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await ticketService.deleteTicket(params.projectId, params.ticketId);
      router.refresh();
      router.push(`/projects/${params.projectId}/tickets`);
    } catch (error) {
      console.error("Failed to delete ticket", error);
      alert("Failed to delete ticket. Please try again.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse p-8 text-center text-sm text-muted-foreground">Loading ticket details…</div>;
  }

  if (isError || !ticket) {
    return (
      <ErrorState
        variant="page"
        message="Couldn't load this ticket. It may have been deleted or you lack permission."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/projects/${params.projectId}/tickets`}>Back to Queue</Link>
            </Button>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={`/projects/${params.projectId}/tickets`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{ticket.subject}</h1>
          <div className="mt-1 flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <span>ID: {ticket.id || params.ticketId}</span>
            <span>•</span>
            <span>Created {new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">{ticket.description || "No description provided."}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Status</span>
                <Badge variant={ticket.status === "open" ? "signal" : "default"} className="capitalize">
                  {ticket.status.replace("_", " ")}
                </Badge>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Priority</span>
                <Badge
                  variant={ticket.priority === "high" || ticket.priority === "urgent" ? "warning" : "secondary"}
                  className="capitalize"
                >
                  {ticket.priority || "medium"}
                </Badge>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Assigned To</span>
                <span className="text-sm text-foreground">{ticket.assigned_to || "Unassigned"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ticket.status !== "resolved" && (
                <Button onClick={handleResolve} disabled={isResolving} className="w-full">
                  {isResolving ? "Resolving…" : "Mark as Resolved"}
                </Button>
              )}

              <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" className="w-full">
                {isDeleting ? "Deleting…" : "Delete Ticket"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}