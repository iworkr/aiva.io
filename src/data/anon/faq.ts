type FAQ = {
  question: string;
  answer: string;
};

export const faq: FAQ[] = [
  {
    question: "How secure is my data with Aiva?",
    answer:
      "Security is our top priority. All data is encrypted at rest and in transit. We use workspace isolation with Row Level Security (RLS) policies, ensuring complete data separation. OAuth tokens are encrypted, and we maintain complete audit trails. Aiva is GDPR compliant and follows enterprise security best practices.",
  },
  {
    question: "Which communication channels does Aiva support?",
    answer:
      "Aiva integrates with Gmail, Outlook/Office 365, Slack, Microsoft Teams, WhatsApp Business, Instagram DMs, Facebook Messenger, and LinkedIn. We're constantly adding new integrations based on user feedback. All integrations use secure OAuth authentication.",
  },
  {
    question: "Can I try Aiva before committing?",
    answer:
      "Absolutely! We offer a 14-day free trial with full access to all features. No credit card required. You can cancel anytime during the trial or after. We want you to be completely satisfied before making any commitment.",
  },
  {
    question: "How does the AI auto-reply feature work?",
    answer:
      "Aiva learns your communication style and drafts replies that match your tone. You can review and edit drafts before sending, or enable auto-send with configurable confidence thresholds. You can set rules for which message types or senders can be auto-replied to, ensuring complete control and safety.",
  },
  {
    question: "What happens if I exceed my message limit?",
    answer:
      "If you're on a plan with message limits, we'll notify you when you're approaching your limit. You can upgrade your plan at any time, or messages will be queued until your next billing cycle. We never delete your data or cut off access without warning.",
  },
  {
    question: "Can I use Aiva with my team?",
    answer:
      "Yes! Professional and Enterprise plans include team workspaces. You can collaborate on messages, share AI prompts, and manage team communication together. Each workspace is completely isolated with its own data and settings.",
  },
];
