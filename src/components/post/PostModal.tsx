"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, X, Play, BadgeCheck, Smile, Loader2 } from "lucide-react";
import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import type { Post, Comment } from "@/types";
import { currentUser, mockComments } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";
import CommentItem from "@/components/post/CommentItem";

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
}

export default function PostModal({ post, onClose }: PostModalProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (post) {
      setLiked(post.isLiked ?? false);
      setSaved(post.isSaved ?? false);
      setComments(mockComments);
      setCommentText("");
      setIsVideoPlaying(false);
      setIsEmojiOpen(false);
      setIsMediaLoading(true);
    }
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [post]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!isEmojiOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) {
        setIsEmojiOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isEmojiOpen]);

  if (!post) return null;

  const handleLike = () => {
    setLiked((prev) => !prev);
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
    setIsEmojiOpen(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setCommentText((prev) => `${prev}${emojiData.emoji}`);
    setIsEmojiOpen(false);
    commentInputRef.current?.focus();
  };

  const toggleVideoPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setIsVideoPlaying(true);
      } catch {
        video.muted = true;
        await video.play();
        setIsVideoPlaying(true);
      }
      return;
    }
    video.pause();
    setIsVideoPlaying(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-surface border border-border-mid rounded-3xl w-full max-w-[980px] flex overflow-hidden animate-[modalPop_0.22s_cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ height: "min(92vh, 760px)" }}
      >
        <div className="flex-1 min-w-0 bg-base items-center justify-center relative overflow-hidden hidden md:flex">
          {post.mediaType === "image" ? (
            <Image
              src={post.mediaUrl}
              alt={post.mediaLabel}
              fill
              sizes="(max-width: 768px) 100vw, 980px"
              className="object-contain"
              onLoad={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
            />
          ) : (
            <video
              ref={videoRef}
              src={post.mediaUrl}
              poster={post.thumbnailUrl}
              className="max-w-full max-h-full object-contain"
              controls
              playsInline
              onLoadStart={() => setIsMediaLoading(true)}
              onCanPlay={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
          )}

          <div
            className={[
              "absolute inset-0 flex items-center justify-center transition-opacity duration-200 bg-base/75 backdrop-blur-[1px]",
              isMediaLoading ? "opacity-100" : "opacity-0 pointer-events-none",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-ink text-[13px] font-medium bg-surface/90 border border-border-soft rounded-full px-3 py-2">
              <Loader2 size={14} className="animate-spin" />
              Loading media...
            </div>
          </div>

          {post.mediaType === "video" && (
            <div
              className={[
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isVideoPlaying || isMediaLoading ? "opacity-0 pointer-events-none" : "opacity-100",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={toggleVideoPlayback}
                className="w-16 h-16 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center hover:bg-white/25 transition-colors pointer-events-auto"
              >
                <Play size={26} fill="white" className="text-white ml-0.5" />
              </button>
            </div>
          )}
        </div>

        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col border-l border-border-soft h-full overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-soft flex-shrink-0">
            <Avatar user={post.user} size="sm" ring />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-semibold text-ink">{post.user.username}</span>
                {post.user.isVerified && (
                  <BadgeCheck size={15} className="text-ink-2 fill-ink-3 stroke-base" />
                )}
              </div>
              {post.location && <p className="text-[12px] text-ink-3 mt-0.5">{post.location}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="p-4 pb-3 border-b border-border-soft flex-shrink-0">
            <p className="text-[14px] text-ink-2 leading-relaxed">
              <button type="button" className="font-semibold text-ink mr-1.5 hover:text-brand transition-colors">
                {post.user.username}
              </button>
              {post.caption}
            </p>
            <p className="text-[13px] text-ink-3 mt-1.5">{post.tags.join(" ")}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {comments.map((cmt) => (
                <motion.div
                  key={cmt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <CommentItem comment={cmt} depth={0} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 px-3 py-2 border-t border-border-soft flex-shrink-0">
            <button
              type="button"
              onClick={handleLike}
              className={[
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                liked ? "text-brand bg-brand/10" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              <Heart size={22} strokeWidth={1.8} fill={liked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={() => commentInputRef.current?.focus()}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <MessageCircle size={22} strokeWidth={1.8} />
            </button>
            <button type="button" className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all">
              <Send size={21} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              className={[
                "ml-auto w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                saved ? "text-brand bg-brand/10" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              <Bookmark size={22} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 border-t border-border-soft flex-shrink-0">
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setIsEmojiOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-surface-2 border border-border-soft text-ink-2 hover:text-ink hover:bg-surface-3 transition-all flex items-center justify-center"
                aria-label="Open emoji picker"
              >
                <Smile size={16} />
              </button>
              <AnimatePresence>
                {isEmojiOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-11 left-0 z-20"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      lazyLoadEmojis
                      searchDisabled
                      skinTonesDisabled
                      width={312}
                      height={340}
                      emojiStyle={EmojiStyle.APPLE}
                      previewConfig={{ showPreview: false }}
                      theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-surface-2 border border-border-soft rounded-full px-4 py-2 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-border-strong focus:bg-surface-3 transition-all"
              style={{ fontFamily: "var(--font-inter), Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" }}
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="w-8 h-8 rounded-full bg-surface-2 disabled:opacity-50 text-ink-2 hover:text-ink transition-all flex items-center justify-center"
            >
              <Send size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
