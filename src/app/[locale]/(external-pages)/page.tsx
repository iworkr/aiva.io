import { LandingPage } from "@/components/LandingPage";
import { unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import "server-only";

export default async function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { locale } = params;

  // Check if this is a Gmail OAuth callback (Google sometimes redirects to root with code)
  const code = searchParams.code;
  const state = searchParams.state;
  const error = searchParams.error;

  if (code || state || error) {
    console.log('🟡 OAuth callback detected at root locale page, redirecting to callback route', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
    });

    // Build callback URL with all query parameters
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.tryaiva.io';
    const callbackUrl = new URL('/api/auth/gmail/callback', baseUrl);
    
    // Add all search params to callback URL
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => callbackUrl.searchParams.append(key, v));
        } else {
          callbackUrl.searchParams.append(key, value);
        }
      }
    });

    console.log('🟡 Redirecting to callback URL:', callbackUrl.toString());
    redirect(callbackUrl.toString());
  }

  unstable_setRequestLocale(locale);

  return (
    <div>
      <LandingPage />
    </div>
  );
}
