// OrganizationSidebar.tsx (Server Component)

import { SidebarAdminPanelNav } from "@/components/sidebar-admin-panel-nav";
import { SidebarFooterUserNav } from "@/components/sidebar-footer-user-nav";
import { SidebarWorkspaceNav } from "@/components/sidebar-workspace-nav";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { SubscriptionData } from "@/payments/AbstractPaymentGateway";
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";
import {
  getCachedSlimWorkspaces,
  getCachedSoloWorkspace,
} from "@/rsc-data/user/workspaces";
import { toLower } from "lodash";

function getHasProSubscription(subscriptions: SubscriptionData[]) {
  return subscriptions.some(
    (subscription) =>
      toLower(subscription.billing_products?.name).includes("pro") &&
      subscription.billing_products?.active,
  );
}

export async function SoloWorkspaceSidebar() {
  try {
    const [workspace, slimWorkspaces] = await Promise.all([
      getCachedSoloWorkspace(),
      getCachedSlimWorkspaces(),
    ]);
    
    if (!workspace) {
      console.warn("No solo workspace found for sidebar");
      return null;
    }
    
    // Only check for Stripe subscriptions if Stripe is configured
    let hasProSubscription = false;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const paymentGateway = new StripePaymentGateway();
        const subscriptions = await paymentGateway.db.getSubscriptionsByWorkspaceId(
          workspace.id,
        );
        hasProSubscription = getHasProSubscription(subscriptions);
      } catch (stripeError) {
        // Stripe not configured or error fetching subscriptions - continue without pro features
        console.warn("Stripe not configured or error fetching subscriptions:", stripeError);
      }
    }

    return (
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <Image
              src="/logos/aiva-logo-dark.svg"
              width={120}
              height={32}
              alt="Aiva logo"
              className="hidden dark:block"
            />
            <Image
              src="/logos/aiva-logo-light.svg"
              width={120}
              height={32}
              alt="Aiva logo"
              className="block dark:hidden"
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarWorkspaceNav workspace={workspace} />
          <SidebarAdminPanelNav />
          {/* Shopify Integration - External Link */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="https://shopify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <img
                      src="https://static.cdnlogo.com/logos/s/88/shopify.svg"
                      alt="Shopify"
                      className="h-[15px] w-[15px]"
                    />
                    <span>Shopify Integration</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarFooterUserNav />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  } catch (e) {
    // Log error but don't throw - allow page to load without sidebar
    // The workspace might not be ready yet due to timing issues after creation
    console.error("Failed to load solo workspace sidebar:", e);
    return null;
  }
}
