"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PasswordLoginForm } from "../../(login-pages)/login/PasswordLoginForm";
import { MagicLinkLoginForm } from "../../(login-pages)/login/MagicLinkLoginForm";
import { EmailConfirmationPendingCard } from "@/components/Auth/EmailConfirmationPendingCard";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";

interface ShopifyLinkData {
  shop: string;
  shopName: string;
  email: string;
  ownerName: string;
}

export default function ShopifyLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const host = searchParams.get("host") || "";

  const [shopData, setShopData] = useState<ShopifyLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSentSuccessMessage, setEmailSentSuccessMessage] = useState<
    string | null
  >(null);
  const [redirectInProgress, setRedirectInProgress] = useState(false);

  // Verify token and fetch shop data on mount
  useEffect(() => {
    if (!token) {
      setError("Missing authentication token. Please try again from Shopify.");
      setLoading(false);
      return;
    }

    async function verifyToken() {
      try {
        const response = await fetch(`/api/shopify/verify-token?token=${encodeURIComponent(token!)}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to verify token");
        }
        const data = await response.json();
        setShopData(data);
      } catch (err) {
        console.error("Token verification error:", err);
        setError(err instanceof Error ? err.message : "Token verification failed");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  // Handle "Continue with Shopify" - creates/links account using Shopify email
  async function handleContinueWithShopify() {
    if (!token || !shopData) return;

    setLinking(true);
    try {
      const response = await fetch("/api/shopify/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          linkMethod: "shopify",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to link account");
      }

      toast.success("Account linked successfully!");
      router.push("/dashboard?from=shopify");
    } catch (err) {
      console.error("Shopify link error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to link account");
    } finally {
      setLinking(false);
    }
  }

  // After successful existing account login, link the shop
  async function handleExistingAccountLinked() {
    if (!token) return;

    try {
      const response = await fetch("/api/shopify/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          linkMethod: "existing_account",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to link account");
      }

      toast.success("Shopify store linked to your account!");
      router.push("/dashboard?from=shopify");
    } catch (err) {
      console.error("Link error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to link account");
    }
  }

  // Modified redirect that also links the shop
  function redirectToDashboard() {
    setRedirectInProgress(true);
    handleExistingAccountLinked();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your Shopify connection...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <CardTitle>Connection Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.close()}
            >
              Close and try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailSentSuccessMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <EmailConfirmationPendingCard
          type="login"
          heading="Confirmation Link Sent"
          message={emailSentSuccessMessage}
          resetSuccessMessage={setEmailSentSuccessMessage}
        />
      </div>
    );
  }

  const shopDisplayName = shopData?.shop?.replace(".myshopify.com", "") || "Your store";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg border-2 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logos/aiva-logo-dark.svg"
              width={140}
              height={40}
              alt="Aiva logo"
              className="block dark:hidden"
            />
            <Image
              src="/logos/aiva-logo-light.svg"
              width={140}
              height={40}
              alt="Aiva logo"
              className="hidden dark:block"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">Connect Your Account</CardTitle>
            <CardDescription className="mt-2">
              Link <span className="font-semibold text-primary">{shopDisplayName}</span> to your Aiva account
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Shopify Store Badge */}
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-10 h-10 bg-[#95bf47] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.337 3.415c-.073-.017-.145-.01-.205.022-.06.032-.107.082-.145.147-.55.94-.902 1.83-1.047 2.674-.19-.058-.387-.104-.596-.138a2.54 2.54 0 00-.05-.56c-.15-.574-.46-.935-.868-1.01-.046-.009-.092-.013-.138-.013-.54 0-1.066.46-1.484 1.295-.294.585-.52 1.32-.612 1.887-.638.198-1.08.334-1.093.338-.34.107-.352.117-.396.438-.033.24-.918 7.07-.918 7.07l7.354 1.267.014-12.28c0-.074-.023-.137-.07-.184-.047-.047-.11-.07-.184-.07-.252 0-.444.075-.562.137z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Shopify Store Connected</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {shopData?.email || shopDisplayName}
              </p>
            </div>
          </div>

          {/* Option 1: Continue with Shopify */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-[#008060] hover:bg-[#006e52] text-white h-12"
              onClick={handleContinueWithShopify}
              disabled={linking}
            >
              {linking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.337 3.415c-.073-.017-.145-.01-.205.022-.06.032-.107.082-.145.147-.55.94-.902 1.83-1.047 2.674-.19-.058-.387-.104-.596-.138a2.54 2.54 0 00-.05-.56c-.15-.574-.46-.935-.868-1.01-.046-.009-.092-.013-.138-.013-.54 0-1.066.46-1.484 1.295-.294.585-.52 1.32-.612 1.887-.638.198-1.08.334-1.093.338-.34.107-.352.117-.396.438-.033.24-.918 7.07-.918 7.07l7.354 1.267.014-12.28c0-.074-.023-.137-.07-.184-.047-.047-.11-.07-.184-.07-.252 0-.444.075-.562.137z" />
                  </svg>
                  Continue with Shopify
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {shopData?.email
                ? `Creates or links to an account using ${shopData.email}`
                : "Uses your Shopify store email to create or link an account"}
            </p>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          {/* Option 2: Login with existing Aiva account */}
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Already have an Aiva account? Log in to link it with your Shopify store.
            </p>

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              </TabsList>
              <TabsContent value="password">
                <PasswordLoginForm
                  next={`/api/shopify/link?token=${token}`}
                  redirectToDashboard={redirectToDashboard}
                  setRedirectInProgress={setRedirectInProgress}
                />
              </TabsContent>
              <TabsContent value="magic-link">
                <MagicLinkLoginForm
                  next={`/api/shopify/link?token=${token}`}
                  setEmailSentSuccessMessage={setEmailSentSuccessMessage}
                />
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="text-sm text-center text-muted-foreground">
                Or sign in with your email provider
              </div>
              <div className="flex justify-between gap-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    window.location.href = `/api/auth/google-signin?next=${encodeURIComponent(`/shopify/link?token=${token}`)}`;
                  }}
                  className="flex-1 bg-background text-foreground border h-10 border-input rounded-lg"
                >
                  <Image
                    src={CHANNEL_LOGOS.gmail}
                    width={20}
                    height={20}
                    alt="Google"
                    className="mr-2"
                  />
                  <span>Google</span>
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    window.location.href = `/api/auth/outlook-signin?next=${encodeURIComponent(`/shopify/link?token=${token}`)}`;
                  }}
                  className="flex-1 bg-background text-foreground border h-10 border-input rounded-lg"
                >
                  <Image
                    src={CHANNEL_LOGOS.outlook}
                    width={20}
                    height={20}
                    alt="Outlook"
                    className="mr-2"
                  />
                  <span>Outlook</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

