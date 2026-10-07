"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Moon, Sun, Zap } from "lucide-react";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { useAuthStore } from "@/lib/auth-store";
import { jwtDecode } from "jwt-decode";
import { UpgradeModal } from "@/components/providers/UpgradeModal";
import { Button } from "@/components/ui/button";

export function Topbar({ className }: React.HTMLAttributes<HTMLElement>) {
  const { accessToken } = useAuthStore();
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState("starter");

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (accessToken) {
      try {
        const decoded: any = jwtDecode(accessToken);
        if (decoded && decoded.tier) {
          setCurrentPlan(decoded.tier.toLowerCase());
        }
      } catch (e) {
        console.error("Failed to decode token for plan", e);
      }
    }
  }, [accessToken]);

  const canUpgrade = currentPlan !== "enterprise";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm transition-colors lg:px-6",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
          <MobileNavDrawer />
        </div>
        <h1 className="text-base font-semibold tracking-tight text-foreground">Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1.5 text-xs font-medium capitalize text-muted-foreground sm:flex">
          Plan
          <span className="font-semibold text-primary">{currentPlan}</span>
        </div>

        {canUpgrade && (
          <Button size="sm" className="rounded-full" onClick={() => setShowUpgrade(true)}>
            <Zap className="h-3.5 w-3.5" />
            Upgrade
          </Button>
        )}

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal
          currentPlan={currentPlan}
          onClose={() => setShowUpgrade(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </header>
  );
}