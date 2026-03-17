import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const user = await prisma.user.findUnique({
    where: { id: authResult.user.sub },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarBlobUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
