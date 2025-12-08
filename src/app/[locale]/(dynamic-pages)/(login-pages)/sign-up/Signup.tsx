"use client";

import { EmailConfirmationPendingCard } from "@/components/Auth/EmailConfirmationPendingCard";
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
import { useState } from "react";
import { MagicLinkSignupForm } from "./MagicLinkSignupForm";
import { PasswordSignupForm } from "./PasswordSignupForm";
import { Mail, Calendar, Sparkles, Shield, CheckCircle2 } from "lucide-react";

interface SignUpProps {
  next?: string;
  nextActionType?: string;
}

const features = [
  {
    icon: Mail,
    title: "Unified Inbox",
    description: "All your emails, DMs, and messages in one place",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Smart prioritization and auto-generated replies",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Automatic meeting detection and calendar sync",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and privacy controls",
  },
];

export function SignUp({ next, nextActionType }: SignUpProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google-signin";
  };

  const handleOutlookSignIn = () => {
    window.location.href = "/api/auth/outlook-signin";
  };

  return (
    <div
      data-success={successMessage}
      className="container data-success:flex items-center data-success:justify-center text-left max-w-6xl mx-auto overflow-auto data-success:h-full min-h-[470px] px-4"
    >
      {successMessage ? (
        <EmailConfirmationPendingCard
          type="sign-up"
          heading="Confirmation Link Sent"
          message={successMessage}
          resetSuccessMessage={setSuccessMessage}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full py-8">
          {/* Left side - Feature highlights */}
          <div className="hidden lg:flex flex-col space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">
                Transform how you communicate
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of professionals saving 10+ hours per week with AI-powered inbox management.
              </p>
            </div>
            
            <div className="grid gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>

          {/* Right side - Sign up form */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Create your Aiva.io account</CardTitle>
              <CardDescription>
                Start your AI-powered unified inbox by creating an Aiva.io workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="password">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
                </TabsList>

                <TabsContent value="password">
                  <PasswordSignupForm
                    next={next}
                    setSuccessMessage={setSuccessMessage}
                  />
                </TabsContent>
                <TabsContent value="magic-link">
                  <MagicLinkSignupForm
                    next={next}
                    setSuccessMessage={setSuccessMessage}
                  />
                </TabsContent>
              </Tabs>
              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="text-sm text-center text-muted-foreground">
                  Or sign up with your email provider
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
            <CardFooter>
              <div className="w-full text-center">
                <div className="text-sm">
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Already have an account? Log in
                  </Link>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
