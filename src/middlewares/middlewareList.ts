import { adminMiddleware } from "./admin-middleware";
import { authMiddleware } from "./auth-middleware";
import { localeMiddleware } from "./locale-middleware";
import {
  dashboardOnboardingMiddleware,
  onboardingRedirectMiddleware,
} from "./onboarding-middleware";
import { subscriptionMiddleware } from "./subscription-middleware";
import { MiddlewareConfig } from "./types";

export const middlewareList: MiddlewareConfig[] = [
  localeMiddleware,
  authMiddleware,
  dashboardOnboardingMiddleware,
  onboardingRedirectMiddleware,
  subscriptionMiddleware,
  adminMiddleware,
];
