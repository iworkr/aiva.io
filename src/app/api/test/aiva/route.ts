/**
 * Aiva.io Test API Endpoint
 * Runs comprehensive backend tests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { getSoloWorkspace } from '@/rsc-data/user/get-solo-workspace';
import { runAllTests } from '@/lib/test-utils/aiva-tests';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace
    const workspace = await getSoloWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      );
    }

    // Run tests
    const results = await runAllTests(workspace.id, user.id);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test execution error:', error);
    return NextResponse.json(
      {
        error: 'Test execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

