import { createSupabaseUnkeyClient } from "@/supabase-clients/unkey/createSupabaseUnkeyClient";
import { NextRequest, NextResponse } from "next/server";
import { withCacheHeaders, CachePresets } from '@/utils/api-cache-headers';

export async function GET(req: NextRequest) {
  try {
    const supabaseClient = await createSupabaseUnkeyClient(req);
    const { data, error: userError } = await supabaseClient.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const { user } = data;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const responseHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const response = NextResponse.json(user, {
      headers: responseHeaders,
    });

    // Cache user data privately for 1 minute
    return withCacheHeaders(response, CachePresets.userData());
  } catch (error) {
    return new NextResponse(String(error), { status: 500 });
  }
}
