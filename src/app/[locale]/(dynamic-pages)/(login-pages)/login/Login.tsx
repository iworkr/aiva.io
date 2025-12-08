"use client";

import { EmailConfirmationPendingCard } from "@/components/Auth/EmailConfirmationPendingCard";
import { RedirectingPleaseWaitCard } from "@/components/Auth/RedirectingPleaseWaitCard";
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
import { CHANNEL_LOGOS } from "@/constants/channel-logos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
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
    <Card className="w-full max-w-md">
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
          <CardTitle className="text-2xl">Log in to Aiva.io</CardTitle>
          <CardDescription className="mt-1">
            Access your unified AI inbox, messages, and calendar in one place.
          </CardDescription>
        </div>
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
              onClick={handleOutlookSignIn}
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
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Link href="/sign-up" className="w-full">
          <Button variant="outline" className="w-full">
            Don&apos;t have an account? Start free trial
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
