import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export function InviteInvalidState() {
return (
<div className="flex flex-col items-center justify-center
min-h-[400px] p-8 text-center animate-in fade-in-50 duration-500">
<div className="flex h-20 w-20 items-center justify-center
rounded-full bg-destructive/10 mb-6">
<AlertCircle className="h-10 w-10 text-destructive"
aria-hidden="true" />
</div>
<h2 className="text-2xl font-bold tracking-tight text-foreground
mb-3">
Invite Link Invalid
</h2>
<p className="text-muted-foreground max-w-sm mb-8
leading-relaxed">
This invite link isn't valid anymore — ask an admin to send a
new one.
</p>
<Button asChild variant="outline">
<Link href="/login">Return to Sign In</Link>
</Button>
</div>
);
}
