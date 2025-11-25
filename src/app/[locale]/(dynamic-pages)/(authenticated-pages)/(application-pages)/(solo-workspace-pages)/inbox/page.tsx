/**
 * Unified Inbox Page
 * Main view for all messages across channels with AI classification
 */

import { Suspense } from 'react';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { InboxView } from '@/components/inbox/InboxView';
import { InboxSkeleton } from '@/components/inbox/InboxSkeleton';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Inbox - Aiva.io',
  description: 'Unified inbox across all your communication channels',
};

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { data: { user } } = await getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user's workspace via workspace_members
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

  // Await searchParams before using (Next.js 15 requirement)
  const resolvedSearchParams = await searchParams;

  // Parse filters from search params
  const priority = resolvedSearchParams.priority as string | undefined;
  const category = resolvedSearchParams.category as string | undefined;
  const channel = resolvedSearchParams.channel as string | undefined;
  const status = resolvedSearchParams.status === 'unread' ? 'unread' : undefined;

  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxView
        workspaceId={workspace.id}
        userId={user.id}
        filters={{
          priority,
          category,
          channel,
          status,
        }}
      />
    </Suspense>
  );
}

