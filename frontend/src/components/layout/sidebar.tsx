"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignalRing } from "@/components/ui/signal-ring";
import { UserMenu } from "@/components/layout/user-menu";
import { RoleGate } from "@/components/auth/role-gate";
import { NAV_GROUPS } from "@/components/layout/nav-links";
import { ArrowLeft, Sparkles } from "lucide-react";

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  return (
    <aside
      className={cn(
        "hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex",
        className
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <h2 className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
          SupportAI
        </h2>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-6 px-3 text-sm font-medium">
          {projectId && (
            <div className="mb-4 space-y-1">
              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-muted-foreground transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
              >
                <ArrowLeft className="h-4 w-4 opacity-70" />
                Back to Projects
              </Link>
            </div>
          )}

          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted-foreground/70">
                {group.label}
              </h3>

              {group.items.map((item) => {
                const isProjectLink = ["/chat", "/knowledge-base", "/tickets"].includes(item.href);
                if (!projectId && isProjectLink) return null;

                const actualHref =
                  projectId && isProjectLink ? `/projects/${projectId}${item.href}` : item.href;

                const isActive = pathname.startsWith(actualHref);

                return (
                  <RoleGate key={item.name} allowedRoles={item.roles}>
                    <Link
                      href={actualHref}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-muted-foreground hover:bg-white/5 hover:text-sidebar-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <item.icon
                        className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "opacity-70")}
                      />
                      {item.name}
                    </Link>
                  </RoleGate>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="shrink-0 space-y-4 border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 py-1 text-sm text-sidebar-muted-foreground">
          <SignalRing status="live" />
          <span>Live connection</span>
        </div>
        <UserMenu />
      </div>
    </aside>
  );
}