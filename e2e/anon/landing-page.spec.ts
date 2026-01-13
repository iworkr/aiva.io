import { expect, test } from "@playwright/test";

test.describe("Landing Page - Complete Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Hero Section", () => {
    test("displays main headline", async ({ page }) => {
      await expect(page.locator("h1")).toContainText(
        "Your AI executive assistant for every inbox"
      );
    });

    test("displays subheadline with value proposition", async ({ page }) => {
      await expect(page.getByText("Connect Gmail, Outlook, Slack")).toBeVisible();
    });

    test("has Start Free CTA button", async ({ page }) => {
      await expect(page.getByRole("link", { name: /Start Free/i }).first()).toBeVisible();
    });

    test("has Watch demo button", async ({ page }) => {
      await expect(page.getByRole("link", { name: /Watch.*tour/i }).first()).toBeVisible();
    });

    test("displays trust chips", async ({ page }) => {
      await expect(page.getByText("Encrypted by design")).toBeVisible();
      await expect(page.getByText("You approve auto-send")).toBeVisible();
      await expect(page.getByText("Works for teams")).toBeVisible();
    });

    test("displays no credit card message", async ({ page }) => {
      await expect(page.getByText(/No credit card required/i).first()).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("has sticky header with logo", async ({ page }) => {
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator('img[alt="Aiva logo"]').first()).toBeVisible();
    });

    test("has navigation links", async ({ page }) => {
      await expect(page.getByRole("link", { name: "Product" })).toBeVisible();
      await expect(page.getByRole("link", { name: "How it works" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Integrations" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Pricing" })).toBeVisible();
      await expect(page.getByRole("link", { name: "FAQ" })).toBeVisible();
    });

    test("Start Free button in header is clickable", async ({ page }) => {
      const startFreeBtn = page.locator("header").getByRole("link", { name: "Start Free" });
      await expect(startFreeBtn).toBeVisible();
      await expect(startFreeBtn).toHaveAttribute("href", /sign-up/);
    });
  });

  test.describe("Social Proof Strip", () => {
    test("displays trust headline", async ({ page }) => {
      await expect(page.getByText("Built for teams who can't afford missed messages")).toBeVisible();
    });

    test("displays metrics", async ({ page }) => {
      await expect(page.getByText("50K+")).toBeVisible();
      await expect(page.getByText("73%")).toBeVisible();
      await expect(page.getByText("8hrs")).toBeVisible();
    });
  });

  test.describe("Problem Section", () => {
    test("displays problem headline", async ({ page }) => {
      await expect(page.getByText("Modern communication is scattered — and expensive")).toBeVisible();
    });

    test("displays problem outcomes", async ({ page }) => {
      await expect(page.getByText("Missed revenue")).toBeVisible();
      await expect(page.getByText("Frustrated clients")).toBeVisible();
      await expect(page.getByText("Late decisions")).toBeVisible();
      await expect(page.getByText("Constant inbox anxiety")).toBeVisible();
    });
  });

  test.describe("Solution Section", () => {
    test("displays solution headline", async ({ page }) => {
      await expect(page.getByText("A command center for communication")).toBeVisible();
    });

    test("displays three pillars", async ({ page }) => {
      await expect(page.getByText("Unified Inbox").first()).toBeVisible();
      await expect(page.getByText("AI Priority Engine").first()).toBeVisible();
      await expect(page.getByText("Actions on autopilot")).toBeVisible();
    });
  });

  test.describe("Features Section", () => {
    test("displays features headline", async ({ page }) => {
      await expect(page.getByText("Everything you need to stay ahead of your inbox")).toBeVisible();
    });

    test("displays 6 core features", async ({ page }) => {
      await expect(page.getByText("True Unified Inbox")).toBeVisible();
      await expect(page.getByText("Smart Drafts")).toBeVisible();
      await expect(page.getByText("Auto-send Controls")).toBeVisible();
      await expect(page.getByText("Scheduling Agent").first()).toBeVisible();
      await expect(page.getByText("Task & Follow-up Extraction")).toBeVisible();
    });
  });

  test.describe("How It Works Section", () => {
    test("displays how it works headline", async ({ page }) => {
      await expect(page.getByText("Set it up once. Aiva works in the background")).toBeVisible();
    });

    test("displays 3 steps", async ({ page }) => {
      await expect(page.getByText("Connect your inboxes")).toBeVisible();
      await expect(page.getByText("Aiva reads and learns")).toBeVisible();
      await expect(page.getByText("Aiva acts")).toBeVisible();
    });
  });

  test.describe("Product Showcase Section", () => {
    test("displays product showcase headline", async ({ page }) => {
      await expect(page.getByText("See Aiva in action")).toBeVisible();
    });

    test("has tabs for different features", async ({ page }) => {
      await expect(page.getByRole("tab", { name: /Inbox/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Priorities/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Drafts/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Scheduling/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Tasks/i })).toBeVisible();
    });

    test("tabs are interactive", async ({ page }) => {
      const draftsTab = page.getByRole("tab", { name: /Drafts/i });
      await draftsTab.click();
      await expect(page.getByText("Drafts in your voice")).toBeVisible();
    });
  });

  test.describe("Deep Dive Section", () => {
    test("displays deep dive headline", async ({ page }) => {
      await expect(page.getByText("Let Aiva handle routine replies")).toBeVisible();
    });

    test("displays auto-reply section", async ({ page }) => {
      await expect(page.getByText("Auto-reply").first()).toBeVisible();
      await expect(page.getByText("Confidence threshold")).toBeVisible();
    });

    test("displays scheduling section", async ({ page }) => {
      await expect(page.getByText("Scheduling agent").first()).toBeVisible();
      await expect(page.getByText("Working hours")).toBeVisible();
    });
  });

  test.describe("Integrations Section", () => {
    test("displays integrations headline", async ({ page }) => {
      await expect(page.getByText("Works where your work already happens")).toBeVisible();
    });

    test("displays integration logos", async ({ page }) => {
      await expect(page.getByText("Gmail").first()).toBeVisible();
      await expect(page.getByText("Outlook").first()).toBeVisible();
      await expect(page.getByText("Slack").first()).toBeVisible();
    });

    test("shows coming soon integrations", async ({ page }) => {
      await expect(page.getByText("Coming soon:")).toBeVisible();
    });
  });

  test.describe("Pricing Section", () => {
    test("displays pricing headline", async ({ page }) => {
      await expect(page.getByText("Simple pricing that scales with your workload")).toBeVisible();
    });

    test("has billing toggle", async ({ page }) => {
      await expect(page.getByText("Monthly")).toBeVisible();
      await expect(page.getByText("Annual")).toBeVisible();
    });

    test("displays pricing plans", async ({ page }) => {
      await expect(page.getByText("Starter").first()).toBeVisible();
      await expect(page.getByText("Team").first()).toBeVisible();
      await expect(page.getByText("Enterprise").first()).toBeVisible();
    });

    test("shows most popular badge", async ({ page }) => {
      await expect(page.getByText("Most Popular")).toBeVisible();
    });
  });

  test.describe("FAQ Section", () => {
    test("displays FAQ headline", async ({ page }) => {
      await expect(page.getByText("Frequently Asked Questions")).toBeVisible();
    });

    test("displays FAQ questions", async ({ page }) => {
      await expect(page.getByText("Is my data secure?")).toBeVisible();
      await expect(page.getByText("Does Aiva send messages automatically?")).toBeVisible();
      await expect(page.getByText("Can I control the tone of drafts?")).toBeVisible();
    });

    test("FAQ accordion is interactive", async ({ page }) => {
      const securityQuestion = page.getByText("Is my data secure?");
      await securityQuestion.click();
      await expect(page.getByText("Encryption in transit")).toBeVisible();
    });
  });

  test.describe("Final CTA Section", () => {
    test("displays final CTA headline", async ({ page }) => {
      await expect(page.getByText("Nothing important slips through")).toBeVisible();
    });

    test("has CTA buttons", async ({ page }) => {
      const ctaSection = page.locator("section").filter({ hasText: "Nothing important slips through" });
      await expect(ctaSection.getByRole("link", { name: /Start Free/i })).toBeVisible();
    });
  });

  test.describe("Footer", () => {
    test("displays footer with logo", async ({ page }) => {
      await expect(page.locator("footer")).toBeVisible();
    });

    test("displays footer links", async ({ page }) => {
      const footer = page.locator("footer");
      await expect(footer.getByText("Product")).toBeVisible();
      await expect(footer.getByText("Company")).toBeVisible();
      await expect(footer.getByText("Legal")).toBeVisible();
    });

    test("displays security badges", async ({ page }) => {
      await expect(page.getByText("SOC 2 Compliant")).toBeVisible();
      await expect(page.getByText("256-bit encryption")).toBeVisible();
    });

    test("displays copyright", async ({ page }) => {
      await expect(page.getByText(/© \d{4} Aiva.io/)).toBeVisible();
    });
  });
});

