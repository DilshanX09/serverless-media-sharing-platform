"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
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

interface PostCardProps {
  post: Post;
  onOpenPost: (post: Post) => void;
  animDelay?: string;
  onPostUpdated?: (postId: string, patch: Partial<Post>) => void;
  currentUserId?: string;
  onPostDeleted?: (postId: string) => void;
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
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
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
    setEditCaption(post.caption);
    setIsCaptionExpanded(false);
  }, [post.id, post.caption, post.isLiked, post.likes, post.isSaved]);

  useEffect(() => {
    setIsMediaLoading(Boolean(post.mediaUrl));
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

  const handleDeletePost = async () => {
    if (!isOwner || isDeleteSubmitting) return;
    setIsDeleteSubmitting(true);
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setIsDeleteSubmitting(false);
    if (!response.ok) return;
    setIsDeleteConfirmOpen(false);
    onPostDeleted?.(post.id);
  };

  const handleUpdatePost = async () => {
    if (!isOwner || isUpdateSubmitting) return;
    const trimmed = editCaption.trim();
    if (trimmed === post.caption.trim()) return;
    setIsUpdateSubmitting(true);
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ caption: trimmed }),
    });
    setIsUpdateSubmitting(false);
    if (!response.ok) return;
    onPostUpdated?.(post.id, {
      caption: trimmed,
      tags: trimmed.match(/#[A-Za-z0-9_]+/g) ?? [],
    });
    setIsEditModalOpen(false);
    router.refresh();
  };

  const handleSharePost = async () => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {}
  };

  const handleLike = async () => {
    if (isLikeSubmitting) return;
    setIsLikeSubmitting(true);
    const optimisticLiked = !liked;
    const optimisticLikes = optimisticLiked
      ? likes + 1
      : Math.max(0, likes - 1);
    setLiked(optimisticLiked);
    setLikes(optimisticLikes);
    onPostUpdated?.(post.id, {
      isLiked: optimisticLiked,
      likes: optimisticLikes,
    });
    try {
      const response = await fetch("/api/social/likes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id }),
      });
      if (!response.ok) throw new Error("Failed like toggle");
      const data = (await response.json()) as {
        liked: boolean;
        totalLikes: number;
      };
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
      const response = await fetch("/api/social/saved/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id }),
      });
      if (!response.ok) throw new Error("Failed save toggle");
      const data = (await response.json()) as { saved: boolean };
      setSaved(data.saved);
      onPostUpdated?.(post.id, { isSaved: data.saved });
    } catch {
      setSaved(saved);
      onPostUpdated?.(post.id, { isSaved: saved });
    } finally {
      setIsSaveSubmitting(false);
    }
  };

  return (
    <article
      className="bg-surface rounded-2xl overflow-hidden mb-6 transition-colors animate-fade-up shadow-sm"
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
              className="text-[16px] font-semibold text-ink hover:text-brand transition-colors leading-tight"
            >
              {post.user.username}
            </button>
            {post.user.isVerified && (
              <BadgeCheck
                size={16}
                className="text-ink-2 flex-shrink-0 fill-ink-3 stroke-base"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {post.location && (
              <>
                <span className="text-[12px] text-ink-3">{post.location}</span>
                <span className="text-[12px] text-ink-3">·</span>
              </>
            )}
            <span className="text-[12px] text-ink-3">{post.createdAt}</span>
          </div>
        </div>
        {isOwner ? (
          <div className="relative" ref={ownerMenuRef}>
            <button
              type="button"
              onClick={() => setIsOwnerMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
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
        className="w-full min-h-[260px] sm:min-h-[320px] bg-base relative overflow-hidden cursor-pointer group flex items-center justify-center"
        onClick={() => onOpenPost(post)}
      >
        {!post.mediaUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-surface-2">
            <p className="text-[12px] text-ink-3">Media unavailable</p>
          </div>
        ) : post.mediaType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.mediaUrl}
            alt={post.mediaLabel}
            className="w-full h-auto max-h-[68vh] sm:max-h-[78vh] object-contain group-hover:scale-[1.01] transition-transform duration-500"
            loading="lazy"
            onLoad={() => setIsMediaLoading(false)}
            onError={() => setIsMediaLoading(false)}
          />
        ) : (
          <video
            src={post.mediaUrl}
            poster={post.thumbnailUrl}
            className="w-full h-auto max-h-[68vh] sm:max-h-[78vh] object-contain group-hover:scale-[1.01] transition-transform duration-500"
            muted
            autoPlay
            loop
            preload="metadata"
            playsInline
            onLoadedData={() => setIsMediaLoading(false)}
            onCanPlay={() => setIsMediaLoading(false)}
            onError={() => setIsMediaLoading(false)}
          />
        )}
        {isMediaLoading ? (
          <div className="absolute inset-0 z-10 bg-surface-2 animate-pulse flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-surface border border-border-soft px-3 py-1.5">
              <Loader2 size={16} className="animate-spin text-ink-3" />
              <span className="text-[12px] text-ink-3">Loading media...</span>
            </div>
          </div>
        ) : null}
        {post.mediaType === "video" && (
          <div className="absolute top-3 right-3 bg-black/65 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Video size={12} />
            Reel
          </div>
        )}
        <div className="absolute left-3 bottom-3">
          <span className="text-[11px] text-white/90 bg-black/45 px-2.5 py-1 rounded-md">
            {post.mediaLabel}
          </span>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 rounded-lg px-4 py-2 text-[12px] text-white font-semibold">
            Open
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-2 pt-3 flex items-center gap-0.5">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          disabled={isLikeSubmitting}
          className={[
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] font-medium transition-all",
            liked
              ? "text-brand bg-brand/10 hover:bg-brand/15"
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
          onClick={() => void handleSharePost()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
        >
          <Send size={19} strokeWidth={1.8} />
        </button>

        {/* Save — right aligned */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaveSubmitting}
          className={[
            "ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] transition-all",
            saved
              ? "text-brand bg-brand/10 hover:bg-brand/10"
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
        <p className="text-[15px] text-ink-2 leading-relaxed">
          <button
            type="button"
            onClick={() => router.push(`/profile/@${post.user.username}`)}
            className="font-semibold text-ink mr-1.5 hover:text-brand transition-colors"
          >
            {post.user.username}
          </button>
          <span className="whitespace-pre-wrap">
            {isCaptionExpanded ? post.caption : captionPreview}
          </span>
        </p>
        {isCaptionTruncated ? (
          <button
            type="button"
            onClick={() => setIsCaptionExpanded((prev) => !prev)}
            className="text-[13px] text-ink-3 hover:text-ink mt-1"
          >
            {isCaptionExpanded ? "See less" : "See more"}
          </button>
        ) : null}
        {!isCaptionExpanded && displayTags.length > 0 && (
          <p className="text-[13px] text-ink mt-1.5">{displayTags.join(" ")}</p>
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
