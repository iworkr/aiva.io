/**
 * Contacts Page
 * Unified contact management with channel linking
 */

import { Suspense } from 'react';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { ContactsView } from '@/components/contacts/ContactsView';
import { ContactsSkeleton } from '@/components/contacts/ContactsSkeleton';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Contacts - Aiva.io',
  description: 'Manage your unified contacts and communication channels',
};

export default async function ContactsPage() {
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
      <Suspense fallback={<ContactsSkeleton />}>
        <ContactsView workspaceId={workspace.id} userId={user.id} />
      </Suspense>
    </div>
  );
}

