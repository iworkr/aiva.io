/**
 * Debug endpoint to test Shopify order context for a specific email
 * 
 * Simply visit: /api/debug/test-shopify-email-context
 * 
 * This endpoint:
 * 1. Auto-detects your workspace and user
 * 2. Checks if orders exist for Russel.winfield@example.com
 * 3. Shows you the Shopify context that would be included in AI replies
 * 4. Provides a button to create a test message
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

function generateHTML(data: any): string {
  const {
    workspaceId,
    email,
    shopifyStore,
    orders,
    customer,
    aiContext,
    existingMessages,
    recommendations,
    error,
  } = data;

  if (error) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Shopify Email Context Test - Error</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; color: #c33; }
  </style>
</head>
<body>
  <h1>❌ Error</h1>
  <div class="error">${error}</div>
</body>
</html>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Shopify Email Context Test</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1000px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-top: 0; }
    h2 { color: #555; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; }
    .status.success { background: #d4edda; color: #155724; }
    .status.warning { background: #fff3cd; color: #856404; }
    .status.error { background: #f8d7da; color: #721c24; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
    .info-card h3 { margin: 0 0 10px 0; color: #333; }
    .info-card p { margin: 5px 0; color: #666; }
    .order-list { list-style: none; padding: 0; }
    .order-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #28a745; }
    .order-item strong { color: #333; }
    .context-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0; }
    .context-box pre { background: white; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 10px 10px 10px 0; cursor: pointer; border: none; }
    .button:hover { background: #0056b3; }
    .button.success { background: #28a745; }
    .button.success:hover { background: #218838; }
    .recommendation { background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Shopify Email Context Test</h1>
    <p><strong>Email:</strong> <code>${email}</code> | <strong>Workspace:</strong> <code>${workspaceId}</code></p>

    <h2>📦 Shopify Store</h2>
    ${shopifyStore ? `
      <div class="info-grid">
        <div class="info-card">
          <h3>Store Info</h3>
          <p><strong>Domain:</strong> ${shopifyStore.domain}</p>
          <p><strong>Name:</strong> ${shopifyStore.name || 'N/A'}</p>
          <p><strong>Status:</strong> <span class="status ${shopifyStore.isActive ? 'success' : 'error'}">${shopifyStore.isActive ? 'Active' : 'Inactive'}</span></p>
          <p><strong>Sync Enabled:</strong> <span class="status ${shopifyStore.syncEnabled ? 'success' : 'warning'}">${shopifyStore.syncEnabled ? 'Yes' : 'No'}</span></p>
        </div>
      </div>
    ` : '<p class="status error">No Shopify store found</p>'}

    <h2>🛒 Orders Found</h2>
    ${orders.count > 0 ? `
      <p><span class="status success">${orders.count} order(s) found</span></p>
      <ul class="order-list">
        ${orders.orders.map((order: any) => `
          <li class="order-item">
            <strong>Order ${order.orderNumber}</strong> (${order.shopifyOrderId})<br>
            Amount: ${order.currency} ${order.totalPrice}<br>
            Status: ${order.financialStatus || 'N/A'} / ${order.fulfillmentStatus || 'N/A'}<br>
            Date: ${new Date(order.createdAt).toLocaleDateString()}
          </li>
        `).join('')}
      </ul>
    ` : '<p class="status warning">No orders found for this email address</p>'}

    <h2>👤 Customer Record</h2>
    ${customer ? `
      <div class="info-card">
        <p><strong>Name:</strong> ${customer.firstName || ''} ${customer.lastName || ''}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Total Orders:</strong> ${customer.ordersCount}</p>
        <p><strong>Total Spent:</strong> ${customer.totalSpent || 0}</p>
      </div>
    ` : '<p class="status warning">No customer record found</p>'}

    <h2>🤖 AI Context Preview</h2>
    <div class="context-box">
      <p><strong>Order Count:</strong> ${aiContext.orderCount} | <strong>Total Spent:</strong> ${aiContext.totalSpent || 0}</p>
      <p><strong>This is what the AI will see when generating a reply:</strong></p>
      <pre>${aiContext.formattedContext || '(No context - no orders found)'}</pre>
    </div>

    <h2>📧 Existing Messages</h2>
    <p>${existingMessages.count} message(s) from this email address</p>
    ${existingMessages.messages.length > 0 ? `
      <ul>
        ${existingMessages.messages.map((msg: any) => `
          <li>${msg.subject || '(no subject)'} - ${new Date(msg.created_at).toLocaleString()}</li>
        `).join('')}
      </ul>
    ` : ''}

    <h2>✅ Recommendations</h2>
    <div class="recommendation">
      <p><strong>${recommendations.message}</strong></p>
      ${recommendations.canTestAI ? `
        <p>You can now create a test message to verify the AI includes order context in replies.</p>
        <button class="button success" onclick="createTestMessage()">Create Test Message</button>
      ` : recommendations.needsSync ? `
        <p>You may need to sync Shopify orders. Make sure:</p>
        <ul>
          <li>Orders exist in Shopify with email: <code>${email}</code></li>
          <li>Shopify sync is enabled for your store</li>
          <li>Run a manual sync if needed</li>
        </ul>
      ` : ''}
    </div>

    <div id="result" style="margin-top: 20px;"></div>
  </div>

  <script>
    async function createTestMessage() {
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = '<p>Creating test message...</p>';
      
      try {
        const response = await fetch('/api/debug/test-shopify-email-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: '${workspaceId}',
            email: '${email}',
            subject: 'Test: Order Inquiry',
            body: 'Hi, I wanted to check on my recent order. Can you provide an update?',
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          resultDiv.innerHTML = \`
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h3>✅ Test Message Created!</h3>
              <p><strong>Message ID:</strong> <code>\${data.testMessage.id}</code></p>
              <p><strong>Subject:</strong> \${data.testMessage.subject}</p>
              <p><strong>Shopify Context:</strong> \${data.shopifyContext.orderCount} orders found</p>
              <p><a href="/inbox" class="button">Go to Inbox</a></p>
              <p><strong>Next Steps:</strong></p>
              <ol>
                \${data.nextSteps.map(step => '<li>' + step + '</li>').join('')}
              </ol>
            </div>
          \`;
        } else {
          resultDiv.innerHTML = \`
            <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h3>❌ Error</h3>
              <p>\${data.error || 'Failed to create test message'}</p>
            </div>
          \`;
        }
      } catch (error) {
        resultDiv.innerHTML = \`
          <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h3>❌ Error</h3>
            <p>\${error.message}</p>
          </div>
        \`;
      }
    }
  </script>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse(generateHTML({ error: 'Unauthorized. Please log in first.' }), {
        status: 401,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email') || 'Russel.winfield@example.com';

    // Auto-detect workspace
    let workspaceId: string;
    try {
      const soloWorkspace = await getSoloWorkspace();
      workspaceId = soloWorkspace.id;
    } catch (error) {
      return new NextResponse(generateHTML({ error: 'No workspace found. Please create a workspace first.' }), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
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

    // 1. Check if Shopify store is connected
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, is_active, sync_enabled')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .limit(1)
      .single();

    let orders: any[] = [];
    let customer: any = null;
    let customerHistory: any = null;
    let formattedContext = '';
    let existingMessages: any[] = [];

    if (storeError || !store) {
      // No store found - return HTML with error
      return new NextResponse(generateHTML({
        workspaceId,
        email,
        shopifyStore: null,
        orders: { count: 0, orders: [] },
        customer: null,
        aiContext: { orderCount: 0, totalSpent: 0, formattedContext: '(No Shopify store connected)' },
        existingMessages: { count: 0, messages: [] },
        recommendations: {
          hasOrders: false,
          hasCustomer: false,
          canTestAI: false,
          needsSync: false,
          message: 'No active Shopify store found. Please connect a Shopify store first.',
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // 2. Check for orders with this email
    const { data: ordersData, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('shopify_store_id', store.id)
      .eq('email', email.toLowerCase())
      .order('created_at_shopify', { ascending: false })
      .limit(10);

    if (!ordersError && ordersData) {
      orders = ordersData;
    }

    // 3. Check for customer record
    const { data: customerData } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('shopify_store_id', store.id)
      .eq('email', email.toLowerCase())
      .limit(1)
      .single();

    if (customerData) {
      customer = customerData;
    }

    // 4. Test the AI context retrieval function
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
    const { data: messagesData } = await supabase
      .from('messages')
      .select('id, subject, timestamp, created_at')
      .eq('workspace_id', workspaceId)
      .eq('sender_email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesData) {
      existingMessages = messagesData;
    }

    return new NextResponse(generateHTML({
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
        count: orders.length,
        orders: orders.map(order => ({
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
      },
      existingMessages: {
        count: existingMessages.length,
        messages: existingMessages,
      },
      recommendations: {
        hasOrders: orders.length > 0,
        hasCustomer: !!customer,
        canTestAI: orders.length > 0,
        needsSync: orders.length === 0 && store.sync_enabled,
        message: orders.length > 0
          ? '✅ Orders found! You can create a test message to test AI context.'
          : '⚠️ No orders found. You may need to sync Shopify orders or create test orders in Shopify.',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Test Shopify email context error:', error);
    return new NextResponse(generateHTML({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId: providedWorkspaceId,
      email = 'Russel.winfield@example.com',
      subject = 'Test: Order Inquiry',
      body: emailBody = 'Hi, I wanted to check on my recent order. Can you provide an update?',
      triggerSync = false,
    } = body;

    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-detect workspace if not provided
    let finalWorkspaceId: string;
    if (providedWorkspaceId) {
      finalWorkspaceId = providedWorkspaceId;
    } else {
      try {
        const soloWorkspace = await getSoloWorkspace();
        finalWorkspaceId = soloWorkspace.id;
      } catch (error) {
        return NextResponse.json({ error: 'No workspace found. Please create a workspace first.' }, { status: 400 });
      }
    }

    // Get workspace and email connection
    const { workspaceId: workspaceIdFromHelper, connection: emailConnection } = await getWorkspaceAndConnection(
      user.id,
      finalWorkspaceId
    );
    finalWorkspaceId = workspaceIdFromHelper;

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

