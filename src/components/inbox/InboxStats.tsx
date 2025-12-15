/**
 * InboxStats Component
 * Shows inbox statistics
 */

'use client';

import { Card } from '@/components/ui/card';
import { Mail, Flame } from 'lucide-react';

interface InboxStatsProps {
  stats: {
    total: number;
    unread: number;
    high: number;
    urgent: number;
  };
}

export function InboxStats({ stats }: InboxStatsProps) {
  return (
    <div className="space-y-2">
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Unread</span>
          </div>
          <span className="text-lg font-bold">{stats.unread}</span>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Urgent</span>
          </div>
          <span className="text-lg font-bold text-red-600">{stats.urgent}</span>
        </div>
      </Card>
    </div>
  );
}

