/**
 * OAuth Sign-In Buttons with Automatic Channel Connection
 * Shows "Sign in with Google (Gmail)" and "Sign in with Outlook" buttons
 * that automatically create channel connections after authentication
 */

"use client";

import { Button } from "@/components/ui/button";
import { google, azure } from "./Icons";
import { useRouter } from "next/navigation";

interface OAuthWithChannelButtonsProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function OAuthWithChannelButtons({
  variant = "outline",
  size = "default",
  className = "",
}: OAuthWithChannelButtonsProps) {
  const router = useRouter();

  const handleGoogleSignIn = () => {
    // Redirect to our custom Google sign-in route
    window.location.href = "/api/auth/google-signin";
  };

  const handleOutlookSignIn = () => {
    // Redirect to our custom Outlook sign-in route
    window.location.href = "/api/auth/outlook-signin";
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        variant={variant}
        size={size}
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2"
      >
        <div className="flex items-center justify-center">
          {google()}
        </div>
        <span>Sign in with Google (Gmail)</span>
      </Button>
      
      <Button
        variant={variant}
        size={size}
        onClick={handleOutlookSignIn}
        className="w-full flex items-center justify-center gap-2"
      >
        <div className="flex items-center justify-center">
          {azure()}
        </div>
        <span>Sign in with Outlook</span>
      </Button>
    </div>
  );
}

