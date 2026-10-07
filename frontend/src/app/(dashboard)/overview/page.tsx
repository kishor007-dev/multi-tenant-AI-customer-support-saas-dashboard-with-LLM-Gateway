"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LayoutDashboard,
  Ticket,
  MessageSquare,
  Activity,
  Zap,
  TrendingUp,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";

export default function OverviewPage() {
  const { accessToken } = useAuthStore();

  const [metrics, setMetrics] = React.useState({
    openTickets: "--",
    activeConversations: "--",
    tokensUsed: "--",
  });

  const [plan, setPlan] = React.useState("--");

  React.useEffect(() => {
    if (!accessToken) return;

    try {
      const decoded: any = jwtDecode(accessToken);
      if (decoded.tier) {
        setPlan(decoded.tier);
      }
    } catch (e) {
      console.error("Failed to decode token");
    }

    async function fetchDashboardData() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const summaryRes = await fetch(`${API_BASE}/analytics/summary`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const summaryData = await summaryRes.json();

        const usageRes = await fetch(`${API_BASE}/analytics/usage`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const usageData = await usageRes.json();

        const totalTokens =
          usageData.usage?.reduce(
            (sum: number, day: any) => sum + day.prompt_tokens + day.completion_tokens,
            0
          ) || 0;

        setMetrics({
          openTickets: summaryData.open_tickets?.toString() || "0",
          activeConversations: summaryData.active_conversations?.toString() || "0",
          tokensUsed: totalTokens.toLocaleString(),
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    }

    fetchDashboardData();
  }, [accessToken]);

  const isBrandNewOrg = false;

  if (isBrandNewOrg) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center">
        <EmptyState
          icon={LayoutDashboard}
          title="Welcome to your workspace"
          description="Your organization is set up. Invite your team or start a conversation to see metrics here."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Here is your workspace summary for the last 30 days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-shadow duration-200 hover:shadow-soft-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <Ticket className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold text-foreground">{metrics.openTickets}</div>
            <div className="mt-1.5 flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-success" />
              <span className="mr-1 font-medium text-success">Requires</span> attention
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-soft-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Conversations</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold text-foreground">{metrics.activeConversations}</div>
            <p className="mt-1.5 text-xs text-muted-foreground">Across all active projects</p>
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-soft-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Used</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/10 text-violet">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-semibold text-foreground">{metrics.tokensUsed}</div>
            <p className="mt-1.5 text-xs text-muted-foreground">Combined prompt &amp; completion</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 transition-shadow duration-200 hover:shadow-soft-lg">
          <div className="pointer-events-none absolute inset-0 bg-gradient-aurora opacity-[0.06]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-aurora text-white">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-semibold capitalize text-gradient-aurora">{plan}</div>
            <p className="mt-1.5 text-xs text-muted-foreground">Active billing cycle</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}