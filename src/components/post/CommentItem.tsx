"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { Comment } from "@/types";
import { currentUser } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";

interface CommentItemProps {
  comment: Comment;
  depth?: number;
}

export default function CommentItem({ comment, depth = 0 }: CommentItemProps) {
  const [liked, setLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyFormOpen, setReplyFormOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localReplies, setLocalReplies] = useState<Comment[]>(comment.replies ?? []);

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
    setRepliesOpen(true);
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
            {comment.text}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[13px] text-ink-3">{comment.createdAt}</span>
            <button
              type="button"
              onClick={handleLike}
              className={[
                "flex items-center gap-1 text-[13px] font-semibold transition-colors",
                liked ? "text-red-400" : "text-ink-3 hover:text-ink-3",
              ].join(" ")}
            >
              <Heart size={13} strokeWidth={2} fill={liked ? "currentColor" : "none"} />
              {likeCount > 0 ? likeCount : ""}
            </button>
            {depth === 0 && (
              <button
                type="button"
                onClick={() => setReplyFormOpen((v) => !v)}
                className="text-[13px] font-semibold text-brand/60 hover:text-brand transition-colors"
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
          className="flex items-center gap-1.5 ml-9 mt-2 text-[13px] font-semibold text-brand/70 hover:text-brand transition-colors"
        >
          <span className="w-5 h-px bg-[#333]" />
          {repliesOpen ? "Hide" : `View ${localReplies.length} ${localReplies.length === 1 ? "reply" : "replies"}`}
        </button>
      )}

      {/* Nested replies */}
      {depth === 0 && repliesOpen && (
        <div className="ml-9 mt-1 border-l-2 border-[#2a2a2a] pl-3 space-y-3">
          {localReplies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* Reply form */}
      {replyFormOpen && (
        <div className="flex items-center gap-2 mt-2 ml-9">
          <Avatar user={currentUser} size="xs" />
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
            placeholder={`Reply to ${comment.user.username}…`}
            autoFocus
            className="flex-1 bg-surface-2 border border-border-mid rounded-full px-3 py-1.5 text-[13px] text-ink placeholder-ink-3 outline-none focus:border-brand/40 transition-colors"
          />
          <button
            type="button"
            onClick={submitReply}
            disabled={!replyText.trim()}
            className="text-[12px] font-bold text-brand disabled:text-ink-3 hover:opacity-70 transition-all"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
}
