import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { emitCommentCreated } from "@/lib/socketServer";
import { mapUser, relativeTime } from "@/lib/apiMappers";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface CreateCommentBody {
  postId?: unknown;
  content?: unknown;
  parentId?: unknown;
}

interface DeleteCommentBody {
  commentId?: unknown;
}

const LOCAL_COMMENTS_CACHE_TTL = 15_000;
const localCommentsCache = new Map<string, { comments: ReturnType<typeof mapCommentNode>[]; cachedAt: number }>();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as CreateCommentBody | null;
  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const parentId = typeof body?.parentId === "string" ? body.parentId.trim() : null;

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "content is too long" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true },
    });
    if (!parent || parent.postId !== postId) {
      return NextResponse.json({ error: "Invalid parentId for this post" }, { status: 400 });
    }
  }

  const created = await prisma.comment.create({
    data: {
      postId,
      authorId: authResult.user.sub,
      content,
      parentId,
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
  });

  const totalComments = await prisma.comment.count({ where: { postId } });
  emitCommentCreated({
    postId,
    commentId: created.id,
    parentId: created.parentId,
    actorUserId: authResult.user.sub,
    content: created.content,
    totalComments,
  });
  localCommentsCache.delete(postId);
  await cacheDelete(
    cacheKeys.comments(postId),
    cacheKeys.feed(authResult.user.sub),
    cacheKeys.feed(post.authorId)
  );

  return NextResponse.json(
    {
      comment: mapCommentNode({
        id: created.id,
        content: created.content,
        createdAt: created.createdAt,
        author: created.author,
        replies: [],
      }),
      parentId: created.parentId,
      totalComments,
    },
    { status: 201 }
  );
}

type DbCommentNode = {
  id: string;
  content: string;
  createdAt: Date;
  parentId?: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarBlobUrl: string | null;
  };
  replies: DbCommentNode[];
};

function mapCommentNode(comment: DbCommentNode) {
  return {
    id: comment.id,
    user: mapUser(comment.author),
    text: comment.content,
    createdAt: relativeTime(comment.createdAt),
    likes: 0,
    isLiked: false,
    replies: comment.replies.map(mapCommentNode),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const postId = request.nextUrl.searchParams.get("postId")?.trim() ?? "";
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  const commentLikeModel = (prisma as unknown as { commentLike?: unknown }).commentLike;
  const flattenIds = (nodes: ReturnType<typeof mapCommentNode>[]): string[] =>
    nodes.flatMap((node) => [node.id, ...flattenIds(node.replies ?? [])]);
  const applyLikedState = (
    nodes: ReturnType<typeof mapCommentNode>[],
    likedIds: Set<string>
  ): ReturnType<typeof mapCommentNode>[] =>
    nodes.map((node) => ({
      ...node,
      isLiked: likedIds.has(node.id),
      replies: applyLikedState(node.replies ?? [], likedIds),
    }));

  const cached = localCommentsCache.get(postId);
  if (cached && Date.now() - cached.cachedAt < LOCAL_COMMENTS_CACHE_TTL) {
    if (!commentLikeModel) return NextResponse.json({ comments: cached.comments }, { status: 200 });
    const ids = flattenIds(cached.comments);
    if (!ids.length) return NextResponse.json({ comments: cached.comments }, { status: 200 });
    const myLikes = await (commentLikeModel as {
      findMany: (args: unknown) => Promise<Array<{ commentId: string }>>;
    }).findMany({
      where: { userId: authResult.user.sub, commentId: { in: ids } },
      select: { commentId: true },
    });
    const likedIds = new Set(myLikes.map((item) => item.commentId));
    return NextResponse.json({ comments: applyLikedState(cached.comments, likedIds) }, { status: 200 });
  }

  const rows = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      parentId: true,
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarBlobUrl: true,
        },
      },
    },
  });

  const nodeMap = new Map<string, ReturnType<typeof mapCommentNode>>();
  const roots: ReturnType<typeof mapCommentNode>[] = [];
  for (const row of rows) {
    nodeMap.set(
      row.id,
      mapCommentNode({
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        parentId: row.parentId,
        author: row.author,
        replies: [],
      })
    );
  }
  for (const row of rows) {
    const node = nodeMap.get(row.id);
    if (!node) continue;
    if (!row.parentId) {
      roots.push(node);
      continue;
    }
    const parent = nodeMap.get(row.parentId);
    if (parent) {
      parent.replies = [...(parent.replies ?? []), node];
    } else {
      roots.push(node);
    }
  }

  const commentIds = rows.map((row) => row.id);
  const likeCountByCommentId = new Map<string, number>();
  if (commentLikeModel && commentIds.length > 0) {
    const model = commentLikeModel as {
      findMany: (args: unknown) => Promise<Array<{ commentId: string }>>;
    };
    const allLikes = await model.findMany({
      where: { commentId: { in: commentIds } },
      select: { commentId: true },
    });
    for (const row of allLikes) {
      likeCountByCommentId.set(row.commentId, (likeCountByCommentId.get(row.commentId) ?? 0) + 1);
    }
  }

  const applyLikeCounts = (nodes: ReturnType<typeof mapCommentNode>[]): ReturnType<typeof mapCommentNode>[] =>
    nodes.map((node) => ({
      ...node,
      likes: likeCountByCommentId.get(node.id) ?? 0,
      isLiked: false,
      replies: applyLikeCounts(node.replies ?? []),
    }));

  const basePayload = { comments: applyLikeCounts(roots) };
  const ids = flattenIds(basePayload.comments);
  if (!commentLikeModel || !ids.length) {
    localCommentsCache.set(postId, { comments: basePayload.comments, cachedAt: Date.now() });
    return NextResponse.json(basePayload, { status: 200 });
  }
  const myLikes = await (commentLikeModel as {
    findMany: (args: unknown) => Promise<Array<{ commentId: string }>>;
  }).findMany({
    where: { userId: authResult.user.sub, commentId: { in: ids } },
    select: { commentId: true },
  });
  const likedIds = new Set(myLikes.map((item) => item.commentId));
  const payload = { comments: applyLikedState(basePayload.comments, likedIds) };
  localCommentsCache.set(postId, { comments: basePayload.comments, cachedAt: Date.now() });
  return NextResponse.json(payload, { status: 200 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as DeleteCommentBody | null;
  const commentId = typeof body?.commentId === "string" ? body.commentId.trim() : "";
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      postId: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.authorId !== authResult.user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  const totalComments = await prisma.comment.count({ where: { postId: comment.postId } });
  localCommentsCache.delete(comment.postId);
  await cacheDelete(
    cacheKeys.comments(comment.postId),
    cacheKeys.feed(authResult.user.sub),
    cacheKeys.feed(comment.post.authorId)
  );

  return NextResponse.json({ success: true, commentId, totalComments }, { status: 200 });
}
