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

  // Valid priority and category values
  const validPriorities = ['high', 'medium', 'low', 'noise'] as const;
  const validCategories = ['sales_lead', 'client_support', 'internal', 'social', 'marketing', 'personal', 'other'] as const;

  // Parse and validate filters from search params
  const priorityParam = resolvedSearchParams.priority as string | undefined;
  const categoryParam = resolvedSearchParams.category as string | undefined;
  const channel = resolvedSearchParams.channel as string | undefined;
  const status = resolvedSearchParams.status === 'unread' ? 'unread' : undefined;

  // Validate priority and category values
  const priority = priorityParam && validPriorities.includes(priorityParam as any) 
    ? priorityParam as typeof validPriorities[number] 
    : undefined;
  const category = categoryParam && validCategories.includes(categoryParam as any) 
    ? categoryParam as typeof validCategories[number] 
    : undefined;

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

