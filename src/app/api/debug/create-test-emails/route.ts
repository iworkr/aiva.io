/**
 * Debug endpoint to create test emails for testing Aiva's auto-reply and manual review features
 * 
 * GET /api/debug/create-test-emails?workspaceId=<optional>
 *   Creates 2 default test emails (one requiring manual review, one auto-reply candidate)
 * 
 * POST /api/debug/create-test-emails
 *   Creates a custom test email with provided subject and body
 *   Body: { subject: string, body: string, workspaceId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createMessageAction } from '@/data/user/messages';
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

async function createTestEmail(
  workspaceId: string,
  connection: any,
  user: any,
  subject: string,
  body: string,
  uniqueId: number
) {
  const senderEmail = 'joseph.evan.lewis@gmail.com';
  const senderName = 'Joseph Evan Lewis';
  const recipientEmail = connection.provider_account_id || connection.provider_account_name || user.email || 'recipient@example.com';
  const timestamp = new Date().toISOString();

  // Convert plain text to simple HTML
  const bodyHtml = body
    .split('\n')
    .map((line) => {
      if (line.trim() === '') return '<p></p>';
      // Simple bullet point detection
      if (line.trim().startsWith('- ')) {
        return `<li>${line.trim().substring(2)}</li>`;
      }
      return `<p>${line}</p>`;
    })
    .join('')
    .replace(/<li>/g, '<ul><li>')
    .replace(/<\/li>/g, '</li></ul>')
    .replace(/<\/ul><ul>/g, '');

  const emailData = {
    workspaceId,
    channelConnectionId: connection.id,
    providerMessageId: `test_custom_${uniqueId}`,
    providerThreadId: `thread_custom_${uniqueId}`,
    subject: subject.trim(),
    body: body.trim(),
    bodyHtml: `<div>${bodyHtml}</div>`,
    snippet: subject.trim().substring(0, 100),
    senderEmail,
    senderName,
    recipients: [
      {
        email: recipientEmail,
        name: connection.provider_account_name || 'You',
        type: 'to' as const,
      },
    ],
    timestamp,
    labels: ['INBOX', 'UNREAD'],
    rawData: {
      test: true,
      testType: 'custom',
    },
  };

  const result = await createMessageAction(emailData);
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspaceId from query params or auto-detect
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    const { workspaceId: finalWorkspaceId, connection: emailConnection } = await getWorkspaceAndConnection(user.id, workspaceId);

    const now = new Date();
    const timestamp = now.toISOString();
    const uniqueId = Date.now();
    const senderEmail = 'joseph.evan.lewis@gmail.com';
    const senderName = 'Joseph Evan Lewis';
    const recipientEmail = emailConnection.provider_account_id || emailConnection.provider_account_name || user.email || 'recipient@example.com';

    // Test Email 1: Requires Manual Review
    // This is a complex Shopify store question that requires human judgment
    const manualReviewEmail = {
      workspaceId: finalWorkspaceId,
      channelConnectionId: emailConnection.id,
      providerMessageId: `test_manual_review_${uniqueId}`,
      providerThreadId: `thread_manual_${uniqueId}`,
      subject: 'Urgent: Need to discuss custom product pricing for bulk order',
      body: `Dear Aiva Team,

I hope this email finds you well.

I'm writing to follow up on our previous discussions regarding a potential bulk order for custom products. We are very interested in placing a significant order, but we need to finalize the pricing structure and custom specifications.

Specifically, we are looking for:
- Product A: 500 units, custom color #R2D2, with our logo embossed.
- Product B: 200 units, custom material (eco-friendly recycled plastic), with a unique packaging design.

Could you please provide an updated quote that reflects a bulk discount for these quantities? We are also open to discussing a long-term partnership if the pricing is competitive.

Please let me know your availability for a quick call early next week to go over these details.

Best regards,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
      bodyHtml: `<p>Dear Aiva Team,</p>
<p>I hope this email finds you well.</p>
<p>I'm writing to follow up on our previous discussions regarding a potential bulk order for custom products. We are very interested in placing a significant order, but we need to finalize the pricing structure and custom specifications.</p>
<p>Specifically, we are looking for:</p>
<ul>
<li>Product A: 500 units, custom color #R2D2, with our logo embossed.</li>
<li>Product B: 200 units, custom material (eco-friendly recycled plastic), with a unique packaging design.</li>
</ul>
<p>Could you please provide an updated quote that reflects a bulk discount for these quantities? We are also open to discussing a long-term partnership if the pricing is competitive.</p>
<p>Please let me know your availability for a quick call early next week to go over these details.</p>
<p>Best regards,<br>
Joseph Evan Lewis<br>
joseph.evan.lewis@gmail.com</p>`,
      snippet: 'Urgent: Need to discuss custom product pricing for bulk order - 500 units, custom requirements, time-sensitive',
      senderEmail: senderEmail,
      senderName: senderName,
      recipients: [
        {
          email: recipientEmail,
          name: emailConnection.provider_account_name || 'You',
          type: 'to' as const,
        },
      ],
      timestamp,
      labels: ['INBOX', 'UNREAD'],
      rawData: {
        test: true,
        testType: 'manual_review',
      },
    };

    // Test Email 2: Auto-Reply Candidate
    // This is a simple Shopify store question that Aiva can answer automatically
    const autoReplyEmail = {
      workspaceId: finalWorkspaceId,
      channelConnectionId: emailConnection.id,
      providerMessageId: `test_auto_reply_${uniqueId + 1}`,
      providerThreadId: `thread_auto_${uniqueId + 1}`,
      subject: 'Question about shipping times',
      body: `Hi Aiva Support,

I recently placed an order (#ABC12345) and was wondering what the estimated shipping time is for international orders. Also, what is your return policy for items purchased online?

Thanks,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
      bodyHtml: `<p>Hi Aiva Support,</p>
<p>I recently placed an order (#ABC12345) and was wondering what the estimated shipping time is for international orders. Also, what is your return policy for items purchased online?</p>
<p>Thanks,<br>
Joseph Evan Lewis<br>
joseph.evan.lewis@gmail.com</p>`,
      snippet: 'Question about shipping times for Order #ABC12345 and return policy',
      senderEmail: senderEmail,
      senderName: senderName,
      recipients: [
        {
          email: recipientEmail,
          name: emailConnection.provider_account_name || 'You',
          type: 'to' as const,
        },
      ],
      timestamp: new Date(now.getTime() + 1000).toISOString(), // 1 second later
      labels: ['INBOX', 'UNREAD'],
      rawData: {
        test: true,
        testType: 'auto_reply',
      },
    };

    // Create both messages
    const [manualResult, autoResult] = await Promise.all([
      createMessageAction(manualReviewEmail),
      createMessageAction(autoReplyEmail),
    ]);

    // Update the manual review email to require human review
    if (manualResult?.data && !(manualResult.data as any).isDuplicate) {
      const messageId = (manualResult.data as any).data?.id || (manualResult.data as any).id;
      if (messageId) {
        await supabase
          .from('messages')
          .update({
            requires_human_review: true,
            review_reason: 'Complex pricing negotiation requiring human judgment',
            actionability: 'request',
            priority: 'high',
            category: 'customer_inquiry',
            handled_by_aiva: false, // Ensure it appears in requires attention
            reviewed_at: null, // Ensure it's not marked as reviewed
          })
          .eq('id', messageId);
      }
    }

    // Update the auto-reply email to be ready for auto-reply
    if (autoResult?.data && !(autoResult.data as any).isDuplicate) {
      const messageId = (autoResult.data as any).data?.id || (autoResult.data as any).id;
      if (messageId) {
        await supabase
          .from('messages')
          .update({
            requires_human_review: false,
            actionability: 'question',
            priority: 'medium',
            category: 'customer_inquiry',
            handled_by_aiva: false, // Ensure it appears in requires attention if auto-replied
            reviewed_at: null, // Ensure it's not marked as reviewed
          })
          .eq('id', messageId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test emails created successfully',
      emails: {
        manualReview: {
          created: !!manualResult?.data && !(manualResult.data as any).isDuplicate,
          messageId: manualResult?.data && !(manualResult.data as any).isDuplicate
            ? ((manualResult.data as any).data?.id || (manualResult.data as any).id)
            : null,
          subject: manualReviewEmail.subject,
          requiresHumanReview: true,
        },
        autoReply: {
          created: !!autoResult?.data && !(autoResult.data as any).isDuplicate,
          messageId: autoResult?.data && !(autoResult.data as any).isDuplicate
            ? ((autoResult.data as any).data?.id || (autoResult.data as any).id)
            : null,
          subject: autoReplyEmail.subject,
          requiresHumanReview: false,
        },
      },
    });
  } catch (error) {
    console.error('Error creating test emails:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test emails',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, body: emailBody, workspaceId } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    const { workspaceId: finalWorkspaceId, connection: emailConnection } = await getWorkspaceAndConnection(user.id, workspaceId);

    const uniqueId = Date.now();
    const result = await createTestEmail(
      finalWorkspaceId,
      emailConnection,
      user,
      subject,
      emailBody,
      uniqueId
    );

    if (result?.data && !(result.data as any).isDuplicate) {
      const messageId = (result.data as any).data?.id || (result.data as any).id;
      
      // Ensure the message is set up for processing
      if (messageId) {
        await supabase
          .from('messages')
          .update({
            handled_by_aiva: false,
            reviewed_at: null,
            // Don't set requires_human_review - let classification determine this
          })
          .eq('id', messageId);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Test email created successfully',
        email: {
          created: true,
          messageId,
          subject: subject.trim(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Test email created (may be duplicate)',
      email: {
        created: false,
        isDuplicate: true,
      },
    });
  } catch (error) {
    console.error('Error creating test email:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