test.describe("Auth Pages", () => {
  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/en/login");
    });

    test("displays login form", async ({ page }) => {
      await expect(page.getByText("Welcome back")).toBeVisible();
      await expect(page.getByText("Log in to your unified AI inbox")).toBeVisible();
    });

    test("has OAuth buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Outlook/i })).toBeVisible();
    });

    test("has password and magic link tabs", async ({ page }) => {
      await expect(page.getByRole("tab", { name: "Password" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Magic Link" })).toBeVisible();
    });

    test("has link to sign up", async ({ page }) => {
      await expect(page.getByText(/Don't have an account/)).toBeVisible();
      await expect(page.getByText("Start free")).toBeVisible();
    });

    test("has back to home link", async ({ page }) => {
      await expect(page.getByText("Back to home")).toBeVisible();
    });

    test("displays security indicator", async ({ page }) => {
      await expect(page.getByText("Secured with 256-bit encryption")).toBeVisible();
    });
  });

  test.describe("Sign Up Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/en/sign-up");
    });

    test("displays signup form", async ({ page }) => {
      await expect(page.getByText("Start your free trial")).toBeVisible();
      await expect(page.getByText("Create your account in seconds")).toBeVisible();
    });

    test("displays benefits badges", async ({ page }) => {
      await expect(page.getByText("Unified inbox across all channels")).toBeVisible();
      await expect(page.getByText("AI-powered priority scoring")).toBeVisible();
      await expect(page.getByText("Smart reply drafts")).toBeVisible();
      await expect(page.getByText("14-day free trial")).toBeVisible();
    });

    test("has OAuth buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Outlook/i })).toBeVisible();
    });

    test("has password and magic link tabs", async ({ page }) => {
      await expect(page.getByRole("tab", { name: "Password" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Magic Link" })).toBeVisible();
    });

    test("has link to login", async ({ page }) => {
      await expect(page.getByText(/Already have an account/)).toBeVisible();
      await expect(page.getByText("Log in")).toBeVisible();
    });

    test("has back to home link", async ({ page }) => {
      await expect(page.getByText("Back to home")).toBeVisible();
    });

    test("displays trust message", async ({ page }) => {
      await expect(page.getByText("No credit card required · Cancel anytime")).toBeVisible();
    });
  });
});

