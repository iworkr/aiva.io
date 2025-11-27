"use client";
import { PHProvider } from "@/contexts/PostHogProvider";
import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import { RootProvider } from "fumadocs-ui/provider";
import { NextIntlClientProvider } from "next-intl";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import type React from "react";
import { Suspense } from "react";
import { Toaster as SonnerToaster } from "sonner";
import type { AbstractIntlMessages } from "use-intl";
import { useMyReportWebVitals } from "./reportWebVitals";

const PostHogPageView = dynamic(() => import("./PostHogPageView"), {
  ssr: false,
});

function CustomerToaster() {
  const theme = useTheme();
  const currentTheme = theme.theme === "light" ? "light" : "dark";
  return <SonnerToaster richColors theme={currentTheme} />;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Enhanced caching strategy
        staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: false, // Use cache if available
        refetchOnReconnect: true, // Refetch on reconnect (network was down)
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      },
      mutations: {
        retry: 1, // Retry mutations once on failure
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * This is a wrapper for the app that provides the supabase client, the router event wrapper
 * the react-query client, supabase listener, and the navigation progress bar.
 *
 * The listener is used to listen for changes to the user's session and update the UI accordingly.
 */
export function AppProviders({
  locale,
  messages,
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  useMyReportWebVitals();
  return (
    <PHProvider>
      <RootProvider
        theme={{
          enabled: true,
        }}
        search={{
          enabled: true,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className="h-full">{children}</div>
          </NextIntlClientProvider>
          <Suspense>
            <ProgressBar
              height="4px"
              color="#0047ab"
              options={{ showSpinner: false }}
              shallowRouting
            />
            <CustomerToaster />
            {process.env.NEXT_PUBLIC_POSTHOG_API_KEY && <PostHogPageView />}
          </Suspense>
        </QueryClientProvider>
      </RootProvider>
    </PHProvider>
  );
}
