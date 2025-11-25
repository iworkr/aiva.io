// app/providers.tsx
"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

/**
 * @description A React component that provides the PostHog context to its children.
 * It initializes the PostHog analytics with the provided API key and host.
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 */
export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize PostHog if API key is provided
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
    if (apiKey) {
      posthog.init(apiKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      });
    }
  }, []);

  // Only wrap with PostHogProvider if API key is configured
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
  if (!apiKey) {
    return <>{children}</>;
  }

  // Return the PostHogProvider wrapping the children components.
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
