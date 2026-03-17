import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface ToggleSavedBody {
  postId?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) return authResult.response;

  const body = (await request.json().catch(() => null)) as ToggleSavedBody | null;
  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existing = await prisma.savedPost.findUnique({
    where: {
      userId_postId: {
        userId: authResult.user.sub,
        postId,
      },
    },
    select: { id: true },
  });

  let saved: boolean;
  if (existing) {
    await prisma.savedPost.delete({ where: { id: existing.id } });
    saved = false;
  } else {
    await prisma.savedPost.create({
      data: {
        userId: authResult.user.sub,
        postId,
      },
    });
    saved = true;
  }

  await cacheDelete(cacheKeys.feed(authResult.user.sub), cacheKeys.feed(post.authorId));
  return NextResponse.json({ postId, saved }, { status: 200 });
}
