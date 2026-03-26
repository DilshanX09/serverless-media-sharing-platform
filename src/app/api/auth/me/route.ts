import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { cacheGetJson, cacheSetJson, memoryCacheGet, memoryCacheSet } from "@/lib/cache";
import { withCacheHeaders, cacheHeaders } from "@/lib/cacheHeaders";

interface CachedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarBlobUrl: string | null;
  createdAt: Date;
}

// Request deduplication per user
const pendingRequests = new Map<string, Promise<NextResponse>>();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const cacheKey = `auth:me:${authResult.user.sub}`;

  // Check memory cache first (fastest path)
  const memCached = memoryCacheGet<CachedUser>(cacheKey);
  if (memCached) {
    return withCacheHeaders(
      NextResponse.json({ user: memCached }, { status: 200 }),
      cacheHeaders.userData,
    );
  }

  // Check Redis cache
  const cached = await cacheGetJson<CachedUser>(cacheKey);
  if (cached) {
    // Populate memory cache
    memoryCacheSet(cacheKey, cached, 50);
    return withCacheHeaders(
      NextResponse.json({ user: cached }, { status: 200 }),
      cacheHeaders.userData,
    );
  }

  // Deduplicate concurrent requests for same user
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const fetchUser = async () => {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.sub },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarBlobUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      pendingRequests.delete(cacheKey);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cache for 60 seconds in Redis, 55 in memory
    await cacheSetJson(cacheKey, user, 60);
    memoryCacheSet(cacheKey, user, 55);

    pendingRequests.delete(cacheKey);
    return withCacheHeaders(
      NextResponse.json({ user }, { status: 200 }),
      cacheHeaders.userData,
    );
  };

  const fetchPromise = fetchUser();
  pendingRequests.set(cacheKey, fetchPromise);

  return fetchPromise;
}
