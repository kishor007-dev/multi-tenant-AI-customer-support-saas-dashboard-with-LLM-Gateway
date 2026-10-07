import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  variant?: "field" | "section" | "page";
  action?: React.ReactNode;
}

export function ErrorState({ message, variant = "section", action, className, ...props }: ErrorStateProps) {
  if (variant === "field") {
    return (
      <p className={cn("mt-1 text-sm font-medium text-destructive", className)} {...props}>
        {message}
      </p>
    );
  }

  if (variant === "section") {
    return (
      <div className={cn("rounded-lg border border-destructive/20 bg-destructive/10 p-4", className)} {...props}>
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{message}</p>
            {action && <div className="mt-3">{action}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[400px] flex-col items-center justify-center p-8 text-center", className)} {...props}>
      <AlertTriangle className="mb-4 h-12 w-12 text-warning" />
      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">Something went wrong</h2>
      <p className="mb-6 max-w-md text-muted-foreground">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}