"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Loader2, Mail, MessageSquare, ShoppingBag, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Shopify "S" bag icon
function ShopifyIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M15.34 3.55c-.06-.34-.32-.53-.54-.57-.21-.04-4.6-.33-4.6-.33s-3.06-3.03-3.4-3.37c-.34-.34-.99-.23-.99-.23L4.2 0s-.5.14-.76.26c-.83.37-1.4 1.06-1.62 2.02L0 15.89s-.04.37.16.57c.2.2.55.21.55.21l4.38 1.1s.25.07.42-.02c.17-.09.28-.32.28-.32l.84-3.36s4.76 1.17 5.59 1.37c.83.2 1.57-.19 1.78-.9.2-.7 2.18-8.89 2.34-9.99z"/>
      <path d="M10.5 7.87l-.83 2.55s-.77-.36-1.7-.3c-1.37.1-1.38.95-1.37 1.17.07 1.23 3.32 1.5 3.5 4.4.14 2.28-1.21 3.85-3.16 3.97-2.34.15-3.63-1.23-3.63-1.23l.5-2.12s1.27.96 2.29.9c.67-.04.91-.59.88-1.01-.1-1.61-2.74-1.51-2.9-4.17-.13-2.24 1.33-4.51 4.58-4.71 1.25-.08 1.84.24 1.84.24z" fill="white"/>
    </svg>
  );
}

interface OnboardingContentProps {
  shopDomain: string | null;
  shopName: string | null | undefined;
  shopEmail: string | null | undefined;
  shopOwner: string | null | undefined;
  isLinked: boolean;
  showSuccess: boolean;
}

export function OnboardingContent({
  shopDomain,
  shopName,
  shopEmail,
  shopOwner,
  isLinked,
  showSuccess,
}: OnboardingContentProps) {
  const router = useRouter();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Handle "Continue with Shopify" - creates account and auto-logs in
  const handleContinueWithShopify = async () => {
    if (!shopDomain || !shopEmail) {
      toast.error('Missing shop information. Please reinstall the app.');
      return;
    }

    setIsCreatingAccount(true);

    try {
      const response = await fetch('/api/shopify/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain,
          email: shopEmail,
          name: shopOwner || shopName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Show success message
      toast.success(data.message || 'Success!');

      // If we got a loginUrl (magic link), redirect to it for instant login!
      if (data.loginUrl) {
        // Small delay to show the toast
        setTimeout(() => {
          window.location.href = data.loginUrl;
        }, 500);
        return;
      }

      // Fallback: redirect to provided URL or login page
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        return;
      }

      // Last resort: show magic link sent message
      setMagicLinkSent(true);
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
      setIsCreatingAccount(false);
    }
  };

  // Handle sign in with existing account
  const handleSignInExisting = () => {
    const loginUrl = new URL('/en/login', window.location.origin);
    loginUrl.searchParams.set('from', 'shopify');
    if (shopDomain) {
      loginUrl.searchParams.set('shop', shopDomain);
    }
    loginUrl.searchParams.set('next', `/en/shopify/link-complete?shop=${shopDomain}`);
    router.push(loginUrl.toString());
  };

  // If magic link was sent, show confirmation
  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <main className="container mx-auto max-w-xl px-4 py-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription className="text-base">
                We sent a login link to <strong>{shopEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Click the link in your email to complete the setup. 
                Your Shopify store <strong>{shopName}</strong> will be automatically connected.
              </p>
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                <strong>What happens next:</strong>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• Your Aiva account will be created/linked</li>
                  <li>• Your Shopify store will be connected</li>
                  <li>• Future logins from Shopify will be automatic</li>
                </ul>
              </div>
              <Button variant="outline" onClick={() => setMagicLinkSent(false)}>
                Use a different email
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // If already linked, show dashboard link
  if (isLinked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <main className="container mx-auto max-w-xl px-4 py-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Already Connected!</CardTitle>
              <CardDescription className="text-base">
                <strong>{shopName}</strong> is already linked to your Aiva account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <a href="/en/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="container mx-auto max-w-4xl px-4 py-12">
        {/* Success Banner */}
        {showSuccess && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900/50 dark:text-green-300 w-fit mx-auto">
            <Check className="h-5 w-5" />
            <span className="font-medium">App Installed Successfully!</span>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Welcome to Aiva for Shopify
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Your AI-powered communication assistant is ready. Connect your Aiva workspace 
            to start managing customer messages with AI.
          </p>
        </div>

        {/* What You Get */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              What Aiva Does for Your Shopify Store
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<Mail className="h-5 w-5 text-blue-600 dark:text-blue-300" />}
                iconBg="bg-blue-100 dark:bg-blue-900"
                title="Unified Inbox"
                description="Customer emails, chat, and Shopify inbox all in one place"
              />
              <FeatureCard
                icon={<MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-300" />}
                iconBg="bg-purple-100 dark:bg-purple-900"
                title="AI Responses"
                description="Generate professional replies to customer inquiries instantly"
              />
              <FeatureCard
                icon={<ShoppingBag className="h-5 w-5 text-green-600 dark:text-green-300" />}
                iconBg="bg-green-100 dark:bg-green-900"
                title="Order Context"
                description="AI knows customer order history for better responses"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Continue with Shopify - Recommended */}
          <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800">
            <div className="absolute right-0 top-0 bg-blue-600 px-3 py-1 text-xs font-medium text-white">
              Recommended
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShopifyIcon className="h-5 w-5 text-[#95BF47]" />
                Continue with Shopify
              </CardTitle>
              <CardDescription>
                {shopEmail ? (
                  <>Use your Shopify email <strong>{shopEmail}</strong> to get started instantly.</>
                ) : (
                  <>Create an account using your Shopify store information.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  No password needed - magic link login
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Free 14-day trial included
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Shopify store automatically connected
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Auto-login from Shopify admin
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleContinueWithShopify}
                disabled={isCreatingAccount || !shopEmail}
              >
                {isCreatingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ShopifyIcon className="mr-2 h-5 w-5" />
                    Continue with Shopify
                  </>
                )}
              </Button>
              {!shopEmail && (
                <p className="mt-2 text-xs text-amber-600">
                  Shop email not found. Please use the option below.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Existing Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Use Existing Aiva Account
              </CardTitle>
              <CardDescription>
                Already have an Aiva account? Sign in to link your Shopify store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Link to existing workspace
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Keep your existing settings
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Add Shopify to your unified inbox
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Team members get access too
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={handleSignInExisting}
              >
                Sign In to Aiva
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Shop Info */}
        {shopDomain && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Connecting: <strong>{shopName || shopDomain}</strong>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Check our{' '}
            <a href="/docs" className="text-blue-600 hover:underline">
              documentation
            </a>{' '}
            or{' '}
            <a href="/en/feedback" className="text-blue-600 hover:underline">
              contact support
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur dark:bg-gray-900/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold">Aiva.io</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            + Shopify
          </span>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({ icon, iconBg, title, description }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className={`rounded-full p-2 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

