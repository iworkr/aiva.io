/**
 * Debug endpoint to test Shopify order context for a specific email
 * 
 * This endpoint helps test the full flow:
 * 1. Check if orders exist for Russel.winfield@example.com
 * 2. Create a test message from that email
 * 3. Verify AI can retrieve order context
 * 4. Optionally trigger Shopify sync
 * 
 * Usage:
 * GET /api/debug/test-shopify-email-context?workspaceId=xxx&email=Russel.winfield@example.com
 * POST /api/debug/test-shopify-email-context (with body: { workspaceId, email, subject?, body?, triggerSync? })
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { NextRequest, NextResponse } from 'next/server';
import { getCustomerOrderHistory, formatCustomerHistoryForAI } from '@/lib/shopify/context';
import { createMessageAction } from '@/data/user/messages';
import { syncShopifyOrders } from '@/lib/shopify/sync';
import { getActiveConnectionByProvider } from '@/data/user/channels';
import { getSoloWorkspace } from '@/data/user/workspaces';

async function getWorkspaceAndConnection(userId: string, workspaceId?: string | null) {
  // If workspaceId not provided, get user's solo workspace
  let finalWorkspaceId = workspaceId;
  if (!finalWorkspaceId) {
    try {
      const soloWorkspace = await getSoloWorkspace();
      finalWorkspaceId = soloWorkspace.id;
    } catch (error) {
      throw new Error('No workspace found. Please provide workspaceId or create a workspace first.');
    }
  }

  // Get active Gmail or Outlook connection
  const gmailConnection = await getActiveConnectionByProvider(finalWorkspaceId, userId, 'gmail');
  const outlookConnection = await getActiveConnectionByProvider(finalWorkspaceId, userId, 'outlook');
  const emailConnection = gmailConnection || outlookConnection;

  if (!emailConnection) {
    throw new Error('No active Gmail or Outlook connection found. Please connect an email account first.');
  }

  return { workspaceId: finalWorkspaceId, connection: emailConnection };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const email = searchParams.get('email') || 'Russel.winfield@example.com';

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = supabaseAdminClient;

    // 1. Check if Shopify store is connected
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, is_active, sync_enabled')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        error: 'No active Shopify store found for this workspace',
        details: storeError?.message,
        workspaceId,
      }, { status: 404 });
    }

    // 2. Check for orders with this email
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('shopify_store_id', store.id)
      .eq('email', email.toLowerCase())
      .order('created_at_shopify', { ascending: false })
      .limit(10);

    if (ordersError) {
      return NextResponse.json({
        error: 'Failed to query orders',
        details: ordersError.message,
      }, { status: 500 });
    }

    // 3. Check for customer record
    const { data: customer, error: customerError } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('shopify_store_id', store.id)
      .eq('email', email.toLowerCase())
      .limit(1)
      .single();

    // 4. Test the AI context retrieval function
    let customerHistory = null;
    let formattedContext = '';
    try {
      customerHistory = await getCustomerOrderHistory(
        workspaceId,
        email,
        { useAdminClient: true }
      );
      formattedContext = formatCustomerHistoryForAI(customerHistory);
    } catch (contextError) {
      console.error('Failed to get customer history:', contextError);
    }

    // 5. Check for existing messages from this email
    const { data: existingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, subject, timestamp, created_at')
      .eq('workspace_id', workspaceId)
      .eq('sender_email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      workspaceId,
      email,
      shopifyStore: {
        id: store.id,
        domain: store.shop_domain,
        name: store.shop_name,
        isActive: store.is_active,
        syncEnabled: store.sync_enabled,
      },
      orders: {
        count: orders?.length || 0,
        orders: (orders || []).map(order => ({
          orderId: order.id,
          shopifyOrderId: order.shopify_order_id,
          orderNumber: order.order_number || order.name,
          totalPrice: order.total_price,
          currency: order.currency,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          createdAt: order.created_at_shopify,
        })),
      },
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        ordersCount: customer.orders_count,
        totalSpent: customer.total_spent,
      } : null,
      aiContext: {
        orderCount: customerHistory?.orderCount || 0,
        totalSpent: customerHistory?.totalSpent || 0,
        formattedContext: formattedContext || '(no context - no orders found)',
        rawHistory: customerHistory,
      },
      existingMessages: {
        count: existingMessages?.length || 0,
        messages: existingMessages || [],
      },
      recommendations: {
        hasOrders: (orders?.length || 0) > 0,
        hasCustomer: !!customer,
        canTestAI: (orders?.length || 0) > 0,
        needsSync: (orders?.length || 0) === 0 && store.sync_enabled,
        message: (orders?.length || 0) > 0
          ? '✅ Orders found! You can create a test message to test AI context.'
          : '⚠️ No orders found. You may need to sync Shopify orders or create test orders in Shopify.',
      },
    });
  } catch (error) {
    console.error('Test Shopify email context error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      email = 'Russel.winfield@example.com',
      subject = 'Test: Order Inquiry',
      body: emailBody = 'Hi, I wanted to check on my recent order. Can you provide an update?',
      triggerSync = false,
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace and email connection
    const { workspaceId: finalWorkspaceId, connection: emailConnection } = await getWorkspaceAndConnection(
      user.id,
      workspaceId
    );

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 });
    }

    // Get Gmail or Outlook connection
    const { data: emailConnection, error: connError } = await supabase
      .from('channel_connections')
      .select('id, provider, provider_account_id, provider_account_name')
      .eq('workspace_id', workspaceId)
      .in('provider', ['gmail', 'outlook'])
      .eq('status', 'active')
      .limit(1)
      .single();

    if (connError || !emailConnection) {
      return NextResponse.json({
        error: 'No active email connection found. Please connect Gmail or Outlook first.',
      }, { status: 404 });
    }

    // Optionally trigger Shopify sync
    if (triggerSync) {
      const { data: store } = await supabaseAdminClient
        .from('shopify_stores')
        .select('id')
        .eq('workspace_id', finalWorkspaceId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (store) {
        try {
          console.log(`[Test] Triggering Shopify sync for store ${store.id}`);
          await syncShopifyOrders(store.id, finalWorkspaceId, {
            maxRecords: 100,
            fullSync: false,
          });
        } catch (syncError) {
          console.error('[Test] Sync error:', syncError);
          // Continue anyway - we'll create the test message
        }
      }
    }

    // Create test message
    const uniqueId = Date.now();
    const result = await createMessageAction({
      workspaceId: finalWorkspaceId,
      channelConnectionId: emailConnection.id,
      providerMessageId: `test_shopify_${uniqueId}`,
      providerThreadId: `thread_shopify_${uniqueId}`,
      subject,
      body: emailBody,
      bodyHtml: `<p>${emailBody.replace(/\n/g, '</p><p>')}</p>`,
      snippet: subject,
      senderEmail: email.toLowerCase(),
      senderName: 'Russel Winfield',
      recipients: [
        {
          email: emailConnection.provider_account_id || 'test@example.com',
          name: emailConnection.provider_account_name || 'You',
          type: 'to' as const,
        },
      ],
      timestamp: new Date().toISOString(),
      labels: ['INBOX', 'UNREAD'],
      rawData: {
        test: true,
        testType: 'shopify_order_context_test',
        email,
      },
    });

    if (!result?.data) {
      return NextResponse.json({
        error: 'Failed to create test message',
        details: result,
      }, { status: 500 });
    }

    const messageId = (result.data as any)?.data?.id || (result.data as any)?.id;

    // Get order context for verification
    let customerHistory = null;
    let formattedContext = '';
    try {
      customerHistory = await getCustomerOrderHistory(
        finalWorkspaceId,
        email,
        { useAdminClient: true }
      );
      formattedContext = formatCustomerHistoryForAI(customerHistory);
    } catch (contextError) {
      console.error('Failed to get customer history:', contextError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test message created successfully',
      testMessage: {
        id: messageId,
        subject,
        senderEmail: email,
        created: true,
      },
      shopifyContext: {
        orderCount: customerHistory?.orderCount || 0,
        totalSpent: customerHistory?.totalSpent || 0,
        formattedContext: formattedContext || '(no orders found)',
        willBeIncluded: (customerHistory?.orderCount || 0) > 0,
      },
      nextSteps: [
        '1. Go to your inbox and find the test message',
        '2. Click "Generate Reply" to see if AI includes order context',
        '3. Check the AI draft - it should reference the customer\'s order history if orders exist',
        '4. If no orders found, ensure Shopify sync is enabled and orders exist in Shopify for this email',
      ],
    });
  } catch (error) {
    console.error('Error creating test message:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

