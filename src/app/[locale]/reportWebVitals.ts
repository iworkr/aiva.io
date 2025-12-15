import { useReportWebVitals } from "next/web-vitals";
import { NextWebVitalsMetric } from "next/app";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import ReactGA from "react-ga4";

export function useMyReportWebVitals() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    // Only initialize Google Analytics if GA ID is provided
    if (!gaId) {
      return;
    }

    try {
      ReactGA.initialize(gaId);
    } catch (error) {
      console.error(error);
      console.error("Could not initialize Google Analytics.");
    }
  }, [gaId]);

  useEffect(() => {
    // Only track pageviews if GA is configured
    if (!gaId || !pathname) {
      return;
    }

    try {
      ReactGA.send({
        hitType: "pageview",
        page: pathname,
      });
    } catch (error) {
      console.error(error);
      console.error("Could not send pageview to Google Analytics.");
    }
  }, [pathname, gaId]);

  useReportWebVitals(({ id, name, value }: NextWebVitalsMetric) => {
    // Only track web vitals if GA is configured
    if (!gaId) {
      return;
    }

    try {
      ReactGA.event({
        category: "web-vital",
        label: id, // Needed to aggregate events.
        value: Math.round(name === "CLS" ? value * 1000 : value), // Optional
        nonInteraction: true, // avoids affecting bounce rate.
        action: "web-vital",
      });
    } catch (error) {
      console.error(error);
      console.error("Could not send web-vital to Google Analytics.");
    }
  });
}
