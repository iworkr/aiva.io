import { NotificationsDialog } from "@/components/notifications-dialog";
import { SyncStatusProvider } from "@/components/sync/SyncStatusProvider";
import { SyncStatusBanner } from "@/components/sync/SyncStatusBanner";
import { CreateWorkspaceDialogProvider } from "@/contexts/CreateWorkspaceDialogContext";
import { LoggedInUserProvider } from "@/contexts/LoggedInUserContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { serverGetLoggedInUserVerified } from "@/utils/server/serverGetLoggedInUser";
import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import PosthogIdentify from "./PosthogIdentify";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

function buildLoginRedirectPath(locale: string) {
  // For now we send unauthenticated users to the locale-aware login page.
  // The login flow already supports an optional `next` parameter from links.
  return `/${locale}/login`;
}

export default async function Layout({ children, params }: AuthenticatedLayoutProps) {
  const { locale } = await params;
  let user: User | null = null;

  try {
    user = await serverGetLoggedInUserVerified();
  } catch (fetchDataError) {
    console.log("fetchDataError", fetchDataError);
  }

  if (!user) {
    const loginUrl = buildLoginRedirectPath(locale);
    redirect(loginUrl);
  }

  return (
    <CreateWorkspaceDialogProvider>
      <LoggedInUserProvider user={user}>
        <NotificationsProvider>
          <SyncStatusProvider>
            {/* Flex column layout: banner on top pushes content down */}
            <div className="flex flex-col min-h-screen">
              <SyncStatusBanner />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
            </div>
            <NotificationsDialog />
            <PosthogIdentify />
          </SyncStatusProvider>
        </NotificationsProvider>
      </LoggedInUserProvider>
    </CreateWorkspaceDialogProvider>
  );
}
