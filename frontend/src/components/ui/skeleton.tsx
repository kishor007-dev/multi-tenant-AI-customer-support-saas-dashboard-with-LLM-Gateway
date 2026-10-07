import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function TableRowSkeleton() {
  return <Skeleton className="mb-2 h-12 w-full" />;
}

export function CardSkeleton() {
  return <Skeleton className="h-32 w-full rounded-xl" />;
}