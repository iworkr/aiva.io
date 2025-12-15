/**
 * Priority Mapper
 * Automatically assigns message priorities based on category and content
 */

import { MessageCategory, MessagePriority } from '@/utils/zod-schemas/aiva-schemas';

/**
 * Map category to default priority
 * This ensures consistent priority assignment based on message type
 */
export function getPriorityFromCategory(
  category: MessageCategory,
  sentiment?: string,
  actionability?: string
): MessagePriority {
  // High priority categories - urgent customer-facing issues
  if (category === 'customer_inquiry' || category === 'customer_complaint') {
    // If it's urgent sentiment or requires action, make it urgent
    if (sentiment === 'urgent' || actionability === 'request' || actionability === 'question') {
      return 'urgent';
    }
    return 'high';
  }

  // Urgent categories - time-sensitive
  if (category === 'authorization_code' || category === 'sign_in_code') {
    return 'urgent'; // These are time-sensitive
  }

  if (category === 'security_alert') {
    return 'high'; // Security issues are important
  }

  // High priority - business critical
  if (category === 'sales_lead' || category === 'client_support') {
    return 'high';
  }

  // Medium priority - important but not urgent
  if (
    category === 'bill' ||
    category === 'invoice' ||
    category === 'payment_confirmation' ||
    category === 'meeting_request'
  ) {
    return 'medium';
  }

  // Low priority - can wait
  if (category === 'internal' || category === 'notification') {
    return 'low';
  }

  // Very low priority - marketing and junk
  if (
    category === 'marketing' ||
    category === 'junk_email' ||
    category === 'newsletter'
  ) {
    return 'noise';
  }

  // Personal and social - low priority
  if (category === 'personal' || category === 'social') {
    return 'low';
  }

  // Default for 'other'
  return 'medium';
}

/**
 * Get priority display name and color
 */
export function getPriorityDisplay(priority: MessagePriority): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Urgent',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950',
      };
    case 'high':
      return {
        label: 'High',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
      };
    case 'medium':
      return {
        label: 'Medium',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
      };
    case 'low':
      return {
        label: 'Low',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
      };
    case 'noise':
      return {
        label: 'Noise',
        color: 'text-gray-500 dark:text-gray-500',
        bgColor: 'bg-gray-100 dark:bg-gray-900',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
      };
  }
}

/**
 * Get category display name
 */
export function getCategoryDisplay(category: MessageCategory): {
  label: string;
  description: string;
} {
  const categoryMap: Record<MessageCategory, { label: string; description: string }> = {
    customer_inquiry: {
      label: 'Customer Inquiry',
      description: 'Customer questions, order status, support requests',
    },
    customer_complaint: {
      label: 'Customer Complaint',
      description: 'Customer complaints, issues, problems',
    },
    sales_lead: {
      label: 'Sales Lead',
      description: 'New business opportunities, prospects',
    },
    client_support: {
      label: 'Client Support',
      description: 'Technical support, help requests',
    },
    bill: {
      label: 'Bill',
      description: 'Bills, payment requests',
    },
    invoice: {
      label: 'Invoice',
      description: 'Invoices, receipts',
    },
    payment_confirmation: {
      label: 'Payment Confirmation',
      description: 'Payment confirmations, receipts',
    },
    authorization_code: {
      label: 'Authorization Code',
      description: '2FA codes, login codes, verification codes',
    },
    sign_in_code: {
      label: 'Sign In Code',
      description: 'Sign-in codes, authentication codes',
    },
    security_alert: {
      label: 'Security Alert',
      description: 'Security notifications, login alerts',
    },
    marketing: {
      label: 'Marketing',
      description: 'Promotional emails, newsletters',
    },
    junk_email: {
      label: 'Junk Email',
      description: 'Spam, junk mail, unwanted promotional',
    },
    newsletter: {
      label: 'Newsletter',
      description: 'Newsletters, updates from companies',
    },
    internal: {
      label: 'Internal',
      description: 'Team communications, company updates',
    },
    meeting_request: {
      label: 'Meeting Request',
      description: 'Meeting invitations, scheduling',
    },
    personal: {
      label: 'Personal',
      description: 'Personal correspondence',
    },
    social: {
      label: 'Social',
      description: 'Social invites, personal messages',
    },
    notification: {
      label: 'Notification',
      description: 'Automated notifications, system messages',
    },
    other: {
      label: 'Other',
      description: "Doesn't fit above categories",
    },
  };

  return categoryMap[category] || { label: category, description: '' };
}

