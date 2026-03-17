import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blobPathToPublicUrl } from "@/lib/media";
import { requireAuth } from "@/lib/routeAuth";
import { cacheDelete, cacheGetJson, cacheSetJson } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";
import { isMediaTypeValue } from "@/lib/media";

interface CreateStoryBody {
  blobUrl?: unknown;
  mediaType?: unknown;
}

interface DeleteStoryBody {
  storyId?: unknown;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const now = new Date();
  await prisma.story.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });

  const key = cacheKeys.storiesActive();
  const cached = await cacheGetJson<{ stories: unknown[] }>(key);
  if (cached) {
    const filtered = (cached.stories as Array<{ expiresAt?: string | Date }>).filter((item) => {
      if (!item.expiresAt) return true;
      return new Date(item.expiresAt).getTime() > Date.now();
    });
    return NextResponse.json({ stories: filtered }, { status: 200 });
  }

  const stories = await prisma.story.findMany({
    where: {
      expiresAt: {
        gt: now,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarBlobUrl: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const payload = {
    stories: stories.map((story) => ({
      id: story.id,
      authorId: story.authorId,
      mediaType: story.mediaType,
      blobUrl: story.blobUrl,
      mediaUrl: blobPathToPublicUrl(story.blobUrl),
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      author: {
        ...story.author,
        avatarUrl: story.author.avatarBlobUrl ? blobPathToPublicUrl(story.author.avatarBlobUrl) : null,
      },
    })),
  };
  await cacheSetJson(key, payload, 20);
  return NextResponse.json(payload, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as CreateStoryBody | null;
  const blobUrl = typeof body?.blobUrl === "string" ? body.blobUrl.trim() : "";
  const mediaType = typeof body?.mediaType === "string" ? body.mediaType.trim().toUpperCase() : "";
  if (!blobUrl) {
    return NextResponse.json({ error: "blobUrl is required" }, { status: 400 });
  }
  if (!isMediaTypeValue(mediaType)) {
    return NextResponse.json({ error: "mediaType must be IMAGE or VIDEO" }, { status: 400 });
  }

  const story = await prisma.story.create({
    data: {
      authorId: authResult.user.sub,
      blobUrl,
      mediaType,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarBlobUrl: true },
      },
    },
  });

  await cacheDelete(cacheKeys.storiesActive(), cacheKeys.feed(authResult.user.sub));
  return NextResponse.json(
    {
      story: {
        id: story.id,
        authorId: story.authorId,
        mediaType: story.mediaType,
        blobUrl: story.blobUrl,
        mediaUrl: blobPathToPublicUrl(story.blobUrl),
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
      },
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as DeleteStoryBody | null;
  const storyId = typeof body?.storyId === "string" ? body.storyId.trim() : "";
  if (!storyId) {
    return NextResponse.json({ error: "storyId is required" }, { status: 400 });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, authorId: true },
  });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (story.authorId !== authResult.user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.story.delete({ where: { id: storyId } });
  await cacheDelete(cacheKeys.storiesActive(), cacheKeys.feed(authResult.user.sub));
  return NextResponse.json({ success: true }, { status: 200 });
}
