"use client";

import { type ReactNode } from "react";
import { AuthFeatureShowcase } from "@/components/marketing-ui/AuthFeatureShowcase";
import { Link } from "@/components/intl-link";
import { ArrowLeft } from "lucide-react";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex min-h-screen">
      {/* Left side - Login/Signup form */}
      <div className="lg:w-[45%] xl:w-2/5 p-6 lg:p-8 flex flex-col items-center justify-center min-h-screen bg-background relative">
        {/* Back to home link */}
        <div className="absolute top-6 left-6">
          <Link 
            href="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
        
        <div className="w-full max-w-md">{children}</div>
      </div>
      
      {/* Right side - Feature Showcase */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-3/5 border-l items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 via-background to-primary/5 relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
        
        <div className="relative w-full max-w-lg px-8 z-10">
          <AuthFeatureShowcase />
        </div>
      </div>
    </div>
  );
}
