"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface CopyableTokenCardProps {
  token: string;
}

export function CopyableTokenCard({ token }: CopyableTokenCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteLink = origin ? `${origin}/join/${token}` : `/join/${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "Invite link copied to clipboard", variant: "default" });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard write failed", err);
      toast({
        title: "Failed to copy link",
        description: "Please select and copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-warning">Important: Copy this link now</p>
      <p className="text-sm text-foreground">
        This is the only time you&apos;ll see this link — copy it now before closing this window. The backend stores
        only its hash.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={inviteLink} className="bg-background font-mono text-xs" />
        <Button onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
      </div>
    </div>
  );
}