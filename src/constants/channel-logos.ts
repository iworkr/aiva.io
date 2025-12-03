/**
 * Channel Logos - CDN URLs for all supported communication channels
 * Use these constants throughout the app for consistent branding
 */

export const CHANNEL_LOGOS = {
  // Email Providers
  gmail: 'https://static.cdnlogo.com/logos/o/14/official-gmail-icon-2020.svg',
  outlook: 'https://static.cdnlogo.com/logos/o/82/outlook.svg',
  
  // Messaging Platforms
  slack: 'https://static.cdnlogo.com/logos/s/40/slack-new.svg',
  teams: 'https://static.cdnlogo.com/logos/m/22/microsoft-teams.svg',
  whatsapp: 'https://static.cdnlogo.com/logos/w/29/whatsapp-icon.svg',
  telegram: 'https://static.cdnlogo.com/logos/t/84/telegram.svg',
  messenger: 'https://static.cdnlogo.com/logos/f/52/facebook-messenger.svg',
  
  // Social Platforms
  instagram: 'https://static.cdnlogo.com/logos/i/92/instagram.svg',
  linkedin: 'https://static.cdnlogo.com/logos/l/66/linkedin-icon.svg',
  twitter: 'https://static.cdnlogo.com/logos/x/9/x.svg',
  x: 'https://static.cdnlogo.com/logos/x/9/x.svg',
  
  // Calendar Services
  googleCalendar: 'https://static.cdnlogo.com/logos/g/96/google-calendar.svg',
  appleCalendar: 'https://static.cdnlogo.com/logos/a/12/apple.svg',
  outlookCalendar: 'https://static.cdnlogo.com/logos/o/82/outlook.svg',
  
  // Generic fallbacks
  email: 'https://static.cdnlogo.com/logos/o/14/official-gmail-icon-2020.svg',
  calendar: 'https://static.cdnlogo.com/logos/g/96/google-calendar.svg',
} as const;

export type ChannelType = keyof typeof CHANNEL_LOGOS;

/**
 * Get the logo URL for a channel based on provider name
 * @param provider - The provider/channel name (case-insensitive)
 * @returns The CDN URL for the logo, or null if not found
 */
export function getChannelLogo(provider?: string | null): string | null {
  if (!provider) return null;
  
  const normalizedProvider = provider.toLowerCase().trim();
  
  // Direct matches
  if (normalizedProvider in CHANNEL_LOGOS) {
    return CHANNEL_LOGOS[normalizedProvider as ChannelType];
  }
  
  // Partial matches
  if (normalizedProvider.includes('gmail')) return CHANNEL_LOGOS.gmail;
  if (normalizedProvider.includes('outlook') || normalizedProvider.includes('microsoft')) return CHANNEL_LOGOS.outlook;
  if (normalizedProvider.includes('slack')) return CHANNEL_LOGOS.slack;
  if (normalizedProvider.includes('teams')) return CHANNEL_LOGOS.teams;
  if (normalizedProvider.includes('whatsapp')) return CHANNEL_LOGOS.whatsapp;
  if (normalizedProvider.includes('telegram')) return CHANNEL_LOGOS.telegram;
  if (normalizedProvider.includes('messenger')) return CHANNEL_LOGOS.messenger;
  if (normalizedProvider.includes('instagram')) return CHANNEL_LOGOS.instagram;
  if (normalizedProvider.includes('linkedin')) return CHANNEL_LOGOS.linkedin;
  if (normalizedProvider.includes('twitter') || normalizedProvider === 'x') return CHANNEL_LOGOS.twitter;
  if (normalizedProvider.includes('google') && normalizedProvider.includes('calendar')) return CHANNEL_LOGOS.googleCalendar;
  if (normalizedProvider.includes('apple')) return CHANNEL_LOGOS.appleCalendar;
  if (normalizedProvider.includes('email')) return CHANNEL_LOGOS.email;
  if (normalizedProvider.includes('calendar')) return CHANNEL_LOGOS.calendar;
  
  return null;
}

/**
 * Channel display names for UI
 */
export const CHANNEL_NAMES: Record<string, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  messenger: 'Messenger',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
  googleCalendar: 'Google Calendar',
  appleCalendar: 'Apple Calendar',
  outlookCalendar: 'Outlook Calendar',
  email: 'Email',
  calendar: 'Calendar',
};

/**
 * Get the display name for a channel
 */
export function getChannelName(provider?: string | null): string {
  if (!provider) return 'Unknown';
  
  const normalizedProvider = provider.toLowerCase().trim();
  
  if (normalizedProvider in CHANNEL_NAMES) {
    return CHANNEL_NAMES[normalizedProvider];
  }
  
  // Partial matches
  if (normalizedProvider.includes('gmail')) return CHANNEL_NAMES.gmail;
  if (normalizedProvider.includes('outlook')) return CHANNEL_NAMES.outlook;
  if (normalizedProvider.includes('slack')) return CHANNEL_NAMES.slack;
  if (normalizedProvider.includes('teams')) return CHANNEL_NAMES.teams;
  if (normalizedProvider.includes('whatsapp')) return CHANNEL_NAMES.whatsapp;
  if (normalizedProvider.includes('telegram')) return CHANNEL_NAMES.telegram;
  if (normalizedProvider.includes('messenger')) return CHANNEL_NAMES.messenger;
  if (normalizedProvider.includes('instagram')) return CHANNEL_NAMES.instagram;
  if (normalizedProvider.includes('linkedin')) return CHANNEL_NAMES.linkedin;
  if (normalizedProvider.includes('twitter') || normalizedProvider === 'x') return CHANNEL_NAMES.twitter;
  
  // Capitalize first letter as fallback
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

