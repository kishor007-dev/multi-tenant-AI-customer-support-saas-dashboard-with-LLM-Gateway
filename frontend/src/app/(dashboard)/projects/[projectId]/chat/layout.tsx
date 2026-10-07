"use client";

import * as React from "react";
import { useConversations, useCreateConversation } from "@/hooks/use-chat";
import { ConversationList } from "@/components/chat/conversation-list";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ChatLayout({
  params,
  children,
}: {
  params: { projectId: string };
  children: React.ReactNode;
}) {
  const { projectId } = params;
  const [skip, setSkip] = React.useState(0);
  const limit = 20;

  const { data: conversations, isLoading } = useConversations(projectId, limit, skip);
  const { mutate: createConv, isPending: isCreating } = useCreateConversation(projectId);
  const pathname = usePathname();

  const isViewingDetail = pathname !== `/projects/${projectId}/chat`;

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={cn(
          "w-full shrink-0 flex-col border-r border-border md:flex md:w-80",
          isViewingDetail ? "hidden md:flex" : "flex"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Conversations</h2>
          <Button size="icon" variant="ghost" onClick={() => createConv()} disabled={isCreating}>
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {isLoading ? (
            <div className="animate-pulse p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !conversations || conversations.length === 0 ? (
            <EmptyState icon={MessageSquarePlus} title="No conversations" description="Start a chat to get help." />
          ) : (
            <div className="flex h-full flex-col">
              <ConversationList conversations={conversations} />
              <Pagination
                variant="limit_skip"
                total={conversations.length === limit ? skip + limit + 1 : skip + conversations.length}
                skip={skip}
                limit={limit}
                onSkipChange={setSkip}
                className="border-t border-border bg-background px-4"
              />
            </div>
          )}
        </div>
      </div>

      <div
        className={cn("flex-1 flex-col overflow-hidden bg-background", !isViewingDetail ? "hidden md:flex" : "flex")}
      >
        {children}
      </div>
    </div>
  );
}