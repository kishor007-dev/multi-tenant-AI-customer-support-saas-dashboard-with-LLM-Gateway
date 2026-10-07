import * as React from "react";
import { Construction } from "lucide-react";

export function BrokenFeatureState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-in fade-in-50 duration-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 mb-6">
        <Construction className="h-10 w-10 text-amber-500" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
        Audit Logs Unavailable
      </h2>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Audit log viewing is temporarily unavailable while we fix a backend issue — nothing you do here is lost, this page just can't display it yet.
      </p>
    </div>
  );
}
