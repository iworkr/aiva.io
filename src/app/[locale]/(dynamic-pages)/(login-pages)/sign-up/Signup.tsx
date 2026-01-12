"use client";

import { EmailConfirmationPendingCard } from "@/components/Auth/EmailConfirmationPendingCard";
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
import { useState } from "react";
import Image from "next/image";
import { MagicLinkSignupForm } from "./MagicLinkSignupForm";
import { PasswordSignupForm } from "./PasswordSignupForm";
import { Shield, Sparkles, Check, ArrowLeft } from "lucide-react";

interface SignUpProps {
  next?: string;
  nextActionType?: string;
}

// Benefits to show
const benefits = [
  "Unified inbox across all channels",
  "AI-powered priority scoring",
  "Smart reply drafts",
  "14-day free trial",
];

export function SignUp({ next, nextActionType }: SignUpProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google-signin";
  };

  const handleOutlookSignIn = () => {
    window.location.href = "/api/auth/outlook-signin";
  };

  if (successMessage) {
    return (
      <EmailConfirmationPendingCard
        type="sign-up"
        heading="Confirmation Link Sent"
        message={successMessage}
        resetSuccessMessage={setSuccessMessage}
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
          <CardTitle className="text-2xl font-bold tracking-tight">Start your free trial</CardTitle>
          <CardDescription className="text-base">
            Create your account in seconds
          </CardDescription>
        </div>
        {/* Benefits */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {benefits.map((benefit, index) => (
            <Badge key={index} variant="secondary" className="gap-1 font-normal text-xs">
              <Check className="w-3 h-3 text-primary" />
              {benefit}
            </Badge>
          ))}
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
            <PasswordSignupForm
              next={next}
              setSuccessMessage={setSuccessMessage}
            />
          </TabsContent>
          <TabsContent value="magic-link" className="mt-0">
            <MagicLinkSignupForm
              next={next}
              setSuccessMessage={setSuccessMessage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 pt-2">
        <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" asChild>
          <Link href="/login">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Already have an account? <span className="ml-1 text-primary font-medium">Log in</span>
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>No credit card required · Cancel anytime</span>
        </div>
      </CardFooter>
    </Card>
  );
}
