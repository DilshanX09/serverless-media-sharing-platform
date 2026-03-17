import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { emitFollowNotification, emitProfileStats } from "@/lib/socketServer";
import { cacheDelete } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface ToggleFollowBody {
  targetUserId?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as ToggleFollowBody | null;
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
  }
  if (targetUserId === authResult.user.sub) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: authResult.user.sub,
        followingId: targetUserId,
      },
    },
    select: { id: true },
  });

  let isFollowing: boolean;
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    isFollowing = false;
  } else {
    await prisma.follow.create({
      data: {
        followerId: authResult.user.sub,
        followingId: targetUserId,
      },
    });
    isFollowing = true;
  }

  const [targetFollowers, actorFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetUserId } }),
    prisma.follow.count({ where: { followerId: authResult.user.sub } }),
  ]);

  emitFollowNotification({
    actorUserId: authResult.user.sub,
    targetUserId,
    isFollowing,
  });
  await Promise.all([emitProfileStats(targetUserId), emitProfileStats(authResult.user.sub)]);
  await cacheDelete(
    cacheKeys.feed(authResult.user.sub),
    cacheKeys.feed(targetUserId),
    cacheKeys.profile(authResult.user.username),
    cacheKeys.profile(target.username),
    cacheKeys.profileMe(authResult.user.sub),
    cacheKeys.profileMe(targetUserId)
  );

  return NextResponse.json(
    {
      targetUserId,
      isFollowing,
      counts: {
        targetFollowers,
        actorFollowing,
      },
    },
    { status: 200 }
  );
}
