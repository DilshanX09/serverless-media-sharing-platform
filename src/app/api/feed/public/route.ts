import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPost } from "@/lib/apiMappers";
import { cacheGetJson, cacheSetJson, memoryCacheGet, memoryCacheSet } from "@/lib/cache";
import { withCacheHeaders, cacheHeaders } from "@/lib/cacheHeaders";

const PUBLIC_FEED_CACHE_KEY = "feed:public";

// Request deduplication
let pendingRequest: Promise<NextResponse> | null = null;

export async function GET(): Promise<NextResponse> {
  // Check memory cache first
  const memCached = memoryCacheGet<{
    posts: ReturnType<typeof mapPost>[];
  }>(PUBLIC_FEED_CACHE_KEY);
  if (memCached) {
    return withCacheHeaders(
      NextResponse.json(memCached, { status: 200 }),
      cacheHeaders.public,
    );
  }

  // Check Redis cache
  const cached = await cacheGetJson<typeof memCached>(PUBLIC_FEED_CACHE_KEY);
  if (cached) {
    memoryCacheSet(PUBLIC_FEED_CACHE_KEY, cached, 50);
    return withCacheHeaders(
      NextResponse.json(cached, { status: 200 }),
      cacheHeaders.public,
    );
  }

  // Deduplicate concurrent requests
  if (pendingRequest) {
    return pendingRequest;
  }

  const fetchFeed = async () => {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarBlobUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const payload = { posts: posts.map((post) => mapPost(post)) };

    // Cache for 60 seconds (public data can be cached longer)
    await cacheSetJson(PUBLIC_FEED_CACHE_KEY, payload, 60);
    memoryCacheSet(PUBLIC_FEED_CACHE_KEY, payload, 55);

    return withCacheHeaders(
      NextResponse.json(payload, { status: 200 }),
      cacheHeaders.public,
    );
  };

  pendingRequest = fetchFeed().finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}
