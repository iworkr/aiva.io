/**
 * Shopify Data Sync Cron Job
 * Periodically syncs orders, customers, and products from Shopify
 * 
 * Schedule: Every 6 hours (configurable in vercel.json)
 * 
 * This job syncs data from all active Shopify stores that have:
 * - An active connection (is_active = true)
 * - A linked workspace (workspace_id is not null)
 * - Sync enabled (sync_enabled = true)
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAllActiveStores, SyncOptions } from "@/lib/shopify/sync";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minute timeout for syncing multiple stores

/**
 * Verify the request is from Vercel Cron or an authorized source
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get("x-vercel-cron");

  console.log("🔐 Shopify sync cron auth check:", {
    hasAuthHeader: !!authHeader,
    hasCronSecret: !!cronSecret,
    hasVercelCronHeader: !!vercelCron,
  });

  // Method 1: Check CRON_SECRET Bearer token
  if (cronSecret && authHeader) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader === expectedAuth) {
      console.log("✅ Cron auth: Valid CRON_SECRET");
      return true;
    }
  }

  // Method 2: Check for Vercel's internal cron header
  if (vercelCron === "1") {
    console.log("✅ Cron auth: Valid x-vercel-cron header");
    return true;
  }

  // Method 3: In development, allow without auth
  if (process.env.NODE_ENV !== "production") {
    console.log("✅ Cron auth: Development mode");
    return true;
  }

  console.log("❌ Cron auth failed");
  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  console.log("🛍️ Shopify sync cron job started");

  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      console.warn("Unauthorized Shopify sync cron request attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get sync options from query params
    const url = new URL(request.url);
    const fullSync = url.searchParams.get("fullSync") === "true";
    const maxRecords = parseInt(url.searchParams.get("maxRecords") || "250", 10);

    const options: SyncOptions = {
      fullSync,
      maxRecords,
    };

    console.log("🛍️ Shopify sync options:", options);

    // Sync all active stores
    const result = await syncAllActiveStores(options);

    const duration = Date.now() - startTime;

    console.log("🛍️ Shopify sync cron job completed:", {
      duration: `${duration}ms`,
      storesProcessed: result.storesProcessed,
      storesSucceeded: result.storesSucceeded,
      storesFailed: result.storesFailed,
      totalRecordsSynced: result.totalRecordsSynced,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        storesProcessed: result.storesProcessed,
        storesSucceeded: result.storesSucceeded,
        storesFailed: result.storesFailed,
        totalRecordsSynced: result.totalRecordsSynced,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("❌ Shopify sync cron job error:", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}



