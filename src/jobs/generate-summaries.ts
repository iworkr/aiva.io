/**
 * Background Job: Generate AI Summaries
 * 
 * This job generates short AI summaries for messages that don't have them.
 * It's designed to run after message sync operations.
 * 
 * Usage:
 * - Called automatically after sync operations
 * - Can be triggered manually via generateSummariesAction
 * - Runs in batches to avoid rate limits
 */

"use server";

import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { batchSummarizeMessages } from "@/lib/ai/summarizer";

export interface SummaryJobResult {
  workspaceId: string;
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  duration: number;
}

/**
 * Run summary generation job for a workspace
 * Processes messages without summaries in batches
 */
export async function runSummaryJob(
  workspaceId: string,
  options?: {
    batchSize?: number;
    maxBatches?: number;
    delayBetweenBatches?: number;
  }
): Promise<SummaryJobResult> {
  const startTime = Date.now();
  const batchSize = options?.batchSize ?? 20;
  const maxBatches = options?.maxBatches ?? 5;
  const delayBetweenBatches = options?.delayBetweenBatches ?? 1000;

  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let batchCount = 0;

  const supabase = await createSupabaseUserServerActionClient();

  while (batchCount < maxBatches) {
    // Check how many messages still need summaries
    const { count: remaining } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("ai_summary_short", null);

    if (!remaining || remaining === 0) {
      break; // No more messages to process
    }

    // Process a batch
    const result = await batchSummarizeMessages(workspaceId, batchSize);
    
    totalProcessed += result.processed;
    totalSucceeded += result.succeeded;
    totalFailed += result.failed;
    batchCount++;

    // If we processed fewer than batch size, we're done
    if (result.processed < batchSize) {
      break;
    }

    // Delay between batches to avoid rate limits
    if (batchCount < maxBatches && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Get final count of remaining messages
  const { count: finalRemaining } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("ai_summary_short", null);

  const duration = Date.now() - startTime;

  console.log(`[SummaryJob] Completed for workspace ${workspaceId}:`, {
    processed: totalProcessed,
    succeeded: totalSucceeded,
    failed: totalFailed,
    remaining: finalRemaining ?? 0,
    duration: `${duration}ms`,
  });

  return {
    workspaceId,
    processed: totalProcessed,
    succeeded: totalSucceeded,
    failed: totalFailed,
    remaining: finalRemaining ?? 0,
    duration,
  };
}

/**
 * Schedule summary generation after sync
 * This is a lightweight wrapper that can be called after message sync
 */
export async function scheduleSummaryGeneration(
  workspaceId: string,
  options?: { immediate?: boolean }
): Promise<void> {
  if (options?.immediate) {
    // Run immediately (blocking)
    await runSummaryJob(workspaceId, {
      batchSize: 10,
      maxBatches: 3, // Quick initial pass
    });
  } else {
    // Schedule for background execution
    // In a production environment, this would queue to a job system
    // For now, we'll run it after a short delay
    setTimeout(async () => {
      try {
        await runSummaryJob(workspaceId);
      } catch (error) {
        console.error("[SummaryJob] Background execution failed:", error);
      }
    }, 2000); // 2 second delay
  }
}

