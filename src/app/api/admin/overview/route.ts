import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if ("response" in adminResult) {
    return adminResult.response;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalPosts,
    totalComments,
    totalStories,
    totalLikes,
    newUsersLast7Days,
    newPostsLast7Days,
    recentUsers,
    recentPosts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.story.count(),
    prisma.like.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
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
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        caption: true,
        mediaType: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: { likes: true, comments: true, savedBy: true },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      admin: {
        session: adminResult.adminUser.session,
      },
      stats: {
        totalUsers,
        totalPosts,
        totalComments,
        totalStories,
        totalLikes,
        newUsersLast7Days,
        newPostsLast7Days,
      },
      recentUsers,
      recentPosts,
    },
    { status: 200 },
  );
}
