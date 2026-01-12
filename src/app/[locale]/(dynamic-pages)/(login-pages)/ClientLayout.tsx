"use client";

import { type ReactNode } from "react";
import "./graphic-background.css";
import { FeatureSlideshow } from "@/components/marketing-ui/FeatureSlideshow";
import Image from "next/image";
import { Link } from "@/components/intl-link";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex min-h-screen">
      {/* Left side - Login/Signup form */}
      <div className="lg:w-2/5 p-6 lg:p-8 flex flex-col items-center justify-center min-h-screen bg-background relative">
        {/* Back to home link */}
        <div className="absolute top-6 left-6">
          <Link 
            href="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to home
          </Link>
        </div>
        
        <div className="w-full max-w-md">{children}</div>
      </div>
      
      {/* Right side - Interactive Feature Slideshow */}
      <div className="hidden lg:flex w-3/5 border-l items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 via-background to-primary/5 relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative w-full max-w-2xl px-12 z-10">
          <FeatureSlideshow 
            autoPlayInterval={14000}
            showControls={true}
            showIndicators={true}
            compact={false}
          />
        </div>
      </div>
    </div>
  );
}
