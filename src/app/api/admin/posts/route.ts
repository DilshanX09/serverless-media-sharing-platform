import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { blobPathToPublicUrl } from "@/lib/media";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const page = toPositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(
    toPositiveInt(searchParams.get("pageSize"), 20),
    100,
  );
  const search = (searchParams.get("search") ?? "").trim();

  const where = search
    ? {
        OR: [
          { caption: { contains: search, mode: "insensitive" as const } },
          {
            author: {
              username: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            author: {
              displayName: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        caption: true,
        mediaType: true,
        blobUrl: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        _count: {
          select: { likes: true, comments: true, savedBy: true },
        },
      },
    }),
  ]);

  const mappedPosts = posts.map((post) => {
    const mediaUrl = (() => {
      try {
        return blobPathToPublicUrl(post.blobUrl);
      } catch {
        return post.blobUrl;
      }
    })();

    return {
      ...post,
      mediaUrl,
    };
  });

  return NextResponse.json(
    {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      posts: mappedPosts,
    },
    { status: 200 },
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const body = (await request.json().catch(() => ({}))) as { postId?: string };
  if (!body.postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  await prisma.post.delete({ where: { id: body.postId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
