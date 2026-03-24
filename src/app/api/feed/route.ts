import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/routeAuth";
import { mapPost, mapStory, mapSuggestedUser, mapUser } from "@/lib/apiMappers";
import { cacheGetJson, cacheSetJson } from "@/lib/cache";
import { cacheKeys } from "@/lib/cacheKeys";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) return authResult.response;

  const userId = authResult.user.sub;
  const key = cacheKeys.feed(userId);
  const cached = await cacheGetJson<{
    currentUser: ReturnType<typeof mapUser>;
    posts: ReturnType<typeof mapPost>[];
    followingPosts: ReturnType<typeof mapPost>[];
    stories: ReturnType<typeof mapStory>[];
    suggestedUsers: ReturnType<typeof mapSuggestedUser>[];
    searchableUsers: ReturnType<typeof mapUser>[];
  }>(key);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const [me, followers, following, postsCount, posts, myFollowing, myFollowers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatarBlobUrl: true, bio: true, email: true },
    }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.post.count({ where: { authorId: userId } }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarBlobUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    }),
  ]);

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const currentUser = mapUser({
    ...me,
    followers,
    following,
    posts: postsCount,
  });
  const postIds = posts.map((post) => post.id);
  const [likedRows, savedRows] = postIds.length
    ? await Promise.all([
        prisma.like.findMany({
          where: { userId: userId, postId: { in: postIds } },
          select: { postId: true },
        }),
        prisma.savedPost.findMany({
          where: { userId: userId, postId: { in: postIds } },
          select: { postId: true },
        }),
      ])
    : [[], []];
  const likedSet = new Set(likedRows.map((row) => row.postId));
  const savedSet = new Set(savedRows.map((row) => row.postId));
  const mappedPosts = posts.map((post) =>
    mapPost({
      ...post,
      isLiked: likedSet.has(post.id),
      isSaved: savedSet.has(post.id),
    })
  );
  const followingSet = new Set(myFollowing.map((row) => row.followingId));
  const allowedStoryAuthorIds = [userId, ...Array.from(followingSet)];
  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: new Date() },
      authorId: { in: allowedStoryAuthorIds },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { username: true, avatarBlobUrl: true } } },
  });
  const followingPosts = mappedPosts.filter((post) => followingSet.has(post.user.id));
  const mappedStories = stories.map((story) => mapStory(story));

  const alreadyFollowingIds = new Set(myFollowing.map((row) => row.followingId));
  const followingIds = myFollowing.map((row) => row.followingId);
  const followerIds = new Set(myFollowers.map((row) => row.followerId));
  const excludedIds = [userId, ...alreadyFollowingIds];
  const suggestionCandidates = await prisma.user.findMany({
    where: { id: { notIn: excludedIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, username: true, displayName: true, avatarBlobUrl: true, createdAt: true },
  });

  const scoredSuggestions = await Promise.all(
    suggestionCandidates.map(async (candidate) => {
      const isFollowedBy = followerIds.has(candidate.id);
      const mutualFriends = followingIds.length
        ? await prisma.follow.count({
            where: {
              followingId: candidate.id,
              followerId: { in: followingIds },
            },
          })
        : 0;
      return {
        candidate,
        isFollowedBy,
        mutualFriends,
      };
    })
  );

  scoredSuggestions.sort((a, b) => {
    if (a.isFollowedBy !== b.isFollowedBy) return a.isFollowedBy ? -1 : 1;
    if (a.mutualFriends !== b.mutualFriends) return b.mutualFriends - a.mutualFriends;
    return b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime();
  });

  const mappedSuggested = scoredSuggestions.slice(0, 8).map(({ candidate, isFollowedBy, mutualFriends }) =>
    mapSuggestedUser({
      id: candidate.id,
      username: candidate.username,
      displayName: candidate.displayName,
      avatarBlobUrl: candidate.avatarBlobUrl,
      isFollowing: false,
      isFollowedBy,
      mutualFriends,
      reason: isFollowedBy
        ? "Follows you"
        : mutualFriends > 0
          ? `${mutualFriends} mutual connection${mutualFriends > 1 ? "s" : ""}`
          : "Suggested for you",
    })
  );
  const searchableUsers = [currentUser, ...mappedSuggested, ...mappedPosts.map((post) => post.user)].filter(
    (value, index, arr) => arr.findIndex((it) => it.id === value.id) === index
  );

  const payload = {
    currentUser,
    posts: mappedPosts,
    followingPosts,
    stories: mappedStories,
    suggestedUsers: mappedSuggested,
    searchableUsers,
  };
  await cacheSetJson(key, payload, 20);
  return NextResponse.json(payload, { status: 200 });
}
