export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarInitial: string;
  avatarGradient: string;
  avatarUrl?: string;
  email?: string;
  isVerified?: boolean;
  followers?: number;
  following?: number;
  posts?: number;
  bio?: string;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  replies?: Comment[];
}

export interface Post {
  id: string;
  user: User;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaLabel: string;
  mediaType: "image" | "video";
  aspectRatio?: "square" | "portrait" | "landscape";
  caption: string;
  tags: string[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
  location?: string;
  createdAt: string;
}

export interface SuggestedUser extends User {
  mutualFriends?: number;
  reason: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
}

export interface Story {
  id: string;
  authorId?: string;
  username: string;
  avatarUrl?: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl?: string;
  createdAt?: string;
  seen: boolean;
}
