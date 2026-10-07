import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}

export function EmptyState({ title, description, action, icon, className, ...props }: EmptyStateProps) {
  const Icon = icon ?? Inbox;

  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>

      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}