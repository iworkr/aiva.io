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
  
  // Check if this is a Supabase auth verification (token parameter)
  const token = searchParams.token;
  const type = searchParams.type;

  // Handle Supabase auth verification redirects
  if (token && type) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const verifyUrl = new URL('/auth/v1/verify', supabaseUrl);
      verifyUrl.searchParams.set('token', Array.isArray(token) ? token[0] : token);
      verifyUrl.searchParams.set('type', Array.isArray(type) ? type[0] : type);
      
      // Copy redirect_to if present
      const redirectTo = searchParams.redirect_to;
      if (redirectTo) {
        verifyUrl.searchParams.set('redirect_to', Array.isArray(redirectTo) ? redirectTo[0] : redirectTo);
      }
      
      console.log('🔄 Redirecting Supabase auth verification to:', verifyUrl.toString());
      redirect(verifyUrl.toString());
    }
  }

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
