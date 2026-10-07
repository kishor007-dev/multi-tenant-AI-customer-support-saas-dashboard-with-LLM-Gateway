import * as React from "react"; import { Badge } from "@/components/ui/badge";
import { Bot, Headset } from "lucide-react";
import { cn } from "@/lib/utils";
export function HandoffBadge({ handedOff, className }: { handedOff:
boolean; className?: string }) {
if (handedOff) {
return (
<Badge variant="secondary" className={cn("gap-1 text-xs",
className)}>
<Headset className="h-3 w-3" />
Agent
</Badge>
);
}
return (
<Badge variant="signal" className={cn("gap-1 text-xs",
className)}>
<Bot className="h-3 w-3" />
AI
</Badge>
);
}
