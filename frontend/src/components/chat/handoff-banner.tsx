import * as React from "react";
import { Headset } from "lucide-react";

export function HandoffBanner({ handedOff }: { handedOff: boolean }) {
  if (!handedOff) return null;

  return (
    <div className="flex animate-in items-center justify-center gap-2 border-b border-border bg-muted/50 p-3 text-sm font-medium text-foreground slide-in-from-top-2">
      <Headset className="h-4 w-4 text-muted-foreground" />
      An agent has taken over this conversation — AI replies are paused.
    </div>
  );
}