import * as React from "react";
import { cn } from "@/lib/utils";

interface SignalRingProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: "live" | "reconnecting" | "offline";
}

export function SignalRing({ className, status = "live", ...props }: SignalRingProps) {
  const statusColors = {
    live: "bg-success",
    reconnecting: "bg-warning",
    offline: "bg-destructive",
  };

  return (
    <div className={cn("relative flex h-3 w-3 items-center justify-center", className)} {...props}>
      {status !== "offline" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping",
            statusColors[status]
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", statusColors[status])} />
    </div>
  );
}