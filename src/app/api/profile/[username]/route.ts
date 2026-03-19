import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { mapPost, mapUser } from "@/lib/apiMappers";
import { cacheGetJson, cacheSetJson, memoryCacheGet, memoryCacheSet } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) return authResult.response;

  const { username: rawUsername } = await context.params;
  const username = decodeURIComponent(rawUsername).replace(/^@/, "");
  const includeSaved = request.nextUrl.searchParams.get("includeSaved") === "1";
  const key = cacheKeys.profile(username);

  // Fast path: check memory cache first (synchronous, <1ms)
  const memCached = memoryCacheGet<{
    user: ReturnType<typeof mapUser>;
    posts: ReturnType<typeof mapPost>[];
  }>(key);
  if (memCached) {
    const isOwn = memCached.user.id === authResult.user.sub;
    if (!isOwn || !includeSaved) {
      return NextResponse.json(
        { user: memCached.user, posts: memCached.posts, isOwn },
        { status: 200 }
      );
    }
  }

  // Try Redis cache
  const cached = await cacheGetJson<{
    user: ReturnType<typeof mapUser>;
    posts: ReturnType<typeof mapPost>[];
    savedPosts?: ReturnType<typeof mapPost>[];
  }>(key);
  if (cached) {
    const isOwn = cached.user.id === authResult.user.sub;
    if (!isOwn || !includeSaved) {
      return NextResponse.json(
        { user: cached.user, posts: cached.posts, isOwn },
        { status: 200 }
      );
    }
    const savedPosts = await prisma.savedPost.findMany({
      where: { userId: authResult.user.sub },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarBlobUrl: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });
    return NextResponse.json(
      {
        user: cached.user,
        posts: cached.posts,
        savedPosts: savedPosts.map((item) => mapPost({ ...item.post, isSaved: true })),
        isOwn: true,
      },
      { status: 200 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, avatarBlobUrl: true, bio: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const isOwnProfile = user.id === authResult.user.sub;

  const [followers, following, postsCount, posts, relation, savedPosts] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarBlobUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: authResult.user.sub,
          followingId: user.id,
        },
      },
      select: { id: true },
    }),
    isOwnProfile && includeSaved
      ? prisma.savedPost.findMany({
          where: { userId: authResult.user.sub },
          orderBy: { createdAt: "desc" },
          include: {
            post: {
              include: {
                author: { select: { id: true, username: true, displayName: true, avatarBlobUrl: true } },
                _count: { select: { likes: true, comments: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const payload = {
    user: mapUser({
      ...user,
      followers,
      following,
      posts: postsCount,
    }),
    posts: posts.map((post) => mapPost(post)),
  };

  // Cache in both memory and Redis
  memoryCacheSet(key, payload, 20);
  await cacheSetJson(key, payload, 30);

  return NextResponse.json(
    {
      ...payload,
      ...(isOwnProfile && includeSaved ? { savedPosts: savedPosts.map((item) => mapPost({ ...item.post, isSaved: true })) } : {}),
      isOwn: user.id === authResult.user.sub,
      isFollowing: Boolean(relation),
    },
    { status: 200 }
  );
}
