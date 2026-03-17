import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blobPathToPublicUrl } from "@/lib/media";
import { requireAuth } from "@/lib/routeAuth";
import { cacheDelete, cacheGetJson, cacheSetJson } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

interface UpdateProfileBody {
  displayName?: unknown;
  bio?: unknown;
  avatarBlobUrl?: unknown;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }
  const key = cacheKeys.profileMe(authResult.user.sub);
  const cached = await cacheGetJson<{ profile: unknown }>(key);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const [user, followerCount, followingCount, postCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authResult.user.sub },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarBlobUrl: true,
      },
    }),
    prisma.follow.count({ where: { followingId: authResult.user.sub } }),
    prisma.follow.count({ where: { followerId: authResult.user.sub } }),
    prisma.post.count({ where: { authorId: authResult.user.sub } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const payload = {
    profile: {
      ...user,
      avatarUrl: user.avatarBlobUrl ? blobPathToPublicUrl(user.avatarBlobUrl) : null,
      counts: {
        followers: followerCount,
        following: followingCount,
        posts: postCount,
      },
    },
  };
  await cacheSetJson(key, payload, 20);
  return NextResponse.json(payload, { status: 200 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as UpdateProfileBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : undefined;
  const bio = typeof body.bio === "string" ? body.bio.trim() : undefined;
  const avatarBlobUrl = typeof body.avatarBlobUrl === "string" ? body.avatarBlobUrl.trim() : undefined;

  const updated = await prisma.user.update({
    where: { id: authResult.user.sub },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarBlobUrl !== undefined ? { avatarBlobUrl } : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarBlobUrl: true,
    },
  });

  const [followerCount, followingCount, postCount] = await Promise.all([
    prisma.follow.count({ where: { followingId: authResult.user.sub } }),
    prisma.follow.count({ where: { followerId: authResult.user.sub } }),
    prisma.post.count({ where: { authorId: authResult.user.sub } }),
  ]);
  await cacheDelete(
    cacheKeys.profileMe(authResult.user.sub),
    cacheKeys.profile(updated.username),
    cacheKeys.feed(authResult.user.sub)
  );

  return NextResponse.json(
    {
      profile: {
        ...updated,
        avatarUrl: updated.avatarBlobUrl ? blobPathToPublicUrl(updated.avatarBlobUrl) : null,
        counts: {
          followers: followerCount,
          following: followingCount,
          posts: postCount,
        },
      },
    },
    { status: 200 }
  );
}
