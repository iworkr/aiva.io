"use client";
import { Link } from "@/components/intl-link";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import { MobileMenuContext } from "./MobileMenuContext";
import { navbarLinks } from "./constants";
import { Play } from "lucide-react";

export function MobileMenu() {
  const { setMobileMenuOpen, mobileMenuOpen } = useContext(MobileMenuContext);
  return (
    <>
      {mobileMenuOpen && (
        <div className="lg:hidden w-full shadow-2xl py-4 flex flex-col items-start font-medium bg-background/95 backdrop-blur-xl border-t">
          <ul className="w-full space-y-1 px-4">
            {navbarLinks.map(({ name, href }) => (
              <li key={name}>
                <Link
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>

          <hr className="w-full my-4 border-border" />
          
          <div className="flex flex-col w-full gap-3 px-4">
            <Button
              variant="outline"
              size="default"
              className="w-full justify-center gap-2"
              asChild
            >
              <Link href="#demo" onClick={() => setMobileMenuOpen(false)}>
                <Play className="w-4 h-4" />
                Watch demo
              </Link>
            </Button>
            <Button size="default" className="w-full font-semibold" asChild>
              <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                Start Free
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              No credit card required
            </p>
          </div>
        </div>
      )}
    </>
  );
}
