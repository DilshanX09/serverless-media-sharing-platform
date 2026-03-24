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
          { username: { contains: search, mode: "insensitive" as const } },
          { displayName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            followers: true,
            following: true,
          },
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
      users,
    },
    { status: 200 },
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: body.userId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
