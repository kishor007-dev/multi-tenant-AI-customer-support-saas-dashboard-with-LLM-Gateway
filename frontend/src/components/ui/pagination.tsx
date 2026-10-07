import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  variant: "limit_skip" | "page_size";
  total?: number;
  limit?: number;
  skip?: number;
  onSkipChange?: (skip: number) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function Pagination({
  variant,
  total = 0,
  limit = 20,
  skip = 0,
  onSkipChange,
  page = 1,
  pageSize = 20,
  onPageChange,
  className,
}: PaginationProps) {
  if (variant === "limit_skip") {
    const hasNext = skip + limit < total;
    const hasPrev = skip > 0;

    return (
      <div className={cn("flex items-center justify-between px-1 py-2", className)}>
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{total === 0 ? 0 : skip + 1}</span> to{" "}
          <span className="font-medium text-foreground">{Math.min(skip + limit, total)}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => onSkipChange && onSkipChange(Math.max(0, skip - limit))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => onSkipChange && onSkipChange(skip + limit)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className={cn("flex items-center justify-between px-1 py-2", className)}>
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrevPage} onClick={() => onPageChange && onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={() => onPageChange && onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}