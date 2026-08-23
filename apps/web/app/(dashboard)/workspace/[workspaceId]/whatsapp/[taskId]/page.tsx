"use client";

import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, CheckCheck, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getWhatsAppThread, listWhatsAppConversations, sendWhatsAppMessage, type WhatsAppMessage } from "@/lib/queries/whatsapp";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  if (status === "FAILED") return <span className="text-[10px] text-destructive">Failed</span>;
  if (status === "READ" || status === "DELIVERED") return <CheckCheck className="h-3 w-3" />;
  return <Check className="h-3 w-3" />;
}

function Bubble({ message }: { message: WhatsAppMessage }) {
  const mine = message.direction === "OUTBOUND";
  return (
    <div className={cn("flex items-end gap-2 px-2 py-1", mine && "flex-row-reverse")}>
      <span className={cn("mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", mine ? "bg-primary/15" : "bg-muted")}>
        {mine ? <Phone className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
      </span>
      <div className={cn("flex max-w-[65%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">Client</span>}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm",
            mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-muted/60",
          )}
        >
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
        <div className={cn("mt-0.5 flex items-center gap-1 px-1 text-muted-foreground", mine && "flex-row-reverse")}>
          <span className="text-[11px]">{format(new Date(message.createdAt), "h:mm a")}</span>
          {mine && <StatusIcon status={message.status} />}
          {mine && message.author && <span className="text-[11px]">· {message.author.name}</span>}
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppConversationPage({ params }: { params: Promise<{ workspaceId: string; taskId: string }> }) {
  const { workspaceId, taskId } = use(params);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");

  // Shares the sidebar's cached list rather than adding a per-task title
  // endpoint — this is the only place that needs this conversation's title.
  const { data: conversations } = useQuery({
    queryKey: ["whatsapp-conversations", workspaceId],
    queryFn: () => listWhatsAppConversations(workspaceId),
  });
  const conversation = conversations?.find((c) => c.taskId === taskId);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["whatsapp", taskId],
    queryFn: () => getWhatsAppThread(taskId),
    refetchInterval: 15000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  const mutation = useMutation({
    mutationFn: () => sendWhatsAppMessage(taskId, { body: body.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", taskId] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", workspaceId] });
      setBody("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not send WhatsApp message"),
  });

  function submit() {
    if (!body.trim()) return;
    mutation.mutate();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{conversation?.title ?? "Conversation"}</span>
        {thread?.phone && <span className="text-xs text-muted-foreground">· +{thread.phone}</span>}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !thread?.messages.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
        )}
        {thread?.messages.map((m) => <Bubble key={m.id} message={m} />)}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message…"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-input bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="icon" onClick={submit} disabled={!body.trim() || mutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
