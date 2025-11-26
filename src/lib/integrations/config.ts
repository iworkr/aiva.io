/**
 * Integrations Configuration
 * Centralized configuration for all social media and calendar integrations
 */

export type IntegrationType = "email" | "messaging" | "social" | "calendar";

export type IntegrationStatus = "available" | "coming_soon" | "beta";

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  description: string;
  color: string; // Hex color
  bgColor: string; // Tailwind class for background
  textColor: string; // Tailwind class for text
  logoUrl: string; // CDN or local path
  icon?: React.ComponentType<{ className?: string }>; // Fallback Lucide icon
  status: IntegrationStatus;
  features: string[];
  oauth?: {
    authUrl: string;
    scopes: string[];
  };
}

// Email Integrations
export const emailIntegrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    type: "email",
    description: "Connect your Gmail account for unified inbox management",
    color: "#EA4335",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    textColor: "text-red-600",
    logoUrl:
      "https://static.cdnlogo.com/logos/o/14/official-gmail-icon-2020.svg",
    status: "available",
    features: [
      "Read emails",
      "Send emails",
      "AI classification",
      "Smart replies",
    ],
    oauth: {
      authUrl: "/api/auth/gmail",
      scopes: ["gmail.readonly", "gmail.send"],
    },
  },
  {
    id: "outlook",
    name: "Outlook",
    type: "email",
    description: "Connect your Outlook/Microsoft 365 account",
    color: "#0078D4",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    textColor: "text-blue-600",
    logoUrl: "https://static.cdnlogo.com/logos/o/82/outlook.svg",
    status: "available",
    features: [
      "Read emails",
      "Send emails",
      "AI classification",
      "Smart replies",
    ],
    oauth: {
      authUrl: "/api/auth/outlook",
      scopes: ["Mail.Read", "Mail.Send"],
    },
  },
];

// Messaging Integrations
export const messagingIntegrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    type: "messaging",
    description: "Connect your Slack workspace for team communications",
    color: "#4A154B",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    textColor: "text-purple-600",
    logoUrl: "https://static.cdnlogo.com/logos/s/40/slack-new.svg",
    status: "available",
    features: [
      "Direct messages",
      "Channel messages",
      "Mentions",
      "AI summaries",
    ],
    oauth: {
      authUrl: "/api/auth/slack",
      scopes: ["channels:read", "chat:write"],
    },
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    type: "messaging",
    description: "Connect Microsoft Teams for workplace collaboration",
    color: "#6264A7",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    textColor: "text-indigo-600",
    logoUrl: "https://static.cdnlogo.com/logos/m/77/microsoft-teams-1.svg",
    status: "available",
    features: [
      "Chat messages",
      "Channel posts",
      "Team notifications",
      "AI insights",
    ],
    oauth: {
      authUrl: "/api/auth/teams",
      scopes: ["Chat.Read", "ChannelMessage.Read.All"],
    },
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    type: "messaging",
    description: "Connect WhatsApp Business for customer communications",
    color: "#25D366",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    textColor: "text-sky-600",
    logoUrl: "https://static.cdnlogo.com/logos/w/29/whatsapp-icon.svg",
    status: "coming_soon",
    features: [
      "Business messages",
      "Customer chats",
      "Quick replies",
      "Media support",
    ],
    oauth: {
      authUrl: "/api/auth/whatsapp",
      scopes: ["messages"],
    },
  },
  {
    id: "telegram",
    name: "Telegram",
    type: "messaging",
    description: "Connect Telegram for instant messaging",
    color: "#0088CC",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    textColor: "text-sky-600",
    logoUrl: "https://cdn.cdnlogo.com/logos/t/39/telegram.svg",
    status: "coming_soon",
    features: [
      "Private messages",
      "Group chats",
      "Channels",
      "Bot integration",
    ],
    oauth: {
      authUrl: "/api/auth/telegram",
      scopes: ["messages"],
    },
  },
];

