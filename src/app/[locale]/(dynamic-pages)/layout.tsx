// do not cache this layout
export const dynamic = "force-dynamic";

export const metadata = {
  icons: {
    icon: "/images/logo-black-main.ico",
  },
  title: "Aiva.io – Unified AI Inbox & Communication Hub",
  description: "Aiva.io unifies Gmail, Outlook, Slack and more into a single AI-powered inbox.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
