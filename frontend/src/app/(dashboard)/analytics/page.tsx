
"use client";

import * as React from "react";
import { useUsage } from "@/hooks/use-analytics";
import { UsageSummaryCards } from "@/components/analytics/usage-summary-cards";
import { UsageChart } from "@/components/analytics/usage-charts";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useUsage();

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usage Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your organization's token consumption and associated costs over the last 30 days.
        </p>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="h-[450px] w-full animate-pulse rounded-xl border border-border bg-muted" />
          </div>
        ) : isError ? (
          <ErrorState
            variant="page"
            message={
              (error as any)?.response?.status === 429
                ? "You are being rate limited. Please wait a moment before trying again."
                : "Couldn't load usage analytics. Please try again."
            }
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : data ? (
          <div className="flex flex-col gap-6 pb-8">
            <UsageSummaryCards usage={data.usage} />
            <UsageChart usage={data.usage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}