// Social Media Integrations
export const socialIntegrations: Integration[] = [
  {
    id: "instagram",
    name: "Instagram",
    type: "social",
    description: "Connect Instagram for direct messages and comments",
    color: "#E4405F",
    bgColor: "bg-pink-100 dark:bg-pink-900/20",
    textColor: "text-pink-600",
    logoUrl: "https://static.cdnlogo.com/logos/i/92/instagram.svg",
    status: "coming_soon",
    features: [
      "Direct messages",
      "Comments",
      "Story mentions",
      "Post insights",
    ],
    oauth: {
      authUrl: "/api/auth/instagram",
      scopes: ["instagram_basic", "instagram_manage_messages"],
    },
  },
  {
    id: "facebook_messenger",
    name: "Facebook Messenger",
    type: "social",
    description: "Connect Facebook Messenger for page messages",
    color: "#0084FF",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    textColor: "text-blue-600",
    logoUrl: "https://cdn.cdnlogo.com/logos/f/25/facebook-messenger.svg",
    status: "coming_soon",
    features: [
      "Page messages",
      "Customer inquiries",
      "Auto-responses",
      "Chat analytics",
    ],
    oauth: {
      authUrl: "/api/auth/facebook",
      scopes: ["pages_messaging", "pages_manage_metadata"],
    },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    type: "social",
    description: "Connect LinkedIn for professional messages",
    color: "#0A66C2",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    textColor: "text-blue-700",
    logoUrl: "https://cdn.cdnlogo.com/logos/l/66/linkedin-icon.svg",
    status: "coming_soon",
    features: [
      "InMail messages",
      "Connection requests",
      "Post notifications",
      "Network insights",
    ],
    oauth: {
      authUrl: "/api/auth/linkedin",
      scopes: ["w_member_social", "r_basicprofile"],
    },
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    type: "social",
    description: "Connect X for direct messages and mentions",
    color: "#000000",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-900 dark:text-gray-100",
    logoUrl: "https://static.cdnlogo.com/logos/x/9/x.svg",
    status: "coming_soon",
    features: [
      "Direct messages",
      "Mentions",
      "Tweet notifications",
      "Engagement tracking",
    ],
    oauth: {
      authUrl: "/api/auth/twitter",
      scopes: ["tweet.read", "dm.read"],
    },
  },
];

// Calendar Integrations
export const calendarIntegrations: Integration[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    type: "calendar",
    description: "Sync with Google Calendar for scheduling",
    color: "#4285F4",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    textColor: "text-blue-600",
    logoUrl: "https://cdn.cdnlogo.com/logos/g/23/google-calendar.svg",
    status: "coming_soon",
    features: [
      "Event sync",
      "Smart scheduling",
      "Meeting detection",
      "Availability tracking",
    ],
    oauth: {
      authUrl: "/api/auth/google-calendar",
      scopes: ["calendar.readonly", "calendar.events"],
    },
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    type: "calendar",
    description: "Sync with Outlook/Microsoft Calendar",
    color: "#0078D4",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    textColor: "text-blue-600",
    logoUrl: "https://cdn.cdnlogo.com/logos/m/51/microsoft-outlook.svg",
    status: "coming_soon",
    features: [
      "Event sync",
      "Smart scheduling",
      "Meeting detection",
      "Availability tracking",
    ],
    oauth: {
      authUrl: "/api/auth/outlook-calendar",
      scopes: ["Calendars.Read", "Calendars.ReadWrite"],
    },
  },
  {
    id: "apple_calendar",
    name: "Apple Calendar",
    type: "calendar",
    description: "Sync with Apple iCloud Calendar",
    color: "#000000",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-900",
    logoUrl: "https://static.cdnlogo.com/logos/a/19/apple.svg",
    status: "coming_soon",
    features: [
      "Event sync",
      "iCloud integration",
      "Reminders",
      "Family sharing",
    ],
    oauth: {
      authUrl: "/api/auth/apple-calendar",
      scopes: ["calendar"],
    },
  },
];

// All integrations combined
export const allIntegrations: Integration[] = [
  ...emailIntegrations,
  ...messagingIntegrations,
  ...socialIntegrations,
  ...calendarIntegrations,
];

// Helper functions
export const getIntegrationById = (id: string): Integration | undefined => {
  return allIntegrations.find((integration) => integration.id === id);
};

export const getIntegrationsByType = (type: IntegrationType): Integration[] => {
  return allIntegrations.filter((integration) => integration.type === type);
};

export const getAvailableIntegrations = (): Integration[] => {
  return allIntegrations.filter(
    (integration) => integration.status === "available",
  );
};

export const getComingSoonIntegrations = (): Integration[] => {
  return allIntegrations.filter(
    (integration) => integration.status === "coming_soon",
  );
};

// Integration provider to name mapping (for backwards compatibility)
export const providerNames: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  slack: "Slack",
  teams: "Microsoft Teams",
  whatsapp: "WhatsApp Business",
  telegram: "Telegram",
  instagram: "Instagram",
  facebook_messenger: "Facebook Messenger",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  google_calendar: "Google Calendar",
  outlook_calendar: "Outlook Calendar",
  apple_calendar: "Apple Calendar",
};

// Integration provider to color mapping
export const providerColors: Record<string, string> = Object.fromEntries(
  allIntegrations.map((integration) => [integration.id, integration.bgColor]),
);
