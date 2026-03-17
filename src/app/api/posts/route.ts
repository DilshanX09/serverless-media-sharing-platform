import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blobPathToPublicUrl, isMediaTypeValue } from "@/lib/media";
import { requireAuth } from "@/lib/routeAuth";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface CreatePostBody {
  blobUrl?: unknown;
  mediaType?: unknown;
  caption?: unknown;
  location?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as CreatePostBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const blobUrl = typeof body.blobUrl === "string" ? body.blobUrl.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType.trim().toUpperCase() : "";
  const caption = typeof body.caption === "string" ? body.caption.trim() : null;
  const location = typeof body.location === "string" ? body.location.trim() : null;

  if (!blobUrl) {
    return NextResponse.json({ error: "blobUrl is required" }, { status: 400 });
  }
  if (!isMediaTypeValue(mediaType)) {
    return NextResponse.json({ error: "mediaType must be IMAGE or VIDEO" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      authorId: authResult.user.sub,
      blobUrl,
      mediaType,
      caption,
      location,
    },
  });
  await cacheDelete(
    cacheKeys.feed(authResult.user.sub),
    cacheKeys.profile(authResult.user.username),
    cacheKeys.profileMe(authResult.user.sub)
  );

  return NextResponse.json(
    {
      post: {
        ...post,
        publicUrl: blobPathToPublicUrl(post.blobUrl),
      },
    },
    { status: 201 }
  );
}
