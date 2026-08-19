"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getOrCreateDm } from "@/lib/queries/chat";
import { listMembers } from "@/lib/queries/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

export function NewDmDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => listMembers(workspaceId),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (userId: string) => getOrCreateDm(workspaceId, userId),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
      setOpen(false);
      setSearch("");
      router.push(`/workspace/${workspaceId}/chat/${channel.id}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Something went wrong"),
  });

  const others = (members ?? [])
    .filter((m) => m.userId !== currentUserId && m.status === "ACTIVE")
    .filter((m) => m.user.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="New direct message">
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-input p-1.5 scrollbar-thin">
          {!others.length && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members found</p>}
          {others.map((m) => (
            <button
              key={m.userId}
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(m.userId)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={m.user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">{m.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.user.name}</p>
                {m.user.jobTitle && <p className="truncate text-xs text-muted-foreground">{m.user.jobTitle}</p>}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
