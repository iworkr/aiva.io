"use client";

import { type ReactNode } from "react";
import "./graphic-background.css";
import { FeatureSlideshow } from "@/components/marketing-ui/FeatureSlideshow";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex h-screen border-2 border-black">
      {/* Left side - Login/Signup form */}
      <div className="lg:w-2/5 p-8 flex items-center relative justify-center h-full bg-background">
        <div className="max-w-xl md:min-w-[450px]">{children}</div>
      </div>
      
      {/* Right side - Interactive Feature Slideshow */}
      <div className="hidden lg:flex w-3/5 border-l-2 items-center relative justify-center h-full bg-gradient-to-br from-background to-secondary/30">
        <div className="w-full max-w-2xl px-12">
          <FeatureSlideshow 
            autoPlayInterval={12000}
            pauseOnHover={true}
            showControls={true}
            showIndicators={true}
            compact={false}
          />
        </div>
      </div>
    </div>
  );
}
