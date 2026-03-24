import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blobPathToPublicUrl } from "@/lib/media";
import { requireAuth } from "@/lib/routeAuth";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";
import { emitPostUpdated } from "@/lib/socketServer";

interface UpdatePostBody {
  caption?: unknown;
  location?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const { postId } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, author: { select: { username: true } } },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.authorId !== authResult.user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as UpdatePostBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const caption = typeof body.caption === "string" ? body.caption.trim() : null;
  const location = typeof body.location === "string" ? body.location.trim() : null;

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { caption, location },
  });
  const nextCaption = updated.caption ?? "";
  const tags = nextCaption.match(/#[A-Za-z0-9_]+/g) ?? [];
  emitPostUpdated({
    postId,
    caption: nextCaption,
    tags,
  });
  await cacheDelete(
    cacheKeys.feed(post.authorId),
    cacheKeys.profile(post.author.username),
    cacheKeys.profileMe(post.authorId)
  );

  return NextResponse.json(
    {
      post: {
        ...updated,
        publicUrl: blobPathToPublicUrl(updated.blobUrl),
      },
    },
    { status: 200 }
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const { postId } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, author: { select: { username: true } } },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.authorId !== authResult.user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id: postId } });
  await cacheDelete(
    cacheKeys.feed(post.authorId),
    cacheKeys.profile(post.author.username),
    cacheKeys.profileMe(post.authorId),
    cacheKeys.comments(postId)
  );
  return NextResponse.json({ success: true }, { status: 200 });
}
