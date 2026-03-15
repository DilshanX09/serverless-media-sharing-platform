"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  BadgeCheck,
  Video,
  UserPlus,
} from "lucide-react";
import type { Post } from "@/types";
import Avatar from "@/components/ui/Avatar";

interface PostCardProps {
  post: Post;
  onOpenPost: (post: Post) => void;
  animDelay?: string;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

export default function PostCard({ post, onOpenPost, animDelay }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likes);
  const [saved, setSaved] = useState(post.isSaved ?? false);
  const [following, setFollowing] = useState(false);
  const router = useRouter();

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
  };

  const aspectClass =
    post.aspectRatio === "landscape"
      ? "aspect-video"
      : post.aspectRatio === "portrait"
      ? "aspect-[4/5]"
      : "aspect-square";

  return (
    <article
      className="bg-surface border border-border-soft rounded-2xl overflow-hidden mb-5 hover:border-border-mid transition-colors animate-fade-up"
      style={animDelay ? { animationDelay: animDelay } : {}}
    >
      {/* Post Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Avatar
          user={post.user}
          size="md"
          onClick={() => router.push(`/profile/@${post.user.username}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/profile/@${post.user.username}`)}
              className="text-[15px] font-semibold text-ink hover:text-brand transition-colors leading-tight"
            >
              {post.user.username}
            </button>
            {post.user.isVerified && (
              <BadgeCheck size={16} className="text-sky-400 flex-shrink-0 fill-sky-500 stroke-[#1a1a1a]" />
            )}
            <span className="text-[13px] text-ink-3 mx-0.5">·</span>
            <button
              type="button"
              onClick={() => setFollowing((f) => !f)}
              className={[
                "flex items-center gap-1 text-[13px] font-semibold transition-all",
                following
                  ? "text-ink-3"
                  : "text-brand hover:text-brand/80",
              ].join(" ")}
            >
              {!following && <UserPlus size={13} strokeWidth={2.5} />}
              {following ? "Following" : "Follow"}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {post.location && (
              <>
                <span className="text-[13px] text-ink-3">{post.location}</span>
                <span className="text-[13px] text-ink-3">·</span>
              </>
            )}
            <span className="text-[13px] text-ink-3">{post.createdAt}</span>
          </div>
        </div>
        <button
          type="button"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink-2 transition-all"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Media */}
      <div
        className={`w-full bg-base relative overflow-hidden cursor-pointer group ${aspectClass}`}
        onClick={() => onOpenPost(post)}
      >
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 group-hover:scale-[1.02] transition-transform duration-500">
          <span className="text-7xl drop-shadow-2xl">{post.mediaEmoji}</span>
          <span className="font-mono text-[13px] text-ink-3 bg-black/40 px-3 py-1 rounded-full border border-border-soft tracking-wide">
            {post.mediaLabel}
          </span>
        </div>
        {post.mediaType === "video" && (
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[12px] font-bold px-2.5 py-1 rounded-lg border border-border-mid flex items-center gap-1.5">
            <Video size={12} />
            VIDEO
          </div>
        )}
        {/* Overlay hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-xl px-5 py-2.5 text-[13px] text-white font-semibold border border-border-mid">
            View post
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-2 pt-3 flex items-center gap-0.5">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          className={[
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] font-medium transition-all",
            liked
              ? "text-red-400 bg-red-500/10 hover:bg-red-500/15"
              : "text-ink-3 hover:bg-surface-2 hover:text-ink",
          ].join(" ")}
        >
          <Heart
            size={20}
            strokeWidth={1.8}
            className="transition-all"
            fill={liked ? "currentColor" : "none"}
          />
          <span>{formatCount(likes)}</span>
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
        >
          <MessageCircle size={20} strokeWidth={1.8} />
          <span>{formatCount(post.comments)}</span>
        </button>

        {/* Share */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
        >
          <Send size={19} strokeWidth={1.8} />
        </button>

        {/* Save — right aligned */}
        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          className={[
            "ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] transition-all",
            saved
              ? "text-brand bg-brand/10 hover:bg-[rgba(232,255,71,0.12)]"
              : "text-ink-3 hover:bg-surface-2 hover:text-ink",
          ].join(" ")}
        >
          <Bookmark
            size={20}
            strokeWidth={1.8}
            fill={saved ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Caption */}
      <div className="px-4 pt-2 pb-4">
        <p className="text-[14px] text-ink-2 leading-relaxed">
          <button
            type="button"
            onClick={() => router.push(`/profile/@${post.user.username}`)}
            className="font-semibold text-ink mr-1.5 hover:text-brand transition-colors"
          >
            {post.user.username}
          </button>
          {post.caption}
        </p>
        {post.tags.length > 0 && (
          <p className="text-[13px] text-sky-400/80 mt-1.5">{post.tags.join(" ")}</p>
        )}
        {post.comments > 0 && (
          <button
            type="button"
            onClick={() => onOpenPost(post)}
            className="text-[13px] text-ink-3 mt-2 hover:text-ink-3 transition-colors block"
          >
            View all {post.comments} comments
          </button>
        )}
      </div>
    </article>
  );
}
