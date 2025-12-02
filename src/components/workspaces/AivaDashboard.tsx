/**
 * Aiva Dashboard
 * Main dashboard showing Aiva.io stats and quick actions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  Calendar,
  Zap,
  Mail,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';

export async function AivaDashboard() {
  const { data: { user } } = await getUser();
  
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseUserServerComponentClient();
  
  // Get user's workspaces via workspace_members junction table
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_member_id', user.id)
    .limit(1)
    .single();
  
  if (!workspaceMembers) {
    return null;
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceMembers.workspace_id)
    .single();

  if (!workspace) {
    return null;
  }

  // Fetch stats using the same supabase client

  const [
    { count: totalMessages },
    { count: unreadMessages },
    { count: upcomingEvents },
    { count: todayEvents },
    { count: connectedChannels },
  ] = await Promise.all([
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('is_read', false),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .gte('start_time', new Date().toISOString()),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
    supabase
      .from('channel_connections')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('status', 'active'),
  ]);

  const stats = [
    {
      title: 'Unread Messages',
      value: unreadMessages || 0,
      total: totalMessages || 0,
      icon: Inbox,
      href: '/inbox',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: "Today's Events",
      value: todayEvents || 0,
      icon: Calendar,
      href: '/calendar',
      color: 'text-sky-600',
      bgColor: 'bg-sky-100 dark:bg-sky-900/20',
    },
    {
      title: 'Upcoming Events',
      value: upcomingEvents || 0,
      icon: Calendar,
      href: '/calendar',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Connected Channels',
      value: connectedChannels || 0,
      icon: Zap,
      href: '/channels',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
  ];

  const quickActions = [
    {
      title: 'Check Inbox',
      description: 'View your unified inbox with AI insights',
      icon: Inbox,
      href: '/inbox',
      badge: unreadMessages ? `${unreadMessages} unread` : null,
    },
    {
      title: 'View Calendar',
      description: 'See your upcoming events',
      icon: Calendar,
      href: '/calendar',
      badge: upcomingEvents ? `${upcomingEvents} upcoming` : null,
    },
    {
      title: 'Connect Channels',
      description: 'Add more communication channels',
      icon: Zap,
      href: '/channels',
      badge: connectedChannels ? `${connectedChannels} connected` : 'Get started',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isEmpty = stat.value === 0;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className={`transition-all hover:shadow-md cursor-pointer ${isEmpty ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <div className="flex items-baseline gap-2">
                        {isEmpty ? (
                          <p className="text-2xl font-semibold text-muted-foreground">
                            No {stat.title.toLowerCase()} yet
                          </p>
                        ) : (
                          <>
                            <p className="text-3xl font-bold">{stat.value}</p>
                            {stat.total !== undefined && (
                              <p className="text-sm text-muted-foreground">
                                of {stat.total}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${isEmpty ? 'bg-muted' : stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${isEmpty ? 'text-muted-foreground' : stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="transition-all hover:shadow-md cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{action.title}</h3>
                            {action.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Features Highlight */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Features</CardTitle>
          </div>
          <CardDescription>
            Aiva.io uses advanced AI to make your communication smarter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Smart Classification</h4>
                <p className="text-xs text-muted-foreground">
                  Auto-categorize messages by priority and type
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Reply Suggestions</h4>
                <p className="text-xs text-muted-foreground">
                  Generate context-aware replies in multiple tones
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Auto-Tasks & Events</h4>
                <p className="text-xs text-muted-foreground">
                  Extract tasks and create events automatically
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      {connectedChannels === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Get Started with Aiva.io</CardTitle>
            <CardDescription>
              Connect your first communication channel to start using AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/channels">
              <Button size="lg">
                <Zap className="mr-2 h-4 w-4" />
                Connect Your First Channel
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

