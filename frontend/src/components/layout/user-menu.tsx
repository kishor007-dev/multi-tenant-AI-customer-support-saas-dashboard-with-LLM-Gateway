"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { LogOut, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary">
          <User className="h-4 w-4" />
        </div>
        <div className="flex flex-col truncate">
          <span className="truncate text-sm font-medium text-sidebar-foreground">Account</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-full text-sidebar-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={handleLogout}
        aria-label="Log out"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}