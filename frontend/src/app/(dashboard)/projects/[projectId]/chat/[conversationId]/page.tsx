"use client";

import * as React from "react";
import { useConversation, useSendMessage, useDeleteConversation, chatKeys } from "@/hooks/use-chat";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { HandoffBanner } from "@/components/chat/handoff-banner";
import { EscalateDialog } from "@/components/chat/escalate-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { streamGatewayChat } from "@/lib/sse-client";
import { GatewayChatRequest } from "@/types/chat";

export default function ChatDetailPage({ params }: { params: { projectId: string; conversationId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId, conversationId } = params;

  const { data: conversation, isLoading, isError, error } = useConversation(projectId, conversationId);
  const { mutate: sendMessage, isPending: isSending, error: sendError } = useSendMessage(projectId, conversationId);
  const { mutate: deleteConv, isPending: isDeleting } = useDeleteConversation(projectId);

  const [escalateOpen, setEscalateOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamText, setStreamText] = React.useState("");
  const [optimisticUserText, setOptimisticUserText] = React.useState("");
  const [sseError, setSseError] = React.useState<any>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [conversation?.messages, streamText, optimisticUserText]);

  const handleDelete = () => {
    deleteConv(conversationId, {
      onSuccess: () => {
        router.push(`/projects/${projectId}/chat`);
      },
    });
  };

  const handleSend = async (text: string) => {
    setSseError(null);

    if (conversation?.handed_off) {
      sendMessage(text);
      return;
    }

    if (isStreaming) return;

    setIsStreaming(true);
    setStreamText("");
    setOptimisticUserText(text);

    abortControllerRef.current = new AbortController();

    const payload: GatewayChatRequest = {
      project_id: projectId,
      conversation_id: conversationId,
      messages: [
        ...(conversation?.messages || []).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ],
    };

    try {
      await streamGatewayChat(
        payload,
        (token) => {
          if (isMounted.current) {
            setStreamText((prev) => prev + token);
          }
        },
        abortControllerRef.current.signal
      );

      await queryClient.invalidateQueries({ queryKey: chatKeys.detail(projectId, conversationId) });
      await queryClient.invalidateQueries({ queryKey: chatKeys.lists(projectId) });
    } catch (err: any) {
      if (err.name !== "AbortError" && isMounted.current) {
        setSseError(err);
      }
    } finally {
      if (isMounted.current) {
        setIsStreaming(false);
        setOptimisticUserText("");
        setStreamText("");
      }
    }
  };

  if (isLoading) {
    return <div className="animate-pulse p-8 text-center text-sm text-muted-foreground">Loading conversation…</div>;
  }

  if (isError) {
    if ((error as any)?.response?.status === 403) {
      return <ErrorState variant="page" message="Conversation not found or you don't have access to it." />;
    }
    return <ErrorState variant="page" message="Couldn't load conversation." />;
  }

  if (!conversation) return null;

  const recentMessages = conversation.messages?.slice(-3) || [];
  const hideOptimisticUser =
    optimisticUserText && recentMessages.some((m) => m.role === "user" && m.content === optimisticUserText);
  const hideOptimisticAssistant =
    streamText && recentMessages.some((m) => m.role === "assistant" && m.content.includes(streamText.substring(0, 10)));

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href={`/projects/${projectId}/chat`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="font-semibold text-foreground">Chat Thread</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEscalateOpen(true)}>
            <AlertTriangle className="h-4 w-4" />
            Hand off to human
          </Button>
          <RoleGate allowedRoles={["owner", "admin"]}>
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </RoleGate>
        </div>
      </div>

      <HandoffBanner handedOff={conversation.handed_off} />

      <div ref={scrollRef} className="flex-1 scroll-smooth overflow-y-auto p-4 md:p-6">
        {conversation.messages?.length === 0 && !optimisticUserText ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Send a message to start.
          </div>
        ) : (
          <>
            {conversation.messages?.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}

            {isStreaming && optimisticUserText && !hideOptimisticUser && (
              <MessageBubble message={{ role: "user", content: optimisticUserText }} />
            )}

            {isStreaming && streamText && !hideOptimisticAssistant && (
              <MessageBubble message={{ role: "assistant", content: streamText }} />
            )}

            {isStreaming && !streamText && !hideOptimisticAssistant && (
              <div className="mb-6 mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="animate-pulse">Assistant is typing…</span>
              </div>
            )}
          </>
        )}
      </div>

      <ChatComposer onSend={handleSend} isPending={isSending || isStreaming} error={sendError || sseError} />

      <EscalateDialog isOpen={escalateOpen} onClose={() => setEscalateOpen(false)} conversationId={conversationId} />
    </div>
  );
}