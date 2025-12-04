/**
 * Message Detail Page
 * Full message view with AI insights and reply composer
 */

import { Suspense } from 'react';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { MessageDetailView } from '@/components/inbox/MessageDetailView';
import { MessageDetailSkeleton } from '@/components/inbox/MessageDetailSkeleton';
import { redirect } from 'next/navigation';

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ locale: string; messageId: string }>;
}) {
  const { messageId } = await params;
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
      />
    </Suspense>
  );
}

