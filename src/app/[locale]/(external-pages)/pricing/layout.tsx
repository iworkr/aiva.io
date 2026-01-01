import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Aiva",
  description: "Simple, transparent pricing for AI-powered inbox management. Choose from Basic, Professional, or Enterprise plans.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
