import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { emitLikeToggled } from "@/lib/socketServer";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface ToggleLikeBody {
  postId?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as ToggleLikeBody | null;
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

  const existing = await prisma.like.findUnique({
    where: {
      userId_postId: {
        userId: authResult.user.sub,
        postId,
      },
    },
    select: { id: true },
  });

  let liked: boolean;
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.like.create({
      data: {
        userId: authResult.user.sub,
        postId,
      },
    });
    liked = true;
  }

  const totalLikes = await prisma.like.count({ where: { postId } });
  emitLikeToggled({
    postId,
    actorUserId: authResult.user.sub,
    ownerUserId: post.authorId,
    liked,
    totalLikes,
  });
  await cacheDelete(cacheKeys.feed(authResult.user.sub), cacheKeys.feed(post.authorId));

  return NextResponse.json({ postId, liked, totalLikes }, { status: 200 });
}
