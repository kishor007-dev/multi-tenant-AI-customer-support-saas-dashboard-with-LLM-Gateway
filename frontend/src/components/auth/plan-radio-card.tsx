"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface PlanRadioCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  title: string;
  description: string;
}

export const PlanRadioCard = React.forwardRef<HTMLInputElement, PlanRadioCardProps>(
  ({ className, title, description, checked, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all hover:border-primary/40",
          checked ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card",
          className
        )}
      >
        <input type="radio" ref={ref} checked={checked} className="sr-only" {...props} />
        <div className="flex w-full items-center justify-between">
          <span className="font-medium text-foreground">{title}</span>
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
              checked ? "border-primary" : "border-border"
            )}
          >
            {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
          </span>
        </div>
        <span className="mt-1 text-sm text-muted-foreground">{description}</span>
      </label>
    );
  }
);
PlanRadioCard.displayName = "PlanRadioCard";