/**
 * Settings Page
 * Manage workspace, integrations, and AI preferences
 */

import { Suspense } from 'react';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { SettingsView } from '@/components/settings/SettingsView';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';
import { redirect } from 'next/navigation';

// Note: WorkspaceBilling is disabled until Stripe integration is complete
// import { WorkspaceBilling } from '@/components/workspaces/settings/billing/WorkspaceBilling';

export const metadata = {
  title: 'Settings - Aiva.io',
  description: 'Manage your workspace settings and preferences',
};

export default async function SettingsPage() {
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
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsView 
            workspaceId={workspace.id} 
            userId={user.id} 
            user={user}
            // billingContent is intentionally not passed - shows "Coming Soon" fallback
            // Enable when Stripe integration is complete:
            // billingContent={<WorkspaceBilling workspaceSlug={workspace.slug} />}
          />
        </Suspense>
      </div>
    </div>
  );
}
