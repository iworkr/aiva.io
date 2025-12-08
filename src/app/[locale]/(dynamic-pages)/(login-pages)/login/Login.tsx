"use client";

import { EmailConfirmationPendingCard } from "@/components/Auth/EmailConfirmationPendingCard";
import { RedirectingPleaseWaitCard } from "@/components/Auth/RedirectingPleaseWaitCard";
import { google, azure } from "@/components/Auth/Icons";
import { Link } from "@/components/intl-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MagicLinkLoginForm } from "./MagicLinkLoginForm";
import { PasswordLoginForm } from "./PasswordLoginForm";

export function Login({
  next,
  nextActionType,
}: {
  next?: string;
  nextActionType?: string;
}) {
  const [emailSentSuccessMessage, setEmailSentSuccessMessage] = useState<
    string | null
  >(null);
  const [redirectInProgress, setRedirectInProgress] = useState(false);
  const router = useRouter();

  function redirectToDashboard() {
    if (next) {
      router.push(`/auth/callback?next=${next}`);
    } else {
      router.push("/dashboard");
    }
  }

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google-signin";
  };

  const handleOutlookSignIn = () => {
    window.location.href = "/api/auth/outlook-signin";
  };

  if (emailSentSuccessMessage) {
    return (
      <EmailConfirmationPendingCard
        type={"login"}
        heading={"Confirmation Link Sent"}
        message={emailSentSuccessMessage}
        resetSuccessMessage={setEmailSentSuccessMessage}
      />
    );
  }

  if (redirectInProgress) {
    return (
      <RedirectingPleaseWaitCard
        message="Please wait while we redirect you to your dashboard."
        heading="Redirecting to Dashboard"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in to Aiva.io</CardTitle>
        <CardDescription>
          Access your unified AI inbox, messages, and calendar in one place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
          </TabsList>
          <TabsContent value="password">
            <PasswordLoginForm
              next={next}
              redirectToDashboard={redirectToDashboard}
              setRedirectInProgress={setRedirectInProgress}
            />
          </TabsContent>

          <TabsContent value="magic-link">
            <MagicLinkLoginForm
              next={next}
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
              onClick={handleGoogleSignIn}
              className="flex-1 bg-background text-foreground border h-10 border-input rounded-lg"
            >
              <div className="mr-2">
                {google()}
              </div>
              <span>Google</span>
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleOutlookSignIn}
              className="flex-1 bg-background text-foreground border h-10 border-input rounded-lg"
            >
              <div className="mr-2">
                {azure()}
              </div>
              <span>Outlook</span>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
          aria-label="Forgot password? Reset your password"
        >
          Forgot password?
        </Link>
        <Link
          href="/sign-up"
          className="text-sm font-medium text-primary hover:underline"
        >
          Don&apos;t have an account? Start free trial
        </Link>
      </CardFooter>
    </Card>
  );
}
