import { Button } from "@/components/ui/button";
import { Sailboat } from "lucide-react";
import TitleBlock from "../title-block";

import { Link } from "@/components/intl-link";

export default function CTA() {
  return (
    <div className="py-20 px-6 flex flex-col justify-center items-center space-y-8 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <TitleBlock
        icon={<Sailboat size={16} />}
        section="Ready to Transform Your Communication?"
        title="Join thousands of professionals who save 10+ hours per week"
        subtitle="Start your free 14-day trial today. No credit card required. Cancel anytime."
      />
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Button className="w-full sm:w-auto px-8 text-lg h-12" size="lg" asChild>
          <Link href="/sign-up">Start Free Trial</Link>
        </Button>
        <Button className="w-full sm:w-auto px-8 text-lg h-12" size="lg" variant="outline" asChild>
          <Link href="#pricing">View Pricing</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        ✓ 14-day free trial • ✓ No credit card required • ✓ Cancel anytime • ✓ Setup in 5 minutes
      </p>
    </div>
  );
}
