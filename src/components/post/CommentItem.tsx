"use client";

import axios from "axios";

import { getSocketClient } from "@/lib/socketClient";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  postAuthorId: string;
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

const MAX_REPLY_DEPTH = 2;
const INITIAL_VISIBLE_REPLIES = 3;
const emojiFontFamily =
  "Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, sans-serif";

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

function CommentItemInner({
  comment,
  postId,
  postAuthorId,
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
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(
    INITIAL_VISIBLE_REPLIES,
  );
  const [replyFormOpen, setReplyFormOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [displayText, setDisplayText] = useState(comment.text);
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  const [localReplies, setLocalReplies] = useState<Comment[]>(
    comment.replies ?? [],
  );
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const replyEmojiPickerRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "🙏", "❤️", "👍"];

  const canReply = depth < MAX_REPLY_DEPTH;
  const isNested = depth > 0;
  const isPostAuthorComment = comment.user.id === postAuthorId;
  const visibleReplies = useMemo(
    () => localReplies.slice(0, visibleRepliesCount),
    [localReplies, visibleRepliesCount],
  );
  const hasHiddenReplies = localReplies.length > visibleRepliesCount;
  const parsedCommentHtml = useMemo(
    () => renderEmojiHtml(displayText),
    [displayText],
  );

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
    setLiked(comment.isLiked ?? false);
    setLikeCount(comment.likes);
    setDisplayText(comment.text);
    setEditText(comment.text);
    setVisibleRepliesCount(INITIAL_VISIBLE_REPLIES);
  }, [comment.replies, comment.isLiked, comment.likes, comment.text]);

  const handleLike = useCallback(() => {
    const run = async () => {
      const previousLiked = liked;
      const previousLikeCount = likeCount;
      const optimisticLiked = !previousLiked;
      const optimisticCount = optimisticLiked
        ? previousLikeCount + 1
        : Math.max(0, previousLikeCount - 1);
      setLiked(optimisticLiked);
      setLikeCount(optimisticCount);
      try {
        const response = await axios.post(
          "/api/social/comments/likes/toggle",
          { commentId: comment.id },
          { withCredentials: true },
        );
        const data = response.data as { liked: boolean; totalLikes: number };
        setLiked(data.liked);
        setLikeCount(data.totalLikes);
      } catch {
        setLiked(previousLiked);
        setLikeCount(previousLikeCount);
      }
    };
    void run();
  }, [comment.id, likeCount, liked]);

  const submitReply = useCallback(async () => {
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
      setVisibleRepliesCount((prev) => prev + 1);
    } finally {
      setIsReplySubmitting(false);
    }
  }, [
    comment.id,
    currentUser,
    isReplySubmitting,
    onReplyCreated,
    postId,
    replyText,
  ]);

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

  const handleEditSave = useCallback(async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.text.trim() || isEditSubmitting) {
      setIsEditOpen(false);
      return;
    }
    setIsEditSubmitting(true);
    try {
      const response = await axios.patch(
        "/api/social/comments",
        { commentId: comment.id, content: trimmed },
        { withCredentials: true },
      );
      const data = response.data as { content?: string };
      const nextContent = data.content ?? trimmed;
      setDisplayText(nextContent);
      setEditText(nextContent);
      setIsEditOpen(false);
      showToast("Comment updated", "success");
    } catch {
      showToast("Failed to update comment", "error");
    } finally {
      setIsEditSubmitting(false);
    }
  }, [comment, editText, isEditSubmitting, showToast]);

  const avatarSize = depth === 0 ? "sm" : "xs";

  return (
    <div className={`group/comment ${isNested ? "pl-4" : ""}`}>
      <div className="relative">
        {isNested ? (
          <>
            <div className="absolute -left-1 top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-brand/55 via-border-soft/95 to-border-soft/15" />
            <div className="absolute -left-[6px] top-1 bottom-1 w-[10px] rounded-full bg-gradient-to-b from-brand/18 via-transparent to-transparent blur-[2px]" />
            <div className="absolute -left-[2px] top-1 h-[6px] w-[6px] rounded-full bg-brand/45" />
          </>
        ) : null}

        <div className="flex items-start gap-3">
          <Avatar
            user={comment.user}
            size={avatarSize}
            onClick={() => router.push(`/profile/@${comment.user.username}`)}
            className="cursor-pointer flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="group-hover/comment:border-border-soft/70 transition-colors">
              <p className="text-[13px] leading-tight mb-0.5">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/profile/@${comment.user.username}`)
                  }
                  className="font-normal text-ink-2 hover:opacity-70 transition-opacity"
                >
                  @{comment.user.username}
                </button>
                {isPostAuthorComment ? (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-[#212121] px-1.5 py-[2px] text-[10px] font-medium tracking-wide text-brand">
                    Author
                  </span>
                ) : null}
              </p>

              {isEditOpen ? (
                <div className="space-y-2 mt-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border-soft bg-surface px-2.5 py-2 text-[13px] text-ink outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditText(comment.text);
                        setIsEditOpen(false);
                      }}
                      className="text-[11px] font-semibold text-ink-3 hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleEditSave()}
                      disabled={!editText.trim() || isEditSubmitting}
                      className="h-7 px-2.5 rounded-full text-[11px] font-semibold bg-brand/15 text-brand disabled:opacity-40"
                    >
                      {isEditSubmitting ? "..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-ink leading-[1.42] break-words">
                  {isMounted ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: parsedCommentHtml,
                      }}
                    />
                  ) : (
                    displayText
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 mt-1.5 text-[11px]">
              <span className="text-[11px] font-medium text-ink-3">
                {comment.createdAt}
              </span>
              {likeCount > 0 ? (
                <span className="text-[11px] font-semibold text-ink-3">
                  {likeCount} {likeCount === 1 ? "like" : "likes"}
                </span>
              ) : null}
              {canReply ? (
                <button
                  type="button"
                  onClick={() => setReplyFormOpen((v) => !v)}
                  className="text-[11px] font-semibold text-ink-3 hover:text-ink transition-colors"
                >
                  Reply
                </button>
              ) : null}
              {currentUser?.id === comment.user.id ? (
                <button
                  type="button"
                  onClick={() => setIsEditOpen((prev) => !prev)}
                  className="text-[11px] font-semibold text-ink-3 hover:text-ink transition-colors"
                >
                  Edit
                </button>
              ) : null}
              {currentUser?.id === comment.user.id ? (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isDeleteSubmitting}
                  className="text-[11px] font-semibold text-ink-3 hover:text-red-400 transition-colors disabled:opacity-50 opacity-0 group-hover/comment:opacity-100"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLike}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-surface-2 transition-colors"
          >
            <Heart
              size={16}
              strokeWidth={2}
              className={`transition-all ${liked ? "text-red-500 fill-red-500 scale-110" : "text-ink-3/60 hover:text-ink-3"}`}
              fill={liked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      {/* Reply form - inline below comment */}
      <AnimatePresence>
        {replyFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-visible"
          >
            <div className="mt-2 ml-11 pl-1">
              <div className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-2/70 px-2 py-1.5">
                <div className="relative" ref={replyEmojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setReplyEmojiOpen((prev) => !prev)}
                    className="w-7 h-7 rounded-full text-ink-3 hover:text-ink hover:bg-surface-2 transition-all flex items-center justify-center"
                    aria-label="Add emoji"
                  >
                    <Smile size={15} />
                  </button>
                  <AnimatePresence>
                    {replyEmojiOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-9 left-0 z-40 rounded-xl border border-border-soft bg-surface p-1.5 shadow-lg"
                        style={{ fontFamily: emojiFontFamily }}
                      >
                        <div className="grid grid-cols-4 gap-0.5">
                          {quickEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReplyEmojiClick(emoji)}
                              className="w-7 h-7 rounded-lg hover:bg-surface-2 text-[17px] leading-none transition-colors"
                              style={{ fontFamily: emojiFontFamily }}
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
                  style={{
                    fontFamily:
                      "var(--font-inter), Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, sans-serif",
                  }}
                />
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={!replyText.trim() || isReplySubmitting}
                  className="h-7 px-2.5 rounded-full text-[12px] font-semibold bg-brand/15 text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {isReplySubmitting ? "..." : "Send"}
                </button>
              </div>
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
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-2/70 text-[11px] font-semibold text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors group/toggle"
          >
            <span className="w-5 h-px bg-border bg-ink-3 transition-colors" />
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
            <div className="relative mt-3 rounded-2xl bg-surface-2/35 px-2.5 py-2">
              <div className="pl-4 space-y-3">
                {visibleReplies.map((reply) => (
                  <div key={reply.id} className="relative">
                    <CommentItem
                      comment={reply}
                      postId={postId}
                      postAuthorId={postAuthorId}
                      depth={depth + 1}
                      parentId={comment.id}
                      currentUser={currentUser}
                      onReplyCreated={onReplyCreated}
                      onCommentDeleted={(payload) => {
                        if (payload.parentId === comment.id) {
                          setLocalReplies((prev) =>
                            prev.filter(
                              (item) => item.id !== payload.commentId,
                            ),
                          );
                        }
                        onCommentDeleted?.(payload);
                      }}
                    />
                  </div>
                ))}

                {hasHiddenReplies ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleRepliesCount(
                        (prev) => prev + INITIAL_VISIBLE_REPLIES,
                      )
                    }
                    className="ml-1 text-[11px] font-semibold text-ink-3 hover:text-ink transition-colors"
                  >
                    View more replies
                  </button>
                ) : null}
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

function areEqual(prev: CommentItemProps, next: CommentItemProps): boolean {
  return (
    prev.comment === next.comment &&
    prev.postId === next.postId &&
    prev.postAuthorId === next.postAuthorId &&
    prev.depth === next.depth &&
    prev.parentId === next.parentId &&
    prev.currentUser?.id === next.currentUser?.id
  );
}

const CommentItem = memo(CommentItemInner, areEqual);

export default CommentItem;
