

"use client";
import * as React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DailyUsage } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { BarChart2, LineChart as LineChartIcon } from "lucide-react";

interface UsageChartProps {
  usage: DailyUsage[];
}

export function UsageChart({ usage }: UsageChartProps) {
  const [chartType, setChartType] = React.useState<"line" | "bar">("line");

  const data = React.useMemo(() => {
    return usage.map((day) => ({
      ...day,
      shortDate: new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      totalTokens: day.prompt_tokens + day.completion_tokens,
    }));
  }, [usage]);

  const hasUsage = usage.some((day) => day.prompt_tokens > 0 || day.completion_tokens > 0 || day.cost > 0);

  const tooltipProps = {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      borderColor: "hsl(var(--border))",
      borderRadius: "var(--radius)",
    },
    itemStyle: { fontFamily: "var(--font-geist-mono)", fontSize: "12px" },
    labelStyle: { fontWeight: 600, color: "hsl(var(--foreground))" },
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Usage History</h3>
        <div className="flex items-center rounded-lg bg-muted/50 p-1">
          <Button
            variant={chartType === "line" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setChartType("line")}
            aria-label="View as Line Chart"
          >
            <LineChartIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "bar" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setChartType("bar")}
            aria-label="View as Bar Chart"
          >
            <BarChart2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="shortDate"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickMargin={10}
                minTickGap={20}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--primary))"
                fontSize={12}
                tickFormatter={(val) => val.toLocaleString()}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--warning))"
                fontSize={12}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalTokens"
                name="Tokens"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                name="Cost (USD)"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="shortDate"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickMargin={10}
                minTickGap={20}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--primary))"
                fontSize={12}
                tickFormatter={(val) => val.toLocaleString()}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--warning))"
                fontSize={12}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Bar yAxisId="left" dataKey="totalTokens" name="Tokens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="cost" name="Cost (USD)" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>

        {!hasUsage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-border bg-background/80 p-4 text-center shadow-soft backdrop-blur-sm">
              <p className="text-sm font-medium text-foreground">No usage yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Data will appear here once your team starts chatting.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}