import { reviews } from "@/data/anon/reviews";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { Marquee } from "../magicui/marquee";
import TitleBlock from "../title-block";

export default function Testimonials() {
  // If we have real testimonials, show them; otherwise show a simplified "coming soon" message
  if (reviews.length === 0 || (reviews.length === 1 && reviews[0].name === "Customer Stories")) {
    return (
      <section className="bg-muted/40 py-24 px-6 ">
        <div className="max-w-6xl mx-auto space-y-8">
          <TitleBlock
            title="Customer Stories"
            subtitle="Real testimonials from Aiva users coming soon"
          />
          <div className="text-center py-12">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're collecting feedback from our early users. Customer testimonials and success stories will be featured here soon.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const firstRow = reviews.slice(0, 3);
  const secondRow = reviews.slice(3, 6);

  return (
    <section className="bg-muted/40 py-28 px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <TitleBlock
          title="Don't take our word for it"
          subtitle="Join thousands of professionals who save 10+ hours per week with Aiva"
        />
        <div className="relative flex h-full w-full flex-col pt-10 items-center justify-center overflow-hidden">
          {/* First row - uses repeat={2} for minimal duplication while maintaining smooth scroll */}
          <Marquee pauseOnHover className="[--duration:30s]" repeat={2}>
            {firstRow.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          {secondRow.length > 0 && (
            <Marquee reverse pauseOnHover className="[--duration:30s]" repeat={2}>
              {secondRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
          )}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-muted/40 "></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-linear-to-l from-muted/40 "></div>
        </div>
      </div>
    </section>
  );
}

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
}) => {
  return (
    <figure
      className={cn(
        "relative w-72 cursor-pointer overflow-hidden rounded-xl border p-5 transition-all duration-300",
        "border-border bg-background hover:bg-primary/5 hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <Image
          className="rounded-full ring-2 ring-primary/20"
          width="40"
          height="40"
          alt={`${name} avatar`}
          src={img}
        />
        <div className="flex flex-col">
          <figcaption className="text-sm font-semibold">{name}</figcaption>
          <p className="text-xs text-muted-foreground">{username}</p>
        </div>
      </div>
      <blockquote className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</blockquote>
    </figure>
  );
};
