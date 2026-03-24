import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPost } from "@/lib/apiMappers";

export async function GET(): Promise<NextResponse> {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarBlobUrl: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  return NextResponse.json({ posts: posts.map((post) => mapPost(post)) }, { status: 200 });
}
