"use client";

import axios from "axios";

import { getSocketClient } from "@/lib/socketClient";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Smile } from "lucide-react";
import twemoji from "twemoji";
import type { Comment, User } from "@/types";
import Avatar from "@/components/ui/Avatar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
  parentId?: string | null;
  currentUser?: User;
  onReplyCreated?: (totalComments: number) => void;
  onCommentDeleted?: (payload: {
    commentId: string;
    parentId: string | null;
    totalComments: number;
  }) => void;
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
  const router = useRouter();
  const [liked, setLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyFormOpen, setReplyFormOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  const [localReplies, setLocalReplies] = useState<Comment[]>(
    comment.replies ?? [],
  );
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const replyEmojiPickerRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "🙏", "❤️", "👍"];

  useEffect(() => {
    setIsMounted(true);
    let mounted = true;
    const setupSocket = async () => {
      const socket = await getSocketClient();
      if (!mounted) return;

      const onCommentLike = (payload: {
        commentId: string;
        totalLikes: number;
        liked: boolean;
        actorUserId?: string;
      }) => {
        if (payload.commentId === comment.id) {
          setLikeCount(payload.totalLikes);
          if (currentUser && payload.actorUserId === currentUser.id) {
            setLiked(payload.liked);
          }
        }
      };
      socket.on("social:comment:like:toggled", onCommentLike);
      return () => {
        socket.off("social:comment:like:toggled", onCommentLike);
      };
    };
    void setupSocket();
    return () => {
      mounted = false;
    };
  }, [comment.id, currentUser]);

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
      const optimisticCount = optimisticLiked
        ? likeCount + 1
        : Math.max(0, likeCount - 1);
      setLiked(optimisticLiked);
      setLikeCount(optimisticCount);
      try {
        const response = await axios.post(
          "/api/social/comments/likes/toggle",
          { commentId: comment.id },
          { withCredentials: true },
        );
        const data = response.data;
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
      const response = await axios.post(
        "/api/social/comments",
        {
          postId,
          parentId: comment.id,
          content: trimmed,
        },
        { withCredentials: true },
      );
      const data = response.data;
      if (typeof data.totalComments === "number")
        onReplyCreated?.(data.totalComments);
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
    if (
      !currentUser ||
      currentUser.id !== comment.user.id ||
      isDeleteSubmitting
    )
      return;
    setIsDeleteSubmitting(true);
    try {
      const response = await axios.delete("/api/social/comments", {
        data: { commentId: comment.id },
        withCredentials: true,
      });
      const data = response.data;
      onCommentDeleted?.({
        commentId: comment.id,
        parentId,
        totalComments: data.totalComments,
      });
      setIsDeleteConfirmOpen(false);
      showToast("Comment deleted", "success");
    } catch {
      showToast("Failed to delete comment", "error");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // Avatar size based on depth
  const avatarSize = depth === 0 ? "sm" : "xs";
  // Max reply depth
  const canReply = depth < 2;

  return (
    <div className="group/comment">
      {/* Main comment row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar
          user={comment.user}
          size={avatarSize}
          onClick={() => router.push(`/profile/@${comment.user.username}`)}
          className="cursor-pointer flex-shrink-0"
        />

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Username + Comment text */}
          <div className="text-[14px] leading-[1.4]">
            <button
              type="button"
              onClick={() => router.push(`/profile/@${comment.user.username}`)}
              className="font-semibold text-ink hover:opacity-70 transition-opacity inline mr-1"
            >
              {comment.user.username}
            </button>
            <span className="text-ink break-words">
              {isMounted ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderEmojiHtml(comment.text),
                  }}
                />
              ) : (
                comment.text
              )}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[12px] text-ink-3">{comment.createdAt}</span>
            {likeCount > 0 && (
              <span className="text-[12px] font-semibold text-ink-3">
                {likeCount} {likeCount === 1 ? "like" : "likes"}
              </span>
            )}
            {canReply && (
              <button
                type="button"
                onClick={() => setReplyFormOpen((v) => !v)}
                className="text-[12px] font-semibold text-ink-3 hover:text-ink transition-colors"
              >
                Reply
              </button>
            )}
            {currentUser?.id === comment.user.id && (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isDeleteSubmitting}
                className="text-[12px] font-semibold text-ink-3 hover:text-red-400 transition-colors disabled:opacity-50 opacity-0 group-hover/comment:opacity-100"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Like button */}
        <button
          type="button"
          onClick={handleLike}
          className="flex-shrink-0 p-1 mt-0.5"
        >
          <Heart
            size={14}
            strokeWidth={2}
            className={`transition-all ${liked ? "text-red-500 fill-red-500 scale-110" : "text-ink-3/50 hover:text-ink-3"}`}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Reply form - inline below comment */}
      <AnimatePresence>
        {replyFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-2 ml-11 pl-1">
              <div className="relative" ref={replyEmojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setReplyEmojiOpen((prev) => !prev)}
                  className="w-6 h-6 rounded-full text-ink-3 hover:text-ink transition-all flex items-center justify-center"
                  aria-label="Add emoji"
                >
                  <Smile size={16} />
                </button>
                <AnimatePresence>
                  {replyEmojiOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-8 left-0 z-20 rounded-xl border border-border-soft bg-surface p-1.5 shadow-lg"
                    >
                      <div className="grid grid-cols-4 gap-0.5">
                        {quickEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onReplyEmojiClick(emoji)}
                            className="w-7 h-7 rounded-lg hover:bg-surface-2 text-[16px] transition-colors"
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
                placeholder={`Reply to @${comment.user.username}...`}
                autoFocus
                className="flex-1 bg-transparent text-[13px] text-ink placeholder-ink-3/60 outline-none"
              />
              <button
                type="button"
                onClick={submitReply}
                disabled={!replyText.trim() || isReplySubmitting}
                className="text-[13px] font-semibold text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-opacity px-1"
              >
                {isReplySubmitting ? "..." : "Post"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View replies toggle */}
      {localReplies.length > 0 && (
        <div className="ml-11 mt-2">
          <button
            type="button"
            onClick={() => setRepliesOpen((v) => !v)}
            className="flex items-center gap-2 text-[12px] font-semibold text-ink-3 hover:text-ink transition-colors group/toggle"
          >
            <span className="w-6 h-[2px] bg-border group-hover/toggle:bg-ink-3 transition-colors" />
            <span>
              {repliesOpen
                ? "Hide replies"
                : `View ${localReplies.length} ${localReplies.length === 1 ? "reply" : "replies"}`}
            </span>
          </button>
        </div>
      )}

      {/* Nested replies */}
      <AnimatePresence>
        {repliesOpen && localReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative ml-4 mt-3">
              {/* Vertical thread line - more visible */}
              <div 
                className="absolute left-[12px] top-0 bottom-0 w-[2px] bg-border rounded-full"
              />

              {/* Replies */}
              <div className="pl-8 space-y-3">
                {localReplies.map((reply) => (
                  <div key={reply.id} className="relative">
                    {/* Horizontal connector line */}
                    <div className="absolute -left-8 top-4 w-6 h-[2px] bg-border rounded-full" />
                    
                    <CommentItem
                      comment={reply}
                      postId={postId}
                      depth={depth + 1}
                      parentId={comment.id}
                      currentUser={currentUser}
                      onReplyCreated={onReplyCreated}
                      onCommentDeleted={(payload) => {
                        if (payload.parentId === comment.id) {
                          setLocalReplies((prev) =>
                            prev.filter((item) => item.id !== payload.commentId),
                          );
                        }
                        onCommentDeleted?.(payload);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
