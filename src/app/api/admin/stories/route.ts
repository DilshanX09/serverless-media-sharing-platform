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
  const pageSize = Math.min(toPositiveInt(searchParams.get("pageSize"), 20), 100);
  const search = (searchParams.get("search") ?? "").trim();

  const where = search
    ? {
        OR: [
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
          { mediaType: { equals: search.toUpperCase() as "IMAGE" | "VIDEO" } },
        ],
      }
    : {};

  const [total, stories] = await Promise.all([
    prisma.story.count({ where }),
    prisma.story.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        blobUrl: true,
        mediaType: true,
        createdAt: true,
        expiresAt: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const mappedStories = stories.map((story) => {
    const mediaUrl = (() => {
      try {
        return blobPathToPublicUrl(story.blobUrl);
      } catch {
        return story.blobUrl;
      }
    })();

    return {
      ...story,
      mediaUrl,
    };
  });

  return NextResponse.json(
    {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      stories: mappedStories,
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
    storyId?: string;
  };

  if (!body.storyId) {
    return NextResponse.json({ error: "storyId is required" }, { status: 400 });
  }

  await prisma.story.delete({ where: { id: body.storyId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
