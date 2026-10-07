
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Menu, X, ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NAV_GROUPS } from "@/components/layout/nav-links";
import { RoleGate } from "@/components/auth/role-gate";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

export function MobileNavDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const drawerContent = isOpen ? (
    <div className="fixed inset-0 z-[100] flex lg:hidden">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      {/* Keeps your exact desktop sidebar styling: bg-sidebar text-sidebar-foreground */}
      <div className="fixed inset-y-0 left-0 flex w-3/4 max-w-sm animate-in slide-in-from-left flex-col bg-sidebar p-6 text-sidebar-foreground shadow-2xl z-[101]">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">SupportAI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-6 text-sm font-medium">
            {projectId && (
              <div className="space-y-1">
                <Link href="/projects" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-muted-foreground hover:bg-white/5 hover:text-sidebar-foreground">
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

                  const actualHref = projectId && isProjectLink ? `/projects/${projectId}${item.href}` : item.href;
                  const isActive = pathname.startsWith(actualHref);

                  return (
                    <RoleGate key={item.name} allowedRoles={item.roles}>
                      <Link
                        href={actualHref}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-muted-foreground hover:bg-white/5 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-sidebar-primary" : "opacity-70")} />
                        {item.name}
                      </Link>
                    </RoleGate>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-4 border-t border-sidebar-border pt-4">
          <UserMenu />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} aria-label="Open Navigation">
        <Menu className="h-5 w-5" />
      </Button>
      {/* Portals the drawer out of the Topbar and directly into the body */}
      {mounted && typeof document !== "undefined" ? createPortal(drawerContent, document.body) : null}
    </>
  );
}
