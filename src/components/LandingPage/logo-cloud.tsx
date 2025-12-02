import { logos } from "@/data/anon/logos";

import Image from "next/image";
import { Marquee } from "../magicui/marquee";

export default function LogoCloud() {
  return (
    <section className="flex justify-center items-center text-center max-w-6xl mx-auto overflow-hidden py-8">
      <div className="space-y-4">
        <p className="text-muted-foreground text-lg font-semibold">
          Trusted by professionals worldwide
        </p>
        <div className="w-full">
          <div className="mx-auto w-full px-4 md:px-8">
            <div
              className="group relative mt-4 flex gap-8 overflow-hidden p-2 items-center"
              style={{
                maskImage:
                  "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
              }}
            >
              <Marquee pauseOnHover className="[--duration:25s]">
                {logos.map((logo, key) => (
                  <a 
                    href={logo.website} 
                    key={key} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center mx-4 hover:opacity-80 transition-opacity"
                  >
                    <Image
                      width={120}
                      height={36}
                      src={logo.url}
                      className="h-9 w-auto object-contain px-2 invert-[50%] brightness-200 grayscale-[100%] dark:grayscale-0 dark:invert-[50%]"
                      alt={`${logo.name}`}
                    />
                  </a>
                ))}
              </Marquee>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
