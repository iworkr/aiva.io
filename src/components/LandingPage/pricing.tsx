import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pricing } from "@/data/anon/pricing";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, DollarSign } from "lucide-react";
import TitleBlock from "../title-block";

const Pricing = () => {
  return (
    <section id="pricing" className="py-16 max-w-6xl flex flex-col justify-center items-center  mx-auto space-y-10 overflow-hidden px-6">
      <TitleBlock
        icon={<DollarSign size={16} />}
        title="Simple, Transparent Pricing"
        section="Pricing"
        subtitle="Choose the plan that fits your needs. All plans include a 14-day free trial. No credit card required."
      />

      <Tabs
        defaultValue="monthly"
        className="flex justify-center w-full  items-center flex-col"
      >
        <TabsList className="mb-6 max-w-80 w-full">
          <TabsTrigger className="w-full" value="monthly">
            Monthly
          </TabsTrigger>
          <TabsTrigger className="w-full" value="annual">
            Annual
          </TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full ">
            {pricing.map((item, i) => (
              <PricingCard key={i} {...item} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="annual" className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full ">
            {pricing.map((item, i) => {
              const monthly = Number(item.price);
              const annualTotal = Number(item.annualPrice);
              // Calculate realistic annual discount: 2 months free (10 months paid)
              // This gives approximately 17% discount, which is realistic
              const monthsPaid = 10; // 2 months free
              const effectiveMonthly =
                !Number.isNaN(monthly) && !Number.isNaN(annualTotal) && monthly > 0
                  ? ((monthly * monthsPaid) / 12).toFixed(0)
                  : item.annualPrice;
              
              // Calculate savings
              const savings = monthly > 0 && annualTotal > 0
                ? (monthly * 12 - Number(annualTotal)).toFixed(0)
                : '0';

              return (
                <PricingCard
                  key={i}
                  {...item}
                  price={effectiveMonthly}
                  billingLabel={`${item.annualPrice} billed annually (save $${savings}/year)`}
                />
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
};

const PricingCard = ({
  title,
  price,
  features,
  description,
  isHighlighted = false,
  billingLabel,
}: {
  title: string;
  price: string;
  features: string[];
  description: string;
  isHighlighted?: boolean;
  billingLabel?: string;
}) => {
  return (
    <Card
      className={cn(`${isHighlighted ? "bg-secondary" : ""} ,
     h-fit
    `)}
    >
      <CardHeader className="space-y-1 p-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          </div>
          {isHighlighted && <Badge>Most Popular</Badge>}
        </div>
        <div className="flex items-baseline gap-2 py-3">
          <h3 className="text-4xl font-bold tracking-tighter">${price}</h3>
          <span className="text-muted-foreground">
            /month {billingLabel && <span className="text-xs ml-1">({billingLabel})</span>}
          </span>
        </div>
        <Button className="w-full" size="lg" variant="default">Start Free Trial</Button>
      </CardHeader>

      <CardContent className="p-4">
        <div className="h-[1px] bg-slate-200 dark:bg-slate-500 w-full "></div>
        <ul className="space-y-3 pt-10">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center">
              <CheckCircle2Icon size={16} />
              <span className="ml-2 text-sm font-medium">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default Pricing;