test.describe("Navigation & Routing", () => {
  test("clicking sign up navigates to sign up page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start Free" }).first().click();
    await page.waitForURL(/sign-up/);
    await expect(page.getByText("Start your free trial")).toBeVisible();
  });

  test("anchor links scroll to sections", async ({ page }) => {
    await page.goto("/");
    
    // Click Features link
    await page.getByRole("link", { name: "Product" }).click();
    await page.waitForTimeout(500);
    
    // Check that we're at the features section
    const featuresSection = page.locator("#features");
    await expect(featuresSection).toBeInViewport();
  });

  test("pricing anchor works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Pricing" }).click();
    await page.waitForTimeout(500);
    
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeInViewport();
  });

  test("FAQ anchor works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "FAQ" }).click();
    await page.waitForTimeout(500);
    
    const faqSection = page.locator("#faq");
    await expect(faqSection).toBeInViewport();
  });
});

test.describe("Responsive Design", () => {
  test("mobile menu appears on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    
    // Mobile menu button should be visible
    const menuButton = page.locator("header button").first();
    await expect(menuButton).toBeVisible();
  });

  test("desktop nav links hidden on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    
    // Desktop nav should be hidden
    const productLink = page.locator("header nav").getByRole("link", { name: "Product" });
    await expect(productLink).not.toBeVisible();
  });
});

test.describe("Visual Integrity", () => {
  test("page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Filter out expected errors (like missing env vars in test)
    const criticalErrors = errors.filter(e => 
      !e.includes("supabase") && 
      !e.includes("Failed to load resource") &&
      !e.includes("favicon")
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test("images load correctly", async ({ page }) => {
    await page.goto("/");
    
    // Check that logo loads
    const logo = page.locator('img[alt="Aiva logo"]').first();
    await expect(logo).toBeVisible();
  });
});
