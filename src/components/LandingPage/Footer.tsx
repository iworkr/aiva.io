"use client";

import { Link } from "@/components/intl-link";
import Image from "next/image";
import { footerItems, footerSocialItems } from "./footer-items";
import { Shield, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-t w-full">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-4">
            <Link href="/">
              <div className="relative flex items-center">
                {/* Dark theme: light logo */}
                <Image
                  src="/logos/aiva-logo-light.svg"
                  alt="Aiva logo"
                  width={120}
                  height={32}
                  className="hidden dark:block"
                />
                {/* Light theme: dark logo */}
                <Image
                  src="/logos/aiva-logo-dark.svg"
                  alt="Aiva logo"
                  width={120}
                  height={32}
                  className="block dark:hidden"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your AI executive assistant for every inbox. Never miss what matters.
            </p>
            
            {/* Security badges */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>256-bit encryption</span>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-4 pt-2">
              {footerSocialItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.url}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <item.icon />
                  <span className="sr-only">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerItems.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="font-semibold text-sm">{section.title}</h3>
              <ul className="space-y-3">
                {section.items.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.url}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aiva.io. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
