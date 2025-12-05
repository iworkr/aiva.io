/**
 * AttachmentPreview Component
 * Modal preview for attachments with details and actions
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Paperclip,
  Mail,
  Clock,
  User,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAction } from "next-safe-action/hooks";
import { getAttachmentAction } from "@/data/user/references";

interface AttachmentPreviewProps {
  attachmentId: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onAttach?: (attachment: AttachmentData) => void;
}

interface AttachmentData {
  id: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  content_preview?: string;
  content_type?: string;
  extracted_title?: string;
  extracted_summary?: string;
  download_url?: string;
  created_at: string;
  message?: {
    id: string;
    subject: string;
    sender_email: string;
    sender_name?: string;
    timestamp: string;
  };
}

const fileTypeIcons: Record<string, React.ElementType> = {
  document: FileText,
  spreadsheet: FileSpreadsheet,
  image: FileImage,
  pdf: FileText,
  presentation: FileText,
  other: File,
};

const fileTypeLabels: Record<string, string> = {
  document: "Document",
  spreadsheet: "Spreadsheet",
  image: "Image",
  pdf: "PDF",
  presentation: "Presentation",
  other: "File",
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreview({
  attachmentId,
  workspaceId,
  isOpen,
  onClose,
  onAttach,
}: AttachmentPreviewProps) {
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { execute: fetchAttachment, status } = useAction(getAttachmentAction, {
    onSuccess: ({ data }) => {
      if (data?.data) {
        setAttachment(data.data as AttachmentData);
        setError(null);
      }
    },
    onError: ({ error: err }) => {
      setError(err.serverError || "Failed to load attachment");
    },
  });

  useEffect(() => {
    if (isOpen && attachmentId) {
      setAttachment(null);
      setError(null);
      fetchAttachment({ attachmentId, workspaceId });
    }
  }, [isOpen, attachmentId, workspaceId]);

  const isLoading = status === "executing";
  const IconComponent = fileTypeIcons[attachment?.content_type || "other"] || File;
  const typeLabel = fileTypeLabels[attachment?.content_type || "other"] || "File";

  const handleDownload = () => {
    if (attachment?.download_url) {
      window.open(attachment.download_url, "_blank");
    }
  };

  const handleViewEmail = () => {
    if (attachment?.message?.id) {
      window.open(`/inbox/${attachment.message.id}`, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-primary" />
            Attachment Preview
          </DialogTitle>
          <DialogDescription>
            Review and use this attachment
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAttachment({ attachmentId, workspaceId })}
              className="mt-4"
            >
              Try again
            </Button>
          </div>
        )}

        {/* Attachment content */}
        {attachment && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* File info header */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="p-3 rounded-lg bg-primary/10">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {attachment.extracted_title || attachment.filename}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {typeLabel}
                  </Badge>
                  <span>{formatFileSize(attachment.size_bytes)}</span>
                </div>
                {attachment.filename !== attachment.extracted_title && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {attachment.filename}
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            {attachment.extracted_summary && (
              <div>
                <h4 className="text-sm font-medium mb-2">Summary</h4>
                <ScrollArea className="h-24 rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">
                    {attachment.extracted_summary}
                  </p>
                </ScrollArea>
              </div>
            )}

            {/* Content preview */}
            {attachment.content_preview && !attachment.extracted_summary && (
              <div>
                <h4 className="text-sm font-medium mb-2">Content Preview</h4>
                <ScrollArea className="h-24 rounded-md border p-3">
                  <p className="text-sm text-muted-foreground font-mono text-xs whitespace-pre-wrap">
                    {attachment.content_preview}
                  </p>
                </ScrollArea>
              </div>
            )}

            <Separator />

            {/* Source email info */}
            {attachment.message && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Source Email</h4>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.message.subject || "(no subject)"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">
                        {attachment.message.sender_name || attachment.message.sender_email}
                      </span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>
                        {format(new Date(attachment.message.timestamp), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewEmail}
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {attachment.download_url && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              {onAttach && (
                <Button
                  onClick={() => {
                    onAttach(attachment);
                    onClose();
                  }}
                  className="flex-1 gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach to Reply
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact inline attachment preview
 */
interface InlineAttachmentPreviewProps {
  filename: string;
  contentType?: string;
  sizeBytes?: number;
  onRemove?: () => void;
  className?: string;
}

export function InlineAttachmentPreview({
  filename,
  contentType,
  sizeBytes,
  onRemove,
  className,
}: InlineAttachmentPreviewProps) {
  const IconComponent = fileTypeIcons[contentType || "other"] || File;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30",
        className
      )}
    >
      <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{filename}</p>
        {sizeBytes && (
          <p className="text-xs text-muted-foreground">
            {formatFileSize(sizeBytes)}
          </p>
        )}
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

