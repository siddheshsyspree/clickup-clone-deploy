"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { listWhatsAppConversations } from "@/lib/queries/whatsapp";
import { TopNav } from "@/components/layout/top-nav";
import { cn } from "@/lib/utils";

export default function WhatsAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const pathname = usePathname();

  // Polling keeps this simple: a conversation a client starts (or a
  // teammate starts from a task) shows up here without needing a
  // workspace-wide socket room just for this list.
  const { data: conversations } = useQuery({
    queryKey: ["whatsapp-conversations", workspaceId],
    queryFn: () => listWhatsAppConversations(workspaceId),
    refetchInterval: 15000,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopNav title="WhatsApp" />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="px-3 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversations</span>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-2 scrollbar-thin">
            {conversations?.map((c) => {
              const href = `/workspace/${workspaceId}/whatsapp/${c.taskId}`;
              const active = pathname === href;
              return (
                <Link
                  key={c.taskId}
                  href={href}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate font-medium", active && "text-primary")}>{c.title}</span>
                    {c.lastMessage && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.lastMessage.createdAt))}
                      </span>
                    )}
                  </span>
                  {c.lastMessage && (
                    <span className="truncate text-xs text-muted-foreground">
                      {c.lastMessage.direction === "OUTBOUND" ? "You: " : ""}
                      {c.lastMessage.body}
                    </span>
                  )}
                </Link>
              );
            })}
            {!conversations?.length && (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No conversations yet — start one from a client&apos;s task.
              </p>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
