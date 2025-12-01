"use client";

import { Link } from "@/components/intl-link";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrefetch } from "@/hooks/usePrefetch";
import { DocsMobileNavigation } from "./DocsMobileNavigation";
import { navbarLinks } from "./constants";

export function LeftNav() {
  const pathname = usePathname();
  const { onMouseEnter } = usePrefetch();

  const isBlogPage = pathname?.startsWith("/blog");
  const isDocsPage = pathname?.startsWith("/docs");

  return (
    <div className="flex items-center gap-8">
      <DocsMobileNavigation />
      <div className="flex space-x-8">
        <Link href="/" className={cn("font-bold text-xl ")}>
          <div className="relative flex h-10 md:w-fit items-center justify-center dark:-ml-4 -ml-2">
            {/* Dark theme: light logo on dark background */}
            <Image
              src={`/logos/aiva-logo-light.svg`}
              width={120}
              height={32}
              alt="Aiva logo"
              className="hidden dark:block"
            />
            {/* Light theme: dark logo on light background */}
            <Image
              src={`/logos/aiva-logo-dark.svg`}
              width={120}
              height={32}
              alt="Aiva logo"
              className="block dark:hidden"
            />
          </div>
        </Link>
      </div>
      <ul className="hidden lg:flex gap-8 font-medium items-center">
        {navbarLinks.map(({ name, href }) => (
          <li
            key={name}
            className="text-muted-foreground font-regular text-sm hover:text-foreground"
          >
            <Link href={href} onMouseEnter={onMouseEnter(href)}>{name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
