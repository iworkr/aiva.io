import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Icons from "../icons";

export default function Quotation() {
  return (
    <section className="p-16 lg:p-24 bg-muted/40 flex flex-col justify-center items-center  space-y-2">
      <div>
        <Icons.quote />
      </div>
      <h2 className="font-medium text-2xl lg:text-4xl max-w-4xl text-center">
        "Aiva has transformed how I manage communication. I save 10+ hours per week and never miss an important message. It's like having a personal assistant that never sleeps."
      </h2>
      <div className="flex gap-3 pt-3 items-center">
        <Avatar className="size-10">
          <AvatarImage src="/images/quote.png" alt="Sarah Chen" />
          <AvatarFallback>SC</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground font-medium text-sm">
            Sarah Chen
          </p>
          <div className="h-4 w-[2px] bg-slate-400"></div>
          <p className="text-muted-foreground font-light text-sm">
            Agency Owner, Tech Solutions Inc.
          </p>
        </div>
      </div>
    </section>
  );
}
