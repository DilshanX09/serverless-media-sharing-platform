import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

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
          { content: { contains: search, mode: "insensitive" as const } },
          {
            author: {
              username: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            post: {
              author: {
                username: { contains: search, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
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
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            caption: true,
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true, likes: true },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      comments,
    },
    { status: 200 },
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    commentId?: string;
  };
  if (!body.commentId) {
    return NextResponse.json(
      { error: "commentId is required" },
      { status: 400 },
    );
  }

  await prisma.comment.delete({ where: { id: body.commentId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
