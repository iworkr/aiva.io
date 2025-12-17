/**
 * Shopify Onboarding Page
 * 
 * Shown to merchants after they install the Aiva app from Shopify App Store.
 * Allows them to:
 * 1. Create a new Aiva account
 * 2. Link to an existing Aiva account
 * 3. Configure which Shopify channels to sync
 */

import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Check, Mail, MessageSquare, ShoppingBag, Sparkles } from 'lucide-react';

export default function ShopifyOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur dark:bg-gray-900/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Aiva.io</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              + Shopify
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        {/* Success Banner */}
        <Suspense fallback={null}>
          <SuccessBanner />
        </Suspense>

        {/* Welcome Section */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900/50 dark:text-green-300">
            <Check className="h-5 w-5" />
            <span className="font-medium">App Installed Successfully!</span>
          </div>
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
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="font-medium">Unified Inbox</h3>
                  <p className="text-sm text-muted-foreground">
                    Customer emails, chat, and Shopify inbox all in one place
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                  <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="font-medium">AI Responses</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate professional replies to customer inquiries instantly
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                  <ShoppingBag className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <h3 className="font-medium">Order Context</h3>
                  <p className="text-sm text-muted-foreground">
                    AI knows customer order history for better responses
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* New to Aiva */}
          <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800">
            <div className="absolute right-0 top-0 bg-blue-600 px-3 py-1 text-xs font-medium text-white">
              Recommended
            </div>
            <CardHeader>
              <CardTitle>New to Aiva?</CardTitle>
              <CardDescription>
                Create a free account to get started with AI-powered customer communication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Free 14-day trial
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Connect all your communication channels
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  AI-powered message drafting
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Shopify store automatically connected
                </li>
              </ul>
              <Button asChild className="w-full" size="lg">
                <Link href="/en/sign-up?from=shopify">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Existing Account */}
          <Card>
            <CardHeader>
              <CardTitle>Already have an account?</CardTitle>
              <CardDescription>
                Sign in to link your Shopify store to your existing Aiva workspace.
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
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/en/login?from=shopify">
                  Sign In to Aiva
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Check our{' '}
            <Link href="/docs" className="text-blue-600 hover:underline">
              documentation
            </Link>{' '}
            or{' '}
            <Link href="/en/feedback" className="text-blue-600 hover:underline">
              contact support
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

function SuccessBanner() {
  // This could read from searchParams to show success/error messages
  return null;
}


