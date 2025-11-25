import { getMaybeDefaultWorkspace } from "@/data/user/workspaces";
import { toSiteURL } from "@/utils/helpers";
import { getWorkspaceSubPath } from "@/utils/workspaces";
import { withMaybeLocale } from "@/middlewares/utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Forces the route to be dynamically rendered on each request
 * Ensures fresh data is always fetched for dashboard routing
 */
export const dynamic = "force-dynamic";

/**
 * Handles GET request for dashboard routing
 * Attempts to redirect user to their default/initial workspace home page
 *
 * @param req - The incoming Next.js server request
 * @returns A redirect response to the user's workspace home or error page
 */
export async function GET(req: NextRequest) {
  try {
    // Retrieve the user's default or first available workspace
    const initialWorkspace = await getMaybeDefaultWorkspace();

    // If no workspace is found, redirect to error page
    if (!initialWorkspace) {
      return NextResponse.redirect(toSiteURL("/oops"));
    }

    // Log the membership type for debugging purposes
    console.log("initialWorkspace", initialWorkspace.workspace.membershipType);

    // Get the workspace subpath (e.g., "/home" for solo workspaces)
    const workspacePath = getWorkspaceSubPath(initialWorkspace.workspace, "/home");
    
    // Extract locale from the request URL pathname
    const pathname = req.nextUrl.pathname;
    const localeMatch = pathname.match(/^\/([^\/]+)/);
    const locale = localeMatch ? localeMatch[1] : "en";
    
    // Construct the redirect path with locale
    const redirectPath = `/${locale}${workspacePath}`;
    
    // Construct the redirect URL using the request URL as base
    const redirectUrl = new URL(redirectPath, req.url);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    // Log any errors encountered during dashboard loading
    console.error("Failed to load dashboard:", error);

    // Fallback to error page if dashboard loading fails
    return NextResponse.redirect(toSiteURL("/oops"));
  }
}
