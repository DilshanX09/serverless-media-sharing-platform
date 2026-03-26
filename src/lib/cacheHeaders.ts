import { NextResponse } from "next/server";

/**
 * Add cache headers to API responses
 */
export function withCacheHeaders<T extends NextResponse>(
  response: T,
  options: {
    maxAge?: number; // seconds
    staleWhileRevalidate?: number; // seconds
    private?: boolean;
    noCache?: boolean;
  } = {},
): T {
  const {
    maxAge = 0,
    staleWhileRevalidate = 0,
    private: isPrivate = false,
    noCache = false,
  } = options;

  let cacheControl: string;

  if (noCache) {
    cacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate";
  } else if (maxAge > 0) {
    const directives = [
      isPrivate ? "private" : "public",
      `max-age=${maxAge}`,
    ];
    if (staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }
    cacheControl = directives.join(", ");
  } else {
    cacheControl = "no-store, must-revalidate";
  }

  response.headers.set("Cache-Control", cacheControl);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Vary", "Accept-Encoding");

  return response;
}

/**
 * Quick helpers for common cache patterns
 */
export const cacheHeaders = {
  // Dynamic user data - short cache with revalidation
  userData: { maxAge: 30, staleWhileRevalidate: 60, private: true },

  // Feed data - moderate cache
  feed: { maxAge: 30, staleWhileRevalidate: 90, private: true },

  // Public data - longer cache
  public: { maxAge: 60, staleWhileRevalidate: 120 },

  // Auth endpoints - never cache
  auth: { noCache: true },

  // Comments - short cache
  comments: { maxAge: 20, staleWhileRevalidate: 60, private: true },

  // Posts - moderate cache
  posts: { maxAge: 30, staleWhileRevalidate: 60 },
};
