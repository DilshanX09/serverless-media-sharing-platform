import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface ToggleCommentLikeBody {
  commentId?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) return authResult.response;

  const body = (await request.json().catch(() => null)) as ToggleCommentLikeBody | null;
  const commentId = typeof body?.commentId === "string" ? body.commentId.trim() : "";
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (!("commentLike" in prisma)) {
    return NextResponse.json(
      { error: "Comment likes not ready. Run Prisma db push/generate and restart server." },
      { status: 409 }
    );
  }

  const existing = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId: authResult.user.sub,
        commentId,
      },
    },
    select: { id: true },
  });

  let liked: boolean;
  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.commentLike.create({
      data: {
        userId: authResult.user.sub,
        commentId,
      },
    });
    liked = true;
  }

  const totalLikes = await prisma.commentLike.count({ where: { commentId } });
  await cacheDelete(cacheKeys.comments(comment.postId));
  return NextResponse.json({ commentId, liked, totalLikes }, { status: 200 });
}
