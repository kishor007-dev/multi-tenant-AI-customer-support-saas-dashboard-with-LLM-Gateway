"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuditLogs } from "@/hooks/use-audit";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 🔥 Dynamic Action Badges (Crisp in Light Mode, Glowing in Dark Mode)
const getActionBadgeStyle = (action: string) => {
  const act = action.toLowerCase();
  if (act.includes("delete") || act.includes("fail") || act.includes("remove") || act.includes("revoke")) {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30";
  }
  if (act.includes("create") || act.includes("add") || act.includes("success") || act.includes("invite")) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30";
  }
  if (act.includes("update") || act.includes("edit") || act.includes("escalate")) {
    return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30";
  }
  // Default (e.g., login, view, generate)
  return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30";
};

function AuditLogViewer() {
  const [skip, setSkip] = React.useState(0);
  const limit = 20;
  const { data: logs, isLoading, isError, error, refetch } = useAuditLogs(limit, skip);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
      </div>
    );
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const message =
      status === 403
        ? "You do not have permission to view audit logs."
        : "Couldn't load audit logs. Please try again.";

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <ErrorState
          variant="page"
          message={message}
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12">
        <EmptyState
          icon={FileText}
          title="No audit events yet"
          description="Actions taken in this organization will appear here."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Premium Floating Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold h-11 whitespace-nowrap">Timestamp</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold h-11">Actor</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold h-11">Action</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold h-11">Resource</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold h-11">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow 
                  key={log.id}
                  className="group border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400 py-4">
                    {log.timestamp 
                      ? new Date(
                          log.timestamp.endsWith("Z") ? log.timestamp : `${log.timestamp}Z`
                        ).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        }) 
                      : "—"}
                  </TableCell>

                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    {log.actor_name || "Unknown User"}
                  </TableCell>
                  
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider font-mono transition-all ${getActionBadgeStyle(log.action)}`}>
                      {log.action}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="capitalize font-medium">{log.resource || "—"}</span>
                    {log.resource_id && (
                      <span className="ml-2 text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        id:{log.resource_id.slice(-6)}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-slate-400 dark:text-slate-500">
                    {log.ip_address || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modernized Pagination */}
      <div className="flex items-center justify-end gap-3 mt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={skip === 0}
          onClick={() => setSkip((value) => Math.max(0, value - limit))}
          className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length < limit}
          onClick={() => setSkip((value) => value + limit)}
          className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-6 bg-slate-50/50 dark:bg-transparent">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Immutable, cryptographically verified security events and actions taken within your organization.
          </p>
        </div>
      </div>

      <RoleGate
        allowedRoles={["owner", "admin"]}
        fallback={
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <ErrorState variant="page" message="You do not have permission to view audit logs." />
          </div>
        }
      >
        <AuditLogViewer />
      </RoleGate>
    </div>
  );
}
