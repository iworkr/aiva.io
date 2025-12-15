/**
 * ReferenceCard Component
 * Displays "Found this for you" cards when AI surfaces relevant content
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  User,
  ExternalLink,
  Paperclip,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { FoundReference } from "@/lib/ai/reference-engine";

interface ReferenceCardProps {
  reference: FoundReference;
  aiExplanation?: string;
  onViewEmail?: (messageId: string) => void;
  onViewFile?: (attachmentId: string) => void;
  onAttach?: (reference: FoundReference) => void;
  onDismiss?: () => void;
  variant?: "inline" | "floating" | "compact";
  className?: string;
}

const typeIcons = {
  email: Mail,
  file: FileText,
  contact: User,
};

const fileTypeIcons: Record<string, React.ElementType> = {
  document: FileText,
  spreadsheet: FileSpreadsheet,
  image: FileImage,
  pdf: FileText,
  presentation: FileText,
  other: File,
};

function getFileIcon(metadata?: Record<string, any>): React.ElementType {
  const contentType = metadata?.contentType || "other";
  return fileTypeIcons[contentType] || File;
}

export function ReferenceCard({
  reference,
  aiExplanation,
  onViewEmail,
  onViewFile,
  onAttach,
  onDismiss,
  variant = "inline",
  className,
}: ReferenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = reference.type === "file" 
    ? getFileIcon(reference.metadata) 
    : typeIcons[reference.type];

  const isFloating = variant === "floating";
  const isCompact = variant === "compact";

  const handleViewClick = () => {
    if (reference.type === "email" && reference.sourceMessageId && onViewEmail) {
      onViewEmail(reference.sourceMessageId);
    } else if (reference.type === "file" && reference.attachmentId && onViewFile) {
      onViewFile(reference.attachmentId);
    }
  };

  const confidenceLabel = reference.relevanceScore >= 0.8 
    ? "Strong match" 
    : reference.relevanceScore >= 0.5 
      ? "Good match" 
      : "Possible match";

  const confidenceColor = reference.relevanceScore >= 0.8
    ? "text-emerald-600 dark:text-emerald-400"
    : reference.relevanceScore >= 0.5
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative",
        isFloating && "fixed bottom-20 right-6 z-50 max-w-sm",
        className
      )}
    >
      <Card className={cn(
        "overflow-hidden border-primary/20",
        isFloating && "shadow-lg bg-card/95 backdrop-blur-sm",
        isCompact && "border-none shadow-none bg-muted/30"
      )}>
        {/* Subtle gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-60" />

        {/* Header */}
        <CardHeader className={cn(
          "pb-2",
          isCompact && "p-3"
        )}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              {/* Icon with glow */}
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                reference.type === "email" 
                  ? "bg-blue-100 dark:bg-blue-900/30" 
                  : "bg-primary/10"
              )}>
                <IconComponent className={cn(
                  "h-4 w-4",
                  reference.type === "email" 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-primary"
                )} />
              </div>

              <div className="min-w-0 flex-1">
                {/* AI insight header */}
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {reference.type === "email" ? "Found a relevant email" : "Found a helpful file"}
                  </span>
                </div>

                <CardTitle className={cn(
                  "text-sm font-semibold line-clamp-1",
                  isCompact && "text-xs"
                )}>
                  {reference.title}
                </CardTitle>

                {aiExplanation && !isCompact && (
                  <CardDescription className="text-xs mt-1 line-clamp-2">
                    {aiExplanation}
                  </CardDescription>
                )}
              </div>
            </div>

            {/* Dismiss button */}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className={cn(
          "pt-0",
          isCompact && "p-3 pt-0"
        )}>
          {/* Preview (expandable) */}
          {reference.preview && !isCompact && (
            <div className="mb-3">
              <p className={cn(
                "text-xs text-muted-foreground",
                isExpanded ? "" : "line-clamp-2"
              )}>
                {reference.preview}
              </p>
              {reference.preview.length > 100 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 px-2 text-xs mt-1"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      More
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
            {/* Confidence badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn("font-medium", confidenceColor)}>
                    {confidenceLabel}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{Math.round(reference.relevanceScore * 100)}% relevance score</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Timestamp */}
            {reference.timestamp && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(reference.timestamp), { addSuffix: true })}
              </span>
            )}

            {/* File info */}
            {reference.metadata?.filename && (
              <span className="truncate max-w-[120px]">
                {reference.metadata.filename}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleViewClick}
              className="flex-1 gap-1.5 h-8"
            >
              <Eye className="h-3.5 w-3.5" />
              {reference.type === "email" ? "View Email" : "View File"}
            </Button>

            {reference.type === "file" && onAttach && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAttach(reference)}
                      className="h-8 px-2"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach to reply</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {reference.type === "email" && reference.sourceMessageId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/inbox/${reference.sourceMessageId}`, "_blank")}
                      className="h-8 px-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in new tab</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * List of reference cards
 */
interface ReferenceCardListProps {
  references: FoundReference[];
  aiExplanation?: string;
  onViewEmail?: (messageId: string) => void;
  onViewFile?: (attachmentId: string) => void;
  onAttach?: (reference: FoundReference) => void;
  maxVisible?: number;
  className?: string;
}

export function ReferenceCardList({
  references,
  aiExplanation,
  onViewEmail,
  onViewFile,
  onAttach,
  maxVisible = 3,
  className,
}: ReferenceCardListProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleRefs = showAll ? references : references.slice(0, maxVisible);
  const hasMore = references.length > maxVisible;

  if (references.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium">Aiva found something helpful</span>
        {references.length > 1 && (
          <span className="text-xs text-muted-foreground">
            ({references.length} items)
          </span>
        )}
      </div>

      {/* Reference cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-2">
          {visibleRefs.map((ref) => (
            <ReferenceCard
              key={ref.id}
              reference={ref}
              aiExplanation={ref === references[0] ? aiExplanation : undefined}
              onViewEmail={onViewEmail}
              onViewFile={onViewFile}
              onAttach={onAttach}
              variant="compact"
            />
          ))}
        </div>
      </AnimatePresence>

      {/* Show more/less button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {references.length - maxVisible} more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

