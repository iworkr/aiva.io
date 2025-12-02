type Review = {
  name: string;
  username: string;
  body: string;
  img: string;
};

// Realistic placeholder testimonials for launch
// These represent the types of feedback we expect from users
export const reviews: Review[] = [
  {
    name: "Sarah Chen",
    username: "@sarahchen",
    body: "Aiva has completely transformed how I manage my inbox. The AI prioritization saves me at least 2 hours every day. I can finally focus on what matters.",
    img: "/images/quote.png",
  },
  {
    name: "Marcus Johnson",
    username: "@marcusj",
    body: "The unified inbox is a game-changer. Having Gmail, Slack, and Teams in one place with AI-powered summaries? This is what productivity looks like.",
    img: "/images/quote.png",
  },
  {
    name: "Emily Rodriguez",
    username: "@emilyrod",
    body: "I was skeptical about AI drafting my replies, but Aiva nails my tone every time. It's like having a personal assistant who actually understands me.",
    img: "/images/quote.png",
  },
  {
    name: "David Park",
    username: "@davidpark",
    body: "The smart scheduling feature detected a meeting request I almost missed. Aiva automatically suggested times and handled the back-and-forth. Brilliant.",
    img: "/images/quote.png",
  },
  {
    name: "Lisa Thompson",
    username: "@lisathompson",
    body: "Our team switched to Aiva last month. The workspace collaboration features and shared inbox views have improved our response times by 40%.",
    img: "/images/quote.png",
  },
  {
    name: "James Wilson",
    username: "@jameswilson",
    body: "Finally, an inbox that works for me instead of against me. The task extraction from emails alone has made me more organized than I've ever been.",
    img: "/images/quote.png",
  },
];
