/**
 * Message Detail Page
 * Full message view with AI insights and reply composer
 */

import { MessageDetailSkeleton } from '@/components/inbox/MessageDetailSkeleton';
import { MessageDetailView } from '@/components/inbox/MessageDetailView';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { getUser } from '@/utils/server/serverSessionUtils';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; messageId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { messageId } = await params;
  const resolvedSearchParams = await searchParams;
  const draftId = resolvedSearchParams.draft as string | undefined;
  const { data: { user } } = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createSupabaseUserServerComponentClient();
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_member_id', user.id)
    .limit(1)
    .single();

  if (!workspaceMembers) {
    redirect('/onboarding');
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceMembers.workspace_id)
    .single();

  if (!workspace) {
    redirect('/onboarding');
  }

  return (
    <Suspense fallback={<MessageDetailSkeleton />}>
      <MessageDetailView
        messageId={messageId}
        workspaceId={workspace.id}
        userId={user.id}
        draftId={draftId}
      />
    </Suspense>
  );
}

