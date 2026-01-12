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
import { Badge } from "@/components/ui/badge";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { MagicLinkLoginForm } from "./MagicLinkLoginForm";
import { PasswordLoginForm } from "./PasswordLoginForm";
import { Shield, Sparkles, ArrowRight } from "lucide-react";

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
    <Card className="w-full border shadow-xl bg-card/95 backdrop-blur-sm">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="flex justify-center">
          <Image
            src="/logos/aiva-logo-dark.svg"
            width={120}
            height={32}
            alt="Aiva logo"
            className="block dark:hidden"
          />
          <Image
            src="/logos/aiva-logo-light.svg"
            width={120}
            height={32}
            alt="Aiva logo"
            className="hidden dark:block"
          />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Log in to your unified AI inbox
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* OAuth buttons first for easier access */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleGoogleSignIn}
              className="h-11 bg-background hover:bg-muted transition-colors"
            >
              <Image
                src={CHANNEL_LOGOS.gmail}
                width={20}
                height={20}
                alt="Google"
                className="mr-2"
              />
              Google
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleOutlookSignIn}
              className="h-11 bg-background hover:bg-muted transition-colors"
            >
              <Image
                src={CHANNEL_LOGOS.outlook}
                width={20}
                height={20}
                alt="Outlook"
                className="mr-2"
              />
              Outlook
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
          </TabsList>
          <TabsContent value="password" className="mt-0">
            <PasswordLoginForm
              next={next}
              redirectToDashboard={redirectToDashboard}
              setRedirectInProgress={setRedirectInProgress}
            />
          </TabsContent>

          <TabsContent value="magic-link" className="mt-0">
            <MagicLinkLoginForm
              next={next}
              setEmailSentSuccessMessage={setEmailSentSuccessMessage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 pt-2">
        <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" asChild>
          <Link href="/sign-up">
            Don&apos;t have an account? <span className="ml-1 text-primary font-medium">Start free</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Secured with 256-bit encryption</span>
        </div>
      </CardFooter>
    </Card>
  );
}
