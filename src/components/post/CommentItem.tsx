"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Send, Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import twemoji from "twemoji";
import type { Comment } from "@/types";
import { currentUser } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";

interface CommentItemProps {
  comment: Comment;
  depth?: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmojiHtml(text: string): string {
  return twemoji.parse(escapeHtml(text), {
    folder: "svg",
    ext: ".svg",
    className: "comment-emoji",
  });
}

export default function CommentItem({ comment, depth = 0 }: CommentItemProps) {
  const [liked, setLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyFormOpen, setReplyFormOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  const [localReplies, setLocalReplies] = useState<Comment[]>(comment.replies ?? []);
  const [isMounted, setIsMounted] = useState(false);
  const replyEmojiPickerRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!replyEmojiOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!replyEmojiPickerRef.current?.contains(event.target as Node)) {
        setReplyEmojiOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [replyEmojiOpen]);

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const submitReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    const newReply: Comment = {
      id: `reply-${Date.now()}`,
      user: currentUser,
      text: trimmed,
      createdAt: "Just now",
      likes: 0,
      isLiked: false,
      replies: [],
    };
    setLocalReplies((prev) => [...prev, newReply]);
    setReplyText("");
    setReplyFormOpen(false);
    setReplyEmojiOpen(false);
    setRepliesOpen(true);
  };

  const onReplyEmojiClick = (emojiData: EmojiClickData) => {
    setReplyText((prev) => `${prev}${emojiData.emoji}`);
    setReplyEmojiOpen(false);
    replyInputRef.current?.focus();
  };

  return (
    <div className={depth > 0 ? "ml-9 mt-3" : ""}>
      <div className="flex gap-2.5">
        <Avatar user={comment.user} size="xs" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-ink-2 leading-relaxed">
            <button
              type="button"
              className="font-semibold text-ink mr-1.5 hover:text-brand transition-colors"
            >
              {comment.user.username}
            </button>
            {isMounted ? (
              <span
                dangerouslySetInnerHTML={{ __html: renderEmojiHtml(comment.text) }}
              />
            ) : (
              <span>{comment.text}</span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[13px] text-ink-3">{comment.createdAt}</span>
            <button
              type="button"
              onClick={handleLike}
              className={[
                "flex items-center gap-1 text-[13px] font-semibold transition-colors",
                liked ? "text-brand" : "text-ink-3 hover:text-ink-3",
              ].join(" ")}
            >
              <Heart size={13} strokeWidth={2} fill={liked ? "currentColor" : "none"} />
              {likeCount > 0 ? likeCount : ""}
            </button>
            {depth === 0 && (
              <button
                type="button"
                onClick={() => setReplyFormOpen((v) => !v)}
                className="text-[13px] font-semibold text-ink-3 hover:text-ink transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggle replies */}
      {depth === 0 && localReplies.length > 0 && (
        <button
          type="button"
          onClick={() => setRepliesOpen((v) => !v)}
          className="flex items-center gap-1.5 ml-9 mt-2 text-[13px] font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span className="w-5 h-px bg-border-mid" />
          {repliesOpen ? "Hide" : `View ${localReplies.length} ${localReplies.length === 1 ? "reply" : "replies"}`}
        </button>
      )}

      {/* Nested replies */}
      {depth === 0 && repliesOpen && (
        <div className="ml-9 mt-1 border-l-2 border-border-soft pl-3 space-y-3">
          <AnimatePresence initial={false}>
            {localReplies.map((reply) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
              >
                <CommentItem comment={reply} depth={depth + 1} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Reply form */}
      {replyFormOpen && (
        <div className="flex items-center gap-2 mt-2 ml-9">
          <div className="relative" ref={replyEmojiPickerRef}>
            <button
              type="button"
              onClick={() => setReplyEmojiOpen((prev) => !prev)}
              className="w-7 h-7 rounded-full bg-surface-2 border border-border-soft text-ink-2 hover:text-ink hover:bg-surface-3 transition-all flex items-center justify-center"
              aria-label="Open reply emoji picker"
            >
              <Smile size={13} />
            </button>
            <AnimatePresence>
              {replyEmojiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-9 left-0 z-20"
                >
                  <EmojiPicker
                    onEmojiClick={onReplyEmojiClick}
                    lazyLoadEmojis
                    searchDisabled
                    skinTonesDisabled
                    width={290}
                    height={320}
                    emojiStyle={EmojiStyle.APPLE}
                    previewConfig={{ showPreview: false }}
                    theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <input
            ref={replyInputRef}
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
            placeholder={`Reply to ${comment.user.username}…`}
            autoFocus
            className="flex-1 bg-surface-2 border border-border-mid rounded-full px-3 py-1.5 text-[13px] text-ink placeholder-ink-3 outline-none focus:border-border-strong transition-colors"
            style={{ fontFamily: "var(--font-inter), Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" }}
          />
          <button
            type="button"
            onClick={submitReply}
            disabled={!replyText.trim()}
            className="w-7 h-7 rounded-full bg-surface-2 disabled:opacity-50 text-ink-2 hover:text-ink transition-all flex items-center justify-center"
          >
            <Send size={13} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}
