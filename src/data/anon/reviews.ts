type Review = {
  name: string;
  username: string;
  body: string;
  img: string;
};

// Placeholder testimonials - replace with real customer quotes when available
// For now, using a simplified "coming soon" approach per FIX02 guidance
export const reviews: Review[] = [
  {
    name: "Customer Stories",
    username: "Coming Soon",
    body: "We're collecting feedback from early users. Real customer testimonials will be added here soon.",
    img: "/images/quote.png",
  },
];
