
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyUsage } from "@/types/analytics";

interface UsageSummaryCardsProps {
  usage: DailyUsage[];
}

export function UsageSummaryCards({ usage }: UsageSummaryCardsProps) {
  const summary = React.useMemo(() => {
    let totalTokens = 0;
    let totalCost = 0;
    usage.forEach((day) => {
      totalTokens += day.prompt_tokens + day.completion_tokens;
      totalCost += day.cost;
    });
    const averageDailyCost = usage.length > 0 ? totalCost / usage.length : 0;
    return { totalTokens, totalCost, averageDailyCost };
  }, [usage]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(val);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Total Tokens (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-3xl font-semibold text-foreground">
            {summary.totalTokens.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Total Cost (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-3xl font-semibold text-warning">{formatCurrency(summary.totalCost)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Avg Daily Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-3xl font-semibold text-foreground">
            {formatCurrency(summary.averageDailyCost)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}