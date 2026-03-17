"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Send, Smile } from "lucide-react";
import twemoji from "twemoji";
import type { Comment, User } from "@/types";
import Avatar from "@/components/ui/Avatar";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
  parentId?: string | null;
  currentUser?: User;
  onReplyCreated?: (totalComments: number) => void;
  onCommentDeleted?: (payload: { commentId: string; parentId: string | null; totalComments: number }) => void;
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

export default function CommentItem({
  comment,
  postId,
  depth = 0,
  parentId = null,
  currentUser,
  onReplyCreated,
  onCommentDeleted,
}: CommentItemProps) {
  const [liked, setLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyFormOpen, setReplyFormOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  const [localReplies, setLocalReplies] = useState<Comment[]>(comment.replies ?? []);
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const replyEmojiPickerRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "🙏", "❤️", "👍"];

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

  useEffect(() => {
    setLocalReplies(comment.replies ?? []);
  }, [comment.replies]);

  const handleLike = () => {
    const run = async () => {
      const optimisticLiked = !liked;
      const optimisticCount = optimisticLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      setLiked(optimisticLiked);
      setLikeCount(optimisticCount);
      try {
        const response = await fetch("/api/social/comments/likes/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ commentId: comment.id }),
        });
        if (!response.ok) throw new Error("toggle failed");
        const data = (await response.json()) as { liked: boolean; totalLikes: number };
        setLiked(data.liked);
        setLikeCount(data.totalLikes);
      } catch {
        setLiked(liked);
        setLikeCount(likeCount);
      }
    };
    void run();
  };

  const submitReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !currentUser || isReplySubmitting) return;
    setIsReplySubmitting(true);
    try {
      const response = await fetch("/api/social/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postId,
          parentId: comment.id,
          content: trimmed,
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { comment?: Comment; totalComments?: number };
      if (typeof data.totalComments === "number") onReplyCreated?.(data.totalComments);
      if (data.comment) {
        setLocalReplies((prev) => [...prev, data.comment as Comment]);
      }
      setReplyText("");
      setReplyFormOpen(false);
      setReplyEmojiOpen(false);
      setRepliesOpen(true);
    } finally {
      setIsReplySubmitting(false);
    }
  };

  const onReplyEmojiClick = (emoji: string) => {
    setReplyText((prev) => `${prev}${emoji}`);
    setReplyEmojiOpen(false);
    replyInputRef.current?.focus();
  };

  const handleDelete = async () => {
    if (!currentUser || currentUser.id !== comment.user.id || isDeleteSubmitting) return;
    setIsDeleteSubmitting(true);
    try {
      const response = await fetch("/api/social/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ commentId: comment.id }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { totalComments: number };
      onCommentDeleted?.({
        commentId: comment.id,
        parentId,
        totalComments: data.totalComments,
      });
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleteSubmitting(false);
    }
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
            {currentUser?.id === comment.user.id ? (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isDeleteSubmitting}
                className="text-[13px] font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {isDeleteSubmitting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
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
                <CommentItem
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                  parentId={comment.id}
                  currentUser={currentUser}
                  onReplyCreated={onReplyCreated}
                  onCommentDeleted={(payload) => {
                    if (payload.parentId === comment.id) {
                      setLocalReplies((prev) => prev.filter((item) => item.id !== payload.commentId));
                    }
                    onCommentDeleted?.(payload);
                  }}
                />
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
                  className="absolute bottom-9 left-0 z-20 rounded-xl border border-border-soft bg-surface p-2 shadow-xl"
                >
                  <div className="grid grid-cols-4 gap-1">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onReplyEmojiClick(emoji)}
                        className="w-8 h-8 rounded-lg hover:bg-surface-2 text-[18px]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
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
            disabled={!replyText.trim() || isReplySubmitting}
            className="w-7 h-7 rounded-full bg-surface-2 disabled:opacity-50 text-ink-2 hover:text-ink transition-all flex items-center justify-center"
          >
            <Send size={13} strokeWidth={2.2} />
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title={depth > 0 ? "Delete reply?" : "Delete comment?"}
        description="This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={isDeleteSubmitting}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
