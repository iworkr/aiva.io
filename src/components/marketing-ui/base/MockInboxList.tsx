/**
 * MockInboxList - Marketing UI Component
 * Stacked email cards showing inbox state
 */

'use client';

import { cn } from '@/lib/utils';
import { MockEmailCard } from './MockEmailCard';

interface Email {
  id: string;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  snippet: string;
  timestamp?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  category?: string;
  hasAttachment?: boolean;
  isStarred?: boolean;
  isUnread?: boolean;
  labels?: string[];
}

interface MockInboxListProps {
  emails: Email[];
  className?: string;
  stacked?: boolean;
  animate?: boolean;
  staggerDelay?: number;
}

// Default sample emails for demo
export const sampleEmails: Email[] = [
  {
    id: '1',
    sender: { name: 'Sarah Johnson', email: 'sarah@acme.com' },
    subject: 'Q4 Budget Review - Action Required',
    snippet: 'Hi team, please review the attached Q4 budget proposal and provide your feedback by EOD Friday...',
    timestamp: '2m ago',
    priority: 'urgent',
    category: 'Work',
    isUnread: true,
  },
  {
    id: '2',
    sender: { name: 'Mike Chen', email: 'mike@startup.io' },
    subject: 'Re: Partnership Opportunity',
    snippet: 'Thanks for getting back to me! I think there could be some great synergies between our companies...',
    timestamp: '15m ago',
    priority: 'high',
    isUnread: true,
    isStarred: true,
  },
  {
    id: '3',
    sender: { name: 'LinkedIn', email: 'notifications@linkedin.com' },
    subject: 'You have 5 new connection requests',
    snippet: 'Sarah Johnson and 4 others want to connect with you on LinkedIn...',
    timestamp: '1h ago',
    category: 'Social',
    isUnread: false,
  },
  {
    id: '4',
    sender: { name: 'Alex Rivera', email: 'alex@design.co' },
    subject: 'Design Review - Homepage Mockups',
    snippet: 'Hey! Attached are the latest homepage mockups. Let me know your thoughts on the hero section...',
    timestamp: '2h ago',
    priority: 'normal',
    hasAttachment: true,
    isUnread: true,
  },
  {
    id: '5',
    sender: { name: 'Newsletter', email: 'digest@techcrunch.com' },
    subject: 'Your Daily Tech Digest',
    snippet: 'Top stories: AI startup raises $50M, Apple announces new product line, Tesla earnings report...',
    timestamp: '3h ago',
    category: 'Newsletter',
    isUnread: false,
  },
];

export function MockInboxList({
  emails = sampleEmails,
  className,
  stacked = false,
  animate = false,
  staggerDelay = 100,
}: MockInboxListProps) {
  if (stacked) {
    return (
      <div className={cn('relative', className)}>
        {emails.slice(0, 4).map((email, index) => (
          <div
            key={email.id}
            className="absolute w-full transition-all duration-300"
            style={{
              top: `${index * 12}px`,
              left: `${index * 4}px`,
              zIndex: emails.length - index,
              transform: `rotate(${(index - 1.5) * 1.5}deg)`,
              opacity: 1 - index * 0.15,
            }}
          >
            <MockEmailCard
              {...email}
              animate={animate}
              animationDelay={index * staggerDelay}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {emails.map((email, index) => (
        <MockEmailCard
          key={email.id}
          {...email}
          animate={animate}
          animationDelay={index * staggerDelay}
        />
      ))}
    </div>
  );
}

export default MockInboxList;

