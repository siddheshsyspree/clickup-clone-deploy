"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { chatAttachmentBlob, downloadChatAttachment, type MessageAttachment } from "@/lib/queries/chat";

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Downloads render only through this authorized fetch — the stored fileUrl is a bare storage key, not a servable path. */
function usePreviewUrl(attachmentId: string, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    chatAttachmentBlob(attachmentId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, enabled]);

  return url;
}

export function ChatAttachment({ attachment, mine }: { attachment: MessageAttachment; mine: boolean }) {
  const isImage = attachment.mimeType.startsWith("image/");
  const isVideo = attachment.mimeType.startsWith("video/");
  const previewUrl = usePreviewUrl(attachment.id, isImage || isVideo);

  if (isImage) {
    return previewUrl ? (
      <a href={previewUrl} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it */}
        <img src={previewUrl} alt={attachment.fileName} className="max-h-64 max-w-full rounded-lg object-cover" />
      </a>
    ) : (
      <div className="h-32 w-48 animate-pulse rounded-lg bg-black/10" />
    );
  }

  if (isVideo) {
    return previewUrl ? (
      <video src={previewUrl} controls className="max-h-64 max-w-full rounded-lg" />
    ) : (
      <div className="h-32 w-48 animate-pulse rounded-lg bg-black/10" />
    );
  }

  return (
    <button
      onClick={() => downloadChatAttachment(attachment.id, attachment.fileName)}
      className={mine
        ? "flex w-full items-center gap-2.5 rounded-lg bg-black/10 p-2 text-left transition-colors hover:bg-black/15"
        : "flex w-full items-center gap-2.5 rounded-lg bg-background/60 p-2 text-left transition-colors hover:bg-background"}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-black/10 text-current">
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{attachment.fileName}</span>
        <span className="block text-xs opacity-70">{humanSize(attachment.fileSize)}</span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </button>
  );
}
