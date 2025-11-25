/**
 * Channels Management Page
 * Allows users to connect and manage their communication channels
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { ChannelsView } from '@/components/channels/ChannelsView';
import { ChannelsSkeleton } from '@/components/channels/ChannelsSkeleton';

export const metadata = {
  title: 'Channels - Aiva.io',
  description: 'Manage your communication channel connections',
};

export default async function ChannelsPage() {
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
    <div className="flex h-full flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<ChannelsSkeleton />}>
          <ChannelsView workspaceId={workspace.id} userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}

