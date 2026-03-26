import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { mapUser } from "@/lib/apiMappers";
import { cacheGetJson, cacheSetJson, memoryCacheGet, memoryCacheSet } from "@/lib/cache";
import { withCacheHeaders, cacheHeaders } from "@/lib/cacheHeaders";

// Request deduplication
const pendingRequests = new Map<string, Promise<NextResponse>>();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> },
): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) return authResult.response;

  const { username: rawUsername } = await context.params;
  const username = decodeURIComponent(rawUsername).replace(/^@/, "");
  const normalizedUsername = username.toLowerCase();
  const cacheKey = `profile:header:${normalizedUsername}`;

  // Check memory cache first (fastest path - <1ms)
  const memCached = memoryCacheGet<{
    user: ReturnType<typeof mapUser>;
    isFollowing: boolean;
  }>(cacheKey);
  if (memCached) {
    return withCacheHeaders(
      NextResponse.json({
        user: memCached.user,
        isFollowing: memCached.isFollowing,
        isOwn: memCached.user.id === authResult.user.sub,
        currentUserId: authResult.user.sub,
      }),
      cacheHeaders.userData,
    );
  }

  // Check Redis cache
  const cached = await cacheGetJson<{
    user: ReturnType<typeof mapUser>;
    isFollowing: boolean;
  }>(cacheKey);
  if (cached) {
    memoryCacheSet(cacheKey, cached, 55);
    return withCacheHeaders(
      NextResponse.json({
        user: cached.user,
        isFollowing: cached.isFollowing,
        isOwn: cached.user.id === authResult.user.sub,
        currentUserId: authResult.user.sub,
      }),
      cacheHeaders.userData,
    );
  }

  // Deduplicate concurrent requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const fetchHeader = async () => {
    // Use findFirst with case-insensitive search
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarBlobUrl: true,
        bio: true,
      },
    });

    if (!user) {
      pendingRequests.delete(cacheKey);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isOwn = user.id === authResult.user.sub;

    // Fetch counts and follow status in parallel
    const [followers, following, postsCount, relation] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } }),
      isOwn
        ? Promise.resolve(null)
        : prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: authResult.user.sub,
                followingId: user.id,
              },
            },
            select: { id: true },
          }),
    ]);

    const result = {
      user: mapUser({
        ...user,
        followers,
        following,
        posts: postsCount,
      }),
      isFollowing: Boolean(relation),
      isOwn,
      currentUserId: authResult.user.sub,
    };

    // Cache for 60 seconds
    memoryCacheSet(cacheKey, result, 55);
    await cacheSetJson(cacheKey, result, 60);

    pendingRequests.delete(cacheKey);
    return withCacheHeaders(
      NextResponse.json(result),
      cacheHeaders.userData,
    );
  };

  const fetchPromise = fetchHeader();
  pendingRequests.set(cacheKey, fetchPromise);

  return fetchPromise;
}
