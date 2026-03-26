import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { mapPost, mapUser } from "@/lib/apiMappers";
import {
  cacheGetJson,
  cacheSetJson,
  memoryCacheGet,
  memoryCacheSet,
} from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";
import { withCacheHeaders, cacheHeaders } from "@/lib/cacheHeaders";

// Request deduplication - pending requests per profile
const pendingRequests = new Map<string, Promise<NextResponse>>();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> },
): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) return authResult.response;

  const { username: rawUsername } = await context.params;
  const username = decodeURIComponent(rawUsername).replace(/^@/, "");
  const includeSaved = request.nextUrl.searchParams.get("includeSaved") === "1";
  const listType = request.nextUrl.searchParams.get("list");
  const pageParam = request.nextUrl.searchParams.get("page") ?? "1";
  const limitParam = request.nextUrl.searchParams.get("limit") ?? "12";
  const page = parseInt(pageParam, 10) || 1;
  const limit = Math.min(parseInt(limitParam, 10) || 12, 48);

  // Handle followers/following list request
  if (listType === "followers" || listType === "following") {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (listType === "followers") {
      const followers = await prisma.follow.findMany({
        where: { followingId: user.id },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarBlobUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const currentUserFollowing = await prisma.follow.findMany({
        where: { followerId: authResult.user.sub },
        select: { followingId: true },
      });
      const followingIds = new Set(
        currentUserFollowing.map((f) => f.followingId),
      );
      const users = followers.map((f) => ({
        ...mapUser(f.follower),
        isFollowing: followingIds.has(f.follower.id),
      }));
      return NextResponse.json({ users });
    } else {
      const following = await prisma.follow.findMany({
        where: { followerId: user.id },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarBlobUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const currentUserFollowing = await prisma.follow.findMany({
        where: { followerId: authResult.user.sub },
        select: { followingId: true },
      });
      const followingIds = new Set(
        currentUserFollowing.map((f) => f.followingId),
      );
      const users = following.map((f) => ({
        ...mapUser(f.following),
        isFollowing: followingIds.has(f.following.id),
      }));
      return NextResponse.json({ users });
    }
  }

  // Normalize username for cache key (case-insensitive)
  const normalizedUsername = username.toLowerCase();
  const cacheKey = cacheKeys.profile(normalizedUsername);
  const requestKey = `${cacheKey}:${page}:${limit}:${includeSaved ? "1" : "0"}`;

  // Fast path: check memory cache first (synchronous, <1ms)
  const memCached = memoryCacheGet<{
    user: ReturnType<typeof mapUser>;
    posts: ReturnType<typeof mapPost>[];
    hasMore: boolean;
  }>(cacheKey);
  if (memCached && page === 1) {
    const isOwn = memCached.user.id === authResult.user.sub;
    // Skip follow check for own profile
    const followCheck = isOwn
      ? null
      : await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: authResult.user.sub,
              followingId: memCached.user.id,
            },
          },
          select: { id: true },
        });
    return withCacheHeaders(
      NextResponse.json(
        {
          user: memCached.user,
          posts: memCached.posts,
          hasMore: memCached.hasMore,
          isOwn,
          isFollowing: isOwn ? false : Boolean(followCheck),
          currentUserId: authResult.user.sub,
        },
        { status: 200 },
      ),
      cacheHeaders.userData,
    );
  }

  // Try Redis cache
  const cached = await cacheGetJson<{
    user: ReturnType<typeof mapUser>;
    posts: ReturnType<typeof mapPost>[];
    hasMore: boolean;
  }>(cacheKey);
  if (cached && page === 1) {
    const isOwn = cached.user.id === authResult.user.sub;
    // Skip follow check for own profile
    const followCheck = isOwn
      ? null
      : await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: authResult.user.sub,
              followingId: cached.user.id,
            },
          },
          select: { id: true },
        });
    return withCacheHeaders(
      NextResponse.json(
        {
          user: cached.user,
          posts: cached.posts,
          hasMore: cached.hasMore,
          isOwn,
          isFollowing: isOwn ? false : Boolean(followCheck),
          currentUserId: authResult.user.sub,
        },
        { status: 200 },
      ),
      cacheHeaders.userData,
    );
  }

  // Deduplicate concurrent requests
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)!;
  }

  const fetchProfile = async () => {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarBlobUrl: true,
        bio: true,
        email: true,
      },
    });
    if (!user) {
      pendingRequests.delete(requestKey);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const isOwnProfile = user.id === authResult.user.sub;

    // Fetch profile stats
    const [followers, following, totalPostsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.post.count({ where: { authorId: user.id } }),
    ]);

    // Fetch posts with pagination
    const skip = (page - 1) * limit;
    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to check for more
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarBlobUrl: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    // Only fetch follow relation if not own profile
    const relation = isOwnProfile
      ? null
      : await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: authResult.user.sub,
              followingId: user.id,
            },
          },
          select: { id: true },
        });

    // Only fetch saved posts if own profile and requested
    let savedPosts: Array<{ post: Awaited<ReturnType<typeof prisma.post.findMany>>[number] }> =
      [];
    if (isOwnProfile && includeSaved) {
      savedPosts = await prisma.savedPost.findMany({
        where: { userId: authResult.user.sub },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarBlobUrl: true,
                },
              },
              _count: { select: { likes: true, comments: true } },
            },
          },
        },
      });
    }

    const payload = {
      user: mapUser({
        ...user,
        followers,
        following,
        posts: totalPostsCount,
      }),
      posts: postsToReturn.map((post) => mapPost(post)),
      hasMore,
    };

    // Cache only for page 1 (subsequent pages not cached for now)
    if (page === 1) {
      memoryCacheSet(cacheKey, payload, 45);
      await cacheSetJson(cacheKey, payload, 60);
    }

    const result = withCacheHeaders(
      NextResponse.json(
        {
          ...payload,
          ...(isOwnProfile && includeSaved
            ? {
                savedPosts: savedPosts.map((item) =>
                  mapPost({ ...item.post, isSaved: true }),
                ),
              }
            : {}),
          isOwn: isOwnProfile,
          isFollowing: Boolean(relation),
          currentUserId: authResult.user.sub,
        },
        { status: 200 },
      ),
      cacheHeaders.userData,
    );

    pendingRequests.delete(requestKey);
    return result;
  };

  const fetchPromise = fetchProfile();
  pendingRequests.set(requestKey, fetchPromise);

  return fetchPromise;
}
