"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ConversationOut } from "@/types/chat";
import { HandoffBadge } from "./handoff-badge";
import { cn } from "@/lib/utils";

export function ConversationList({ conversations }: { conversations: ConversationOut[] }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <div className="flex h-full flex-col divide-y divide-border overflow-auto">
      {conversations.map((conv) => {
        const chatUrl = projectId ? `/projects/${projectId}/chat/${conv.id}` : `/chat/${conv.id}`;
        const isActive = pathname === chatUrl;
        const lastMessage = conv.messages?.[conv.messages.length - 1];

        return (
          <Link
            key={conv.id}
            href={chatUrl}
            className={cn(
              "relative flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40",
              isActive && "bg-primary/5"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-0 h-full w-0.5 bg-primary transition-opacity",
                isActive ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <HandoffBadge handedOff={conv.handed_off} />
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(conv.updated_at).toLocaleDateString("en-IN")}
              </span>
            </div>
            <p className="h-5 truncate text-sm text-foreground">
              {lastMessage ? lastMessage.content : "New conversation"}
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {conv.messages?.length || 0} messages
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}