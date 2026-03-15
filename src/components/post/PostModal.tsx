"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Send, Bookmark, X, Play } from "lucide-react";
import { BadgeCheck } from "lucide-react";
import type { Post, Comment } from "@/types";
import { mockComments, currentUser } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";
import CommentItem from "@/components/post/CommentItem";

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

export default function PostModal({ post, onClose }: PostModalProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setLiked(post.isLiked ?? false);
      setLikes(post.likes);
      setSaved(post.isSaved ?? false);
    }
  }, [post]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!post) return null;

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
  };

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    const newComment: Comment = {
      id: `cmt-${Date.now()}`,
      user: currentUser,
      text: trimmed,
      createdAt: "Just now",
      likes: 0,
      isLiked: false,
      replies: [],
    };
    setComments((prev) => [...prev, newComment]);
    setCommentText("");
  };

  const aspectClass =
    post.aspectRatio === "landscape"
      ? "aspect-video"
      : post.aspectRatio === "portrait"
      ? "aspect-[4/5]"
      : "aspect-square";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border-mid rounded-3xl w-full max-w-[960px] max-h-[92vh] flex overflow-hidden animate-[modalPop_0.22s_cubic-bezier(0.34,1.56,0.64,1)]">

        {/* Left — Media */}
        <div className={`flex-1 min-w-0 bg-base items-center justify-center relative overflow-hidden hidden md:flex ${aspectClass}`}>
          <div className="flex flex-col items-center gap-3">
            <span className="text-[96px] drop-shadow-2xl">{post.mediaEmoji}</span>
            <span className="font-mono text-[12px] text-ink-3 bg-black/50 px-3 py-1.5 rounded-full border border-border-soft tracking-wide">
              {post.mediaLabel}
            </span>
          </div>
          {post.mediaType === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Play size={28} fill="white" className="text-white ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Right — Info + Comments */}
        <div className="w-full md:w-[360px] flex-shrink-0 flex flex-col border-l border-border-soft max-h-[92vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-soft flex-shrink-0">
            <Avatar user={post.user} size="sm" ring />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold text-ink">{post.user.username}</span>
                {post.user.isVerified && (
                  <BadgeCheck size={15} className="text-sky-400 fill-sky-500 stroke-[#1a1a1a]" />
                )}
              </div>
              {post.location && (
                <p className="text-[12px] text-ink-3 mt-0.5">📍 {post.location}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Caption */}
            <div className="pb-4 border-b border-border-soft">
              <p className="text-[14px] text-ink-2 leading-relaxed">
                <button type="button" className="font-semibold text-ink mr-1.5 hover:text-brand transition-colors">
                  {post.user.username}
                </button>
                {post.caption}
              </p>
              <p className="text-[13px] text-sky-400/80 mt-1.5">{post.tags.join(" ")}</p>
            </div>

            {/* Stats */}
            <div className="flex gap-5 pb-4 border-b border-border-soft">
              <div>
                <p className="text-[16px] font-bold text-ink">{formatCount(likes)}</p>
                <p className="text-[12px] text-ink-3 mt-0.5">likes</p>
              </div>
              <div>
                <p className="text-[16px] font-bold text-ink">{comments.length}</p>
                <p className="text-[12px] text-ink-3 mt-0.5">comments</p>
              </div>
              <div>
                <p className="text-[16px] font-bold text-ink">{post.createdAt}</p>
                <p className="text-[12px] text-ink-3 mt-0.5">ago</p>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4">
              {comments.map((cmt) => (
                <CommentItem key={cmt.id} comment={cmt} depth={0} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 px-3 py-2.5 border-t border-border-soft flex-shrink-0">
            <button
              type="button"
              onClick={handleLike}
              className={[
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                liked ? "text-red-400 bg-red-500/10" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              <Heart size={21} strokeWidth={1.8} fill={liked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={() => commentInputRef.current?.focus()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <MessageCircle size={21} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <Send size={20} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              className={[
                "ml-auto w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                saved ? "text-brand bg-brand/10" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              <Bookmark size={21} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border-soft flex-shrink-0">
            <Avatar user={currentUser} size="xs" />
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-surface-2 border border-border-soft rounded-full px-4 py-2 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/30 focus:bg-surface-3 transition-all"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="text-[13px] font-bold text-brand disabled:text-ink-3 hover:opacity-70 transition-all"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
