import "@/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { Metadata } from "next";
import { getMessages } from "next-intl/server";
import "server-only";
import { cn } from "@/lib/utils";
import { AffonsoWrapper } from "./AffonsoWrapper";
import { AppProviders } from "./AppProviders";

export const metadata: Metadata = {
  icons: {
    icon: "/logos/aiva-mark.svg",
    apple: "/logos/aiva-mark.png",
  },
  title: "Aiva.io",
  description: "Aiva.io – Unified AI communication assistant",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://www.tryaiva.io`,
  ),
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({
    locale: locale,
  });
  return (
    <html
      lang={locale}
      className={cn(GeistSans.className, "h-full")}
      suppressHydrationWarning
    >
      <head>
        {/* Font optimization - preload and font-display */}
        <link
          rel="preload"
          href="/fonts/geist-sans.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: 'Geist Sans';
                font-display: swap;
                src: url('/fonts/geist-sans.woff2') format('woff2');
              }
            `,
          }}
        />
        <AffonsoWrapper />
      </head>
      <body className="flex flex-col h-full overflow-hidden">
        <AppProviders locale={locale} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
