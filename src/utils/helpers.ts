import MD5 from "crypto-js/md5";
import urlJoin from "url-join";

export const getURL = () => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    `https://www.tryaiva.io/`;
  // Make sure to include `https://` when not localhost.
  url = url.startsWith("http") ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;
  return url;
};

export const toSiteURL = (path: string) => {
  const url = getURL();
  return urlJoin(url, path);
};

/**
 * Gets the redirect URI for OAuth callbacks
 * Ensures HTTPS for production URLs (except localhost)
 * @param origin - The request origin (e.g., from request.nextUrl.origin)
 * @param callbackPath - The callback path (e.g., '/api/auth/outlook/callback')
 * @returns The full redirect URI with proper protocol
 */
export const getOAuthRedirectUri = (origin: string, callbackPath: string): string => {
  // Normalize origin to ensure HTTPS for production
  let normalizedOrigin = origin;
  
  // If it's not localhost and not already HTTPS, convert to HTTPS
  if (!origin.includes('localhost') && !origin.startsWith('https://')) {
    normalizedOrigin = origin.replace(/^http:/, 'https:');
  }
  
  // Remove trailing slash from origin if present
  normalizedOrigin = normalizedOrigin.replace(/\/$/, '');
  
  // Ensure callback path starts with /
  const normalizedPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;
  
  return `${normalizedOrigin}${normalizedPath}`;
};

export const toDateTime = (secs: number) => {
  const t = new Date("1970-01-01T00:30:00Z"); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export const getUserAvatarUrl = ({
  email,
  profileAvatarUrl,
}: {
  email: string | undefined;
  profileAvatarUrl?: string | null | undefined;
}) => {
  const placeholderAvatarUrl = `/assets/avatar.jpg`;
  const isProfileAvatarUrlValid =
    profileAvatarUrl && profileAvatarUrl.length > 0;
  return isProfileAvatarUrlValid ? profileAvatarUrl : placeholderAvatarUrl;
};

export const getPublicUserAvatarUrl = (
  possibleAvatarUrl?: string | null | undefined,
) => {
  const placeholderAvatarUrl = `/assets/avatar.jpg`;

  return possibleAvatarUrl ?? placeholderAvatarUrl;
};
