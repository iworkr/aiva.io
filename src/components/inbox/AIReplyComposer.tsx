/**
 * AIReplyComposer Component
 * AI-powered reply composer with tone selection
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Send, Loader2, Lock } from 'lucide-react';
import { generateReplyDraft } from '@/lib/ai/reply-generator';
import { toast } from 'sonner';
import { useFeatureAccess } from '@/components/ProFeatureGate';
import { Badge } from '@/components/ui/badge';

interface AIReplyComposerProps {
  messageId: string;
  workspaceId: string;
  message: any;
}

export function AIReplyComposer({ messageId, workspaceId, message }: AIReplyComposerProps) {
  const [tone, setTone] = useState<'formal' | 'casual' | 'friendly' | 'professional'>('professional');
  const [replyBody, setReplyBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Check if user has access to AI drafts feature
  const { hasAccess: hasAIDrafts, loading: loadingAccess } = useFeatureAccess(workspaceId, 'aiDrafts');

  // Generate AI reply
  const handleGenerateReply = async () => {
    if (!hasAIDrafts) {
      toast.error('AI reply drafts require a Pro plan. Please upgrade to continue.');
      return;
    }

    setGenerating(true);
    try {
      const draft = await generateReplyDraft(messageId, workspaceId, {
        tone,
        maxLength: 500,
        includeQuote: false,
      });

      if (draft) {
        setReplyBody(draft.body);
        toast.success('Reply generated!');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate reply');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  // Send reply
  const handleSend = async () => {
    if (!replyBody.trim()) {
      toast.error('Please write a reply');
      return;
    }

    setSending(true);
    try {
      // TODO: Implement send via provider
      // For now, just show success
      toast.success('Reply sent!');
      setReplyBody('');
    } catch (error) {
      toast.error('Failed to send reply');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Reply</h3>
            {!hasAIDrafts && !loadingAccess && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                Pro Feature
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={tone} onValueChange={(v) => setTone(v as any)}>
              <TabsList>
                <TabsTrigger value="formal" className="text-xs" disabled={!hasAIDrafts}>
                  Formal
                </TabsTrigger>
                <TabsTrigger value="professional" className="text-xs" disabled={!hasAIDrafts}>
                  Professional
                </TabsTrigger>
                <TabsTrigger value="friendly" className="text-xs" disabled={!hasAIDrafts}>
                  Friendly
                </TabsTrigger>
                <TabsTrigger value="casual" className="text-xs" disabled={!hasAIDrafts}>
                  Casual
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateReply}
              disabled={generating || loadingAccess || !hasAIDrafts}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {!hasAIDrafts && <Lock className="mr-2 h-4 w-4" />}
                  {hasAIDrafts && <Sparkles className="mr-2 h-4 w-4" />}
                  Generate AI Reply
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Reply to info */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <span className="font-medium">To:</span> {message.sender_email}
          </div>

          {/* Reply editor */}
          <Textarea
            placeholder="Write your reply..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={12}
            className="resize-none"
          />

          {/* Actions */}
          <div className="flex justify-between">
            <div className="text-xs text-muted-foreground">
              {replyBody.length} characters
            </div>
            <Button onClick={handleSend} disabled={sending || !replyBody.trim()}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

