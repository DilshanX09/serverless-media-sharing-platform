import type { Post, Story, SuggestedUser, User } from "@/types";
import { blobPathToPublicUrl } from "@/lib/media";

const gradients = [
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
  "from-neutral-500 to-neutral-700",
  "from-stone-500 to-stone-700",
];

function safeMediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return blobPathToPublicUrl(value);
  } catch {
    return undefined;
  }
}

export function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return gradients[Math.abs(hash) % gradients.length];
}

export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function mapUser(input: {
  id: string;
  username: string;
  displayName: string;
  avatarBlobUrl?: string | null;
  email?: string | null;
  bio?: string | null;
  followers?: number;
  following?: number;
  posts?: number;
}): User {
  const username = input.username.replace(/^@/, "");
  const displayName = input.displayName || username;
  return {
    id: input.id,
    username,
    displayName,
    avatarInitial: displayName[0]?.toUpperCase() ?? "U",
    avatarGradient: getAvatarGradient(input.id),
    avatarUrl: safeMediaUrl(input.avatarBlobUrl),
    email: input.email ?? undefined,
    bio: input.bio ?? undefined,
    followers: input.followers,
    following: input.following,
    posts: input.posts,
  };
}

export function mapSuggestedUser(input: {
  id: string;
  username: string;
  displayName: string;
  avatarBlobUrl?: string | null;
  reason?: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  mutualFriends?: number;
}): SuggestedUser {
  return {
    ...mapUser(input),
    reason: input.reason ?? "Suggested for you",
    isFollowing: input.isFollowing ?? false,
    isFollowedBy: input.isFollowedBy ?? false,
    mutualFriends: input.mutualFriends,
  };
}

export function mapStory(input: {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  blobUrl: string;
  createdAt: Date;
  authorId: string;
  author: { username: string; avatarBlobUrl?: string | null };
}): Story {
  const mediaUrl = safeMediaUrl(input.blobUrl) ?? "";
  return {
    id: input.id,
    authorId: input.authorId,
    username: input.author.username,
    avatarUrl: safeMediaUrl(input.author.avatarBlobUrl),
    mediaType: input.mediaType === "VIDEO" ? "video" : "image",
    mediaUrl,
    thumbnailUrl: input.mediaType === "VIDEO" ? mediaUrl : undefined,
    createdAt: input.createdAt.toISOString(),
    seen: false,
  };
}

export function mapPost(input: {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  blobUrl: string;
  caption: string | null;
  location: string | null;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarBlobUrl: string | null;
  };
  _count?: { likes: number; comments: number };
  isLiked?: boolean;
  isSaved?: boolean;
}): Post {
  const mediaUrl = safeMediaUrl(input.blobUrl) ?? "";
  const caption = input.caption ?? "";
  const tags = caption.match(/#[A-Za-z0-9_]+/g) ?? [];
  return {
    id: input.id,
    user: mapUser(input.author),
    mediaUrl,
    thumbnailUrl: input.mediaType === "VIDEO" ? mediaUrl : undefined,
    mediaLabel: input.mediaType === "VIDEO" ? "Reel" : "Post",
    mediaType: input.mediaType === "VIDEO" ? "video" : "image",
    aspectRatio: input.mediaType === "VIDEO" ? "portrait" : "square",
    caption,
    tags,
    likes: input._count?.likes ?? 0,
    comments: input._count?.comments ?? 0,
    isLiked: input.isLiked ?? false,
    isSaved: input.isSaved ?? false,
    location: input.location ?? undefined,
    createdAt: relativeTime(input.createdAt),
  };
}
