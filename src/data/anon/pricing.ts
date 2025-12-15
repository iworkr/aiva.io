type Pricing = {
  title: string;
  price: string;
  annualPrice: string;
  features: string[];
  description: string;
  isHighlighted?: boolean;
};

export const pricing: Pricing[] = [
  {
    title: "Basic",
    price: "29",
    annualPrice: "290",
    description: "Perfect for solo professionals getting started",
    features: [
      "Unified inbox (up to 3 channels)",
      "AI-powered message classification & prioritization",
      "Auto-organize emails by category & sentiment",
      "Deep history search & intelligent linking",
      "Calendar event extraction from messages",
      "Basic AI features (no drafts/auto-responses)",
      "Email & Slack integration",
      "1 workspace",
      "Up to 1,000 messages/month",
      "Email support",
    ],
  },
  {
    title: "Professional",
    price: "79",
    annualPrice: "790",
    description: "Best for growing teams and power users",
    features: [
      "Everything in Basic",
      "✨ AI-powered reply drafts & auto-responses",
      "✨ Multiple tone variations",
      "✨ Auto-send with confidence thresholds",
      "✨ Custom AI prompts",
      "Unlimited channels",
      "Intelligent scheduling assistant",
      "All integrations (Gmail, Outlook, Slack, WhatsApp, Teams)",
      "Team workspace (up to 5 members)",
      "Unlimited messages",
      "Priority support",
      "Advanced search & filters",
    ],
    isHighlighted: true,
  },
  {
    title: "Enterprise",
    price: "199",
    annualPrice: "1990",
    description: "For large organizations with advanced needs",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced security & compliance",
      "SSO & advanced permissions",
      "24/7 priority support",
      "Custom AI training",
      "API access",
      "Advanced analytics & reporting",
      "White-label options",
      "SLA guarantee",
    ],
  },
];
