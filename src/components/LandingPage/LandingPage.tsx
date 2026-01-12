import { Footer } from "./Footer";
import HeroSection from "./HeroSection";
import CTA from "./cta";
import FAQ from "./faq";
import Integration from "./integration";
import LogoCloud from "./logo-cloud";
import Pricing from "./pricing";
import Features from "./features";
import ProblemSection from "./ProblemSection";
import SolutionSection from "./SolutionSection";
import HowItWorks from "./HowItWorks";
import ProductShowcase from "./ProductShowcase";
import DeepDive from "./DeepDive";

export const LandingPage = () => {
  return (
    <div>
      <div className="flex flex-col">
        {/* 1. Hero - above the fold */}
        <HeroSection />
        
        {/* 2. Social Proof Strip - logos + metrics */}
        <LogoCloud />
        
        {/* 3. Problem Section - The Chaos of Modern Communication */}
        <ProblemSection />
        
        {/* 4. Solution Section - The Aiva Command Center */}
        <SolutionSection />
        
        {/* 5. Feature Grid - 6 core capabilities */}
        <Features />
        
        {/* 6. How It Works - 3 steps */}
        <HowItWorks />
        
        {/* 7. Product Showcase - tabbed interface */}
        <ProductShowcase />
        
        {/* 8. Deep Dive - Auto-reply + Scheduling agent */}
        <DeepDive />
        
        {/* 9. Integrations */}
        <Integration />
        
        {/* 10. Pricing Preview */}
        <Pricing />
        
        {/* 11. FAQ */}
        <FAQ />
        
        {/* 12. Final CTA */}
        <CTA />
      </div>
      
      {/* 13. Footer */}
      <Footer />
    </div>
  );
};
