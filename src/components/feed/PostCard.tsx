"use client";

import axios from "axios";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  X,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  BadgeCheck,
  Video,
} from "lucide-react";
import type { Post } from "@/types";
import Avatar from "@/components/ui/Avatar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import VideoPlayer from "@/components/ui/VideoPlayer";
import Image from "next/image";
import { playLikeSound, playSendSound } from "@/lib/uiSounds";

interface PostCardProps {
  post: Post;
  onOpenPost: (post: Post) => void;
  animDelay?: string;
  onPostUpdated?: (postId: string, patch: Partial<Post>) => void;
  currentUserId?: string;
  onPostDeleted?: (postId: string) => void;
}

const captionUrlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function renderCaptionWithLinks(text: string) {
  const parts = text.split(captionUrlRegex);
  return parts.map((part, index) => {
    if (!part) return null;
    const isUrl = /^(https?:\/\/|www\.)/i.test(part);
    if (!isUrl) return <span key={`caption-text-${index}`}>{part}</span>;

    const trailing = part.match(/[.,!?;:)\]]+$/)?.[0] ?? "";
    const cleanPart = trailing ? part.slice(0, -trailing.length) : part;
    const href = cleanPart.startsWith("http")
      ? cleanPart
      : `https://${cleanPart}`;

    return (
      <span key={`caption-link-${index}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-blue-500 hover:text-blue-400 underline underline-offset-2 break-all"
          onClick={(event) => event.stopPropagation()}
        >
          {cleanPart}
        </a>
        {trailing}
      </span>
    );
  });
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

export default function PostCard({
  post,
  onOpenPost,
  animDelay,
  onPostUpdated,
  currentUserId,
  onPostDeleted,
}: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likes);
  const [saved, setSaved] = useState(post.isSaved ?? false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(
    post.user.isFollowing ?? false,
  );
  const [editCaption, setEditCaption] = useState(post.caption);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [mediaLoadKey, setMediaLoadKey] = useState(0);
  const mediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likeBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const isOwner = currentUserId === post.user.id;
  const displayTags = useMemo(() => {
    if (post.tags.length > 0) return post.tags;
    const tags = post.caption.match(/#[A-Za-z0-9_]+/g);
    return tags ?? [];
  }, [post.caption, post.tags]);
  const captionWithoutTags = useMemo(
    () =>
      post.caption
        .replace(/#[A-Za-z0-9_]+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim(),
    [post.caption],
  );
  const captionWords = useMemo(
    () => (captionWithoutTags ? captionWithoutTags.split(/\s+/) : []),
    [captionWithoutTags],
  );
  const isCaptionTruncated = captionWords.length > 22;
  const captionPreview = isCaptionTruncated
    ? `${captionWords.slice(0, 22).join(" ")}...`
    : captionWithoutTags;

  useEffect(() => {
    setLiked(post.isLiked ?? false);
    setLikes(post.likes);
    setSaved(post.isSaved ?? false);
    setIsFollowingUser(post.user.isFollowing ?? false);
    setEditCaption(post.caption);
    setIsCaptionExpanded(false);
  }, [
    post.id,
    post.caption,
    post.isLiked,
    post.likes,
    post.isSaved,
    post.user.isFollowing,
  ]);

  useEffect(() => {
    // Reset loading state for new media
    setIsMediaLoading(Boolean(post.mediaUrl));
    setMediaLoadKey((k) => k + 1);
    // Fallback timeout: force hide loading after 8 seconds
    if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
    if (post.mediaUrl) {
      mediaTimeoutRef.current = setTimeout(() => {
        setIsMediaLoading(false);
      }, 8000);
    }
    return () => {
      if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
    };
  }, [post.id, post.mediaUrl, post.mediaType]);

  useEffect(() => {
    if (!isOwnerMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!ownerMenuRef.current?.contains(event.target as Node)) {
        setIsOwnerMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [isOwnerMenuOpen]);

  useEffect(() => {
    return () => {
      if (likeBurstTimeoutRef.current) {
        clearTimeout(likeBurstTimeoutRef.current);
      }
    };
  }, []);

  const triggerLikeBurst = () => {
    setLikeBurstKey((prev) => prev + 1);
    setShowLikeBurst(true);
    if (likeBurstTimeoutRef.current) {
      clearTimeout(likeBurstTimeoutRef.current);
    }
    likeBurstTimeoutRef.current = setTimeout(() => {
      setShowLikeBurst(false);
    }, 820);
  };

  const handleDeletePost = async () => {
    if (!isOwner || isDeleteSubmitting) return;
    setIsDeleteSubmitting(true);
    try {
      await axios.delete(`/api/posts/${post.id}`, { withCredentials: true });
      setIsDeleteConfirmOpen(false);
      onPostDeleted?.(post.id);
      showToast("Post deleted successfully", "success");
    } catch {
      showToast("Failed to delete post", "error");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!isOwner || isUpdateSubmitting) return;
    const trimmed = editCaption.trim();
    if (trimmed === post.caption.trim()) return;
    setIsUpdateSubmitting(true);
    try {
      await axios.patch(
        `/api/posts/${post.id}`,
        { caption: trimmed },
        { withCredentials: true },
      );
      onPostUpdated?.(post.id, {
        caption: trimmed,
        tags: trimmed.match(/#[A-Za-z0-9_]+/g) ?? [],
      });
      setIsEditModalOpen(false);
      showToast("Post updated", "success");
    } catch {
      showToast("Failed to update post", "error");
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  const handleSharePost = async () => {
    const shareUrl = `${window.location.origin}/?postId=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl });
        playSendSound();
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      playSendSound();
      showToast("Link copied to clipboard", "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  const handleLike = async () => {
    if (isLikeSubmitting) return;
    setIsLikeSubmitting(true);
    const optimisticLiked = !liked;
    const optimisticLikes = optimisticLiked
      ? likes + 1
      : Math.max(0, likes - 1);

    if (optimisticLiked) {
      triggerLikeBurst();
      playLikeSound();
    }

    setLiked(optimisticLiked);
    setLikes(optimisticLikes);
    onPostUpdated?.(post.id, {
      isLiked: optimisticLiked,
      likes: optimisticLikes,
    });
    try {
      const response = await axios.post(
        "/api/social/likes/toggle",
        { postId: post.id },
        { withCredentials: true },
      );
      const data = response.data;
      setLiked(data.liked);
      setLikes(data.totalLikes);
      onPostUpdated?.(post.id, { isLiked: data.liked, likes: data.totalLikes });
    } catch {
      setLiked(liked);
      setLikes(likes);
      onPostUpdated?.(post.id, { isLiked: liked, likes });
    } finally {
      setIsLikeSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (isSaveSubmitting) return;
    setIsSaveSubmitting(true);
    const optimisticSaved = !saved;
    setSaved(optimisticSaved);
    onPostUpdated?.(post.id, { isSaved: optimisticSaved });
    try {
      const response = await axios.post(
        "/api/social/saved/toggle",
        { postId: post.id },
        { withCredentials: true },
      );
      const data = response.data;
      setSaved(data.saved);
      onPostUpdated?.(post.id, { isSaved: data.saved });
    } catch {
      setSaved(saved);
      onPostUpdated?.(post.id, { isSaved: saved });
    } finally {
      setIsSaveSubmitting(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || isOwner || isFollowSubmitting) return;
    setIsFollowSubmitting(true);
    const previous = isFollowingUser;
    const optimistic = !previous;
    setIsFollowingUser(optimistic);
    onPostUpdated?.(post.id, {
      user: { ...post.user, isFollowing: optimistic },
    });
    try {
      const response = await axios.post(
        "/api/social/follows/toggle",
        { targetUserId: post.user.id },
        { withCredentials: true },
      );
      const data = response.data as { isFollowing: boolean };
      setIsFollowingUser(data.isFollowing);
      onPostUpdated?.(post.id, {
        user: { ...post.user, isFollowing: data.isFollowing },
      });
      showToast(data.isFollowing ? "Followed" : "Unfollowed", "success");
    } catch {
      setIsFollowingUser(previous);
      onPostUpdated?.(post.id, {
        user: { ...post.user, isFollowing: previous },
      });
      showToast("Failed to update follow", "error");
    } finally {
      setIsFollowSubmitting(false);
    }
  };

  return (
    <article
      className="bg-transparent sm:bg-surface sm:rounded-2xl overflow-hidden mb-0 sm:mb-5 transition-colors animate-fade-up sm:shadow-sm border-b border-border-soft sm:border-0"
      style={animDelay ? { animationDelay: animDelay } : {}}
    >
      {/* Post Header */}
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3">
        <Avatar
          user={post.user}
          size="md"
          onClick={() => setIsProfilePreviewOpen(true)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(`/profile/@${post.user.username}`)}
              className="text-[14px] sm:text-[15px] font-semibold text-ink hover:opacity-70 transition-opacity leading-tight"
            >
              {post.user.username}
            </button>
            {post.user.isVerified && (
              <BadgeCheck
                size={14}
                className="text-blue-500 flex-shrink-0 fill-blue-500 stroke-base"
              />
            )}
            {!isOwner && currentUserId ? (
              <button
                type="button"
                onClick={() => void handleFollowToggle()}
                disabled={isFollowSubmitting}
                className={`text-[11px] font-semibold transition-colors disabled:opacity-60 text-brand hover:text-brand/80`}
              >
                {isFollowSubmitting
                  ? "..."
                  : isFollowingUser
                    ? "Following"
                    : "Follow"}
              </button>
            ) : null}
            <span className="text-[12px] text-ink-3">• {post.createdAt}</span>
          </div>
          <div className="flex items-center min-w-0">
            <span className="text-[12px] sm:text-[13px] text-ink-2 truncate">
              {post.user.displayName}
            </span>
          </div>
        </div>
        {isOwner ? (
          <div className="relative" ref={ownerMenuRef}>
            <button
              type="button"
              onClick={() => setIsOwnerMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
              title="Post options"
              disabled={isDeleteSubmitting || isUpdateSubmitting}
            >
              {isDeleteSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MoreHorizontal size={17} />
              )}
            </button>
            {isOwnerMenuOpen ? (
              <div className="absolute right-0 top-9 z-20 w-[150px] rounded-xl border border-border-soft bg-surface p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerMenuOpen(false);
                    setEditCaption(post.caption);
                    setIsEditModalOpen(true);
                  }}
                  disabled={isUpdateSubmitting}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  <Pencil size={14} />
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerMenuOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  disabled={isDeleteSubmitting}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {isDeleteSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Media */}
      <div
        className="w-full min-h-[200px] bg-black relative overflow-hidden cursor-pointer group flex items-center justify-center"
        onClick={() => onOpenPost(post)}
      >
        {!post.mediaUrl ? (
          <div className="w-full aspect-square flex items-center justify-center bg-surface-2">
            <p className="text-[12px] text-ink-3">Media unavailable</p>
          </div>
        ) : post.mediaType === "image" ? (
          <Image
            key={`img-${post.id}-${mediaLoadKey}`}
            src={post.mediaUrl}
            alt={post.mediaLabel}
            className={[
              "w-full h-auto max-h-[85vh] object-contain",
              isMediaLoading ? "opacity-0" : "opacity-100",
            ].join(" ")}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsMediaLoading(false)}
            onError={() => setIsMediaLoading(false)}
            width={1000}
            height={1000}
          />
        ) : (
          <VideoPlayer
            key={`vid-${post.id}-${mediaLoadKey}`}
            src={post.mediaUrl}
            poster={post.thumbnailUrl}
            className="w-full h-auto max-h-[85vh] object-contain"
            autoPlay
            loop
            muted
            onReady={() => setIsMediaLoading(false)}
            showSeekBar
            showPlayButton
            showMuteButton
          />
        )}
        {isMediaLoading && post.mediaUrl && post.mediaType === "image" ? (
          <div className="absolute inset-0 z-10 bg-surface-2 animate-pulse min-h-[200px]" />
        ) : null}
        {post.mediaType === "video" && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/65 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1">
            <Video size={10} className="sm:w-3 sm:h-3" />
            <span className="hidden sm:inline">Reel</span>
          </div>
        )}
        <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 z-20 hidden sm:block">
          <span className="text-[10px] sm:text-[11px] text-white/90 bg-black/45 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md">
            {post.mediaLabel}
          </span>
        </div>
        {/* Only show "Open" overlay for images on desktop */}
        {post.mediaType === "image" && (
          <div className="hidden sm:flex absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 rounded-lg px-4 py-2 text-[12px] text-white font-semibold">
              Open
            </div>
          </div>
        )}

        {showLikeBurst ? (
          <div
            key={likeBurstKey}
            className="like-burst-layer"
            aria-hidden="true"
          >
            <div className="like-burst-ring" />
            <Heart className="like-burst-core" fill="currentColor" />
            <span
              className="like-burst-particle"
              style={{
                left: "50%",
                top: "46%",
                ["--x" as string]: "-64px",
                ["--y" as string]: "-52px",
                ["--r" as string]: "-18deg",
              }}
            >
              ❤
            </span>
            <span
              className="like-burst-particle"
              style={{
                left: "54%",
                top: "48%",
                ["--x" as string]: "-20px",
                ["--y" as string]: "-78px",
                ["--r" as string]: "-6deg",
              }}
            >
              ❤
            </span>
            <span
              className="like-burst-particle"
              style={{
                left: "47%",
                top: "50%",
                ["--x" as string]: "42px",
                ["--y" as string]: "-62px",
                ["--r" as string]: "12deg",
              }}
            >
              ❤
            </span>
            <span
              className="like-burst-particle"
              style={{
                left: "50%",
                top: "52%",
                ["--x" as string]: "68px",
                ["--y" as string]: "-8px",
                ["--r" as string]: "18deg",
              }}
            >
              ❤
            </span>
            <span
              className="like-burst-particle"
              style={{
                left: "49%",
                top: "50%",
                ["--x" as string]: "28px",
                ["--y" as string]: "56px",
                ["--r" as string]: "8deg",
              }}
            >
              ❤
            </span>
            <span
              className="like-burst-particle"
              style={{
                left: "52%",
                top: "48%",
                ["--x" as string]: "-44px",
                ["--y" as string]: "42px",
                ["--r" as string]: "-14deg",
              }}
            >
              ❤
            </span>
          </div>
        ) : null}
      </div>

      {/* Action Bar */}
      <div className="px-2 sm:px-3 pt-2 flex items-center">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          disabled={isLikeSubmitting}
          className="p-2 transition-transform active:scale-90"
        >
          <Heart
            size={26}
            strokeWidth={1.8}
            className={`transition-colors ${liked ? "text-red-500 fill-red-500" : "text-ink"}`}
            fill={liked ? "currentColor" : "none"}
          />
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="p-2 transition-transform active:scale-90"
        >
          <MessageCircle size={26} strokeWidth={1.8} className="text-ink" />
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() => void handleSharePost()}
          className="p-2 transition-transform active:scale-90"
        >
          <Send size={22} strokeWidth={1.8} className="text-ink" />
        </button>

        {/* Save — right aligned */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaveSubmitting}
          className="ml-auto p-2 transition-transform active:scale-90"
        >
          <Bookmark
            size={26}
            strokeWidth={1.8}
            className={`transition-colors ${saved ? "text-ink fill-ink" : "text-ink"}`}
            fill={saved ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Likes and comments count */}
      <div className="px-4 flex items-center gap-3">
        <p className="text-[14px] font-semibold text-ink">
          {formatCount(likes)} likes
        </p>
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="text-[14px] text-ink font-semibold"
        >
          {formatCount(post.comments)} comments
        </button>
      </div>

      {/* Caption */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-[14px] text-ink leading-relaxed">
          <button
            type="button"
            onClick={() => router.push(`/profile/@${post.user.username}`)}
            className="font-semibold text-ink mr-1 hover:opacity-70 transition-opacity"
          >
            {post.user.username}
          </button>
          <span className="whitespace-pre-wrap text-ink">
            {renderCaptionWithLinks(
              isCaptionExpanded ? post.caption : captionPreview,
            )}
          </span>
        </p>
        {isCaptionTruncated ? (
          <button
            type="button"
            onClick={() => setIsCaptionExpanded((prev) => !prev)}
            className="text-[14px] text-ink-3 hover:text-ink mt-0.5"
          >
            {isCaptionExpanded ? "See less" : "See more"}
          </button>
        ) : null}
        {!isCaptionExpanded && displayTags.length > 0 && (
          <p className="text-[13px] text-brand mt-1">{displayTags.join(" ")}</p>
        )}
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="text-[14px] text-ink-3 mt-1 block"
        >
          {post.comments > 0
            ? `View all ${post.comments} comments`
            : "Be the first to comment"}
        </button>
      </div>

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-border-soft bg-surface shadow-2xl">
            <div className="px-4 py-3 border-b border-border-soft">
              <p className="text-[15px] font-semibold text-ink">Update post</p>
            </div>
            <div className="p-4">
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={5}
                className="w-full bg-base border border-border-soft rounded-xl px-3 py-2 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-border-strong"
                placeholder="Update caption..."
              />
            </div>
            <div className="px-4 pb-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-surface-2 text-[13px] font-semibold text-ink-2 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpdatePost()}
                disabled={isUpdateSubmitting}
                className="px-3 py-2 rounded-xl bg-ink text-base text-[13px] font-semibold disabled:opacity-60"
              >
                {isUpdateSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isProfilePreviewOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfilePreviewOpen(false);
          }}
        >
          <div className="relative w-full max-w-[460px] rounded-2xl border border-border-soft bg-surface p-3 sm:p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsProfilePreviewOpen(false)}
              className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>

            <div className="pt-6 pb-2">
              <p className="text-center text-[15px] font-semibold text-ink">
                {post.user.displayName}
              </p>
              <p className="text-center text-[12px] text-ink-3 mt-0.5">
                @{post.user.username}
              </p>
            </div>

            <div className="mx-auto mt-2 w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] rounded-full overflow-hidden relative bg-base border border-border-soft">
              {post.user.avatarUrl ? (
                <Image
                  src={post.user.avatarUrl}
                  alt={post.user.displayName}
                  fill
                  sizes="(max-width: 640px) 240px, 320px"
                  className="object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${post.user.avatarGradient} flex items-center justify-center`}
                >
                  <span className="text-white font-bold text-6xl sm:text-7xl select-none">
                    {post.user.avatarInitial}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Delete post?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={isDeleteSubmitting}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeletePost()}
      />
    </article>
  );
}
