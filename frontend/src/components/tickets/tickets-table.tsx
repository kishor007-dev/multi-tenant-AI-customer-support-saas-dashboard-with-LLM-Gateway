"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TicketOut } from "@/types/ticket";

export function TicketsTable({ tickets, projectId }: { tickets: TicketOut[]; projectId: string }) {
  const router = useRouter();

  const getStatusVariant = (status: string): BadgeProps["variant"] => {
    switch (status) {
      case "open":
        return "signal";
      case "in_progress":
        return "warning";
      case "resolved":
        return "default";
      default:
        return "outline";
    }
  };

  const getPriorityVariant = (priority: string): BadgeProps["variant"] => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className="hidden md:table-cell">Assigned To</TableHead>
          <TableHead className="text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow
            key={ticket.id}
            className="cursor-pointer"
            onClick={() => router.push(`/projects/${projectId}/tickets/${ticket.id}`)}
          >
            <TableCell className="max-w-[250px] truncate font-medium text-foreground">{ticket.subject}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(ticket.status)} className="capitalize">
                {ticket.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getPriorityVariant(ticket.priority)} className="capitalize">
                {ticket.priority || "medium"}
              </Badge>
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {ticket.assigned_to || "Unassigned"}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground">
              {new Date(ticket.updated_at).toLocaleDateString("en-IN")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}