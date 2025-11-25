/**
 * Calendar Page
 * View and manage calendar events
 */

import { Suspense } from 'react';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { MotionCalendarView } from '@/components/calendar/MotionCalendarView';
import { CalendarSkeleton } from '@/components/calendar/CalendarSkeleton';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Calendar - Aiva.io',
  description: 'View and manage your calendar events',
};

export default async function CalendarPage() {
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
      <Suspense fallback={<CalendarSkeleton />}>
        <MotionCalendarView workspaceId={workspace.id} userId={user.id} />
      </Suspense>
    </div>
  );
}

