"use client";

import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/intl-link";
import { Suspense, useEffect, useState } from "react";
import { LeftNav } from "./LeftNav";
import { LoginCTAButton } from "./LoginCTAButton";
import { MobileMenu } from "./MobileMenu";
import { MobileMenuProvider } from "./MobileMenuContext";
import { MobileMenuOpen } from "./MobileMenuOpen";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export function ExternalNavigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <MobileMenuProvider>
      <header
        className={cn(
          "sticky inset-x-0 w-full top-0 z-50 border-b backdrop-blur-xl bg-background/80 transition-all duration-200",
          scrolled && "py-0 shadow-sm"
        )}
      >
        <nav
          className={cn(
            "flex items-center w-full md:container md:mx-auto justify-between px-6 md:px-8 transition-all duration-200",
            scrolled ? "h-[50px]" : "h-[58px]"
          )}
          aria-label="Global"
        >
          <LeftNav />
          <div className="flex gap-3 items-center">
            <Suspense
              fallback={
                <div className="flex space-x-10 items-center lg:-mr-2"></div>
              }
            >
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2">
                  <LocaleSwitcher />
                  <ThemeSwitch />
                </div>
                <div className="hidden lg:flex items-center gap-3 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-2"
                    asChild
                  >
                    <Link href="#demo">
                      <Play className="w-3.5 h-3.5" />
                      Watch demo
                    </Link>
                  </Button>
                  <div className="flex flex-col items-center">
                    <Button size="sm" className="font-semibold" asChild>
                      <Link href="/sign-up">Start Free</Link>
                    </Button>
                    <span className="text-[10px] text-muted-foreground mt-0.5 hidden xl:block">
                      No credit card required
                    </span>
                  </div>
                </div>
              </div>
            </Suspense>
            <MobileMenuOpen />
          </div>
        </nav>
        <MobileMenu />
      </header>
    </MobileMenuProvider>
  );
}
