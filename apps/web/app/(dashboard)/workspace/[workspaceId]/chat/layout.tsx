"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listChannels, type Channel } from "@/lib/queries/chat";
import { NewDmDialog } from "@/components/chat/new-dm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TopNav } from "@/components/layout/top-nav";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function ChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const pathname = usePathname();
  const currentUserId = useAuthStore((s) => s.user?.id);
  // Polling (rather than a socket event) keeps this simple: a DM someone else
  // just started with you needs to show up in the sidebar without you having
  // to already be in that channel's socket room to hear about it.
  const { data: channels } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => listChannels(workspaceId),
    refetchInterval: 15000,
  });

  const dmChannels = channels?.filter((c) => c.type === "DM") ?? [];

  function dmPartner(channel: Channel) {
    return channel.members.find((m) => m.userId !== currentUserId)?.user;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopNav title="Chat" />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3 scrollbar-thin">
            <div>
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct messages</span>
                <NewDmDialog workspaceId={workspaceId} />
              </div>
              <div className="space-y-0.5">
                {dmChannels.map((channel) => {
                  const href = `/workspace/${workspaceId}/chat/${channel.id}`;
                  const active = pathname === href;
                  const partner = dmPartner(channel);
                  return (
                    <Link
                      key={channel.id}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        active ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-accent",
                      )}
                    >
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={partner?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[9px]">{partner?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{partner?.name ?? "Direct message"}</span>
                    </Link>
                  );
                })}
                {!dmChannels.length && <p className="px-2 py-1 text-xs text-muted-foreground">No conversations yet</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
