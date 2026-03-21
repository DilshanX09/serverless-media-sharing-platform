"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { getSocketClient } from "@/lib/socketClient";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  X,
  Play,
  BadgeCheck,
  Loader2,
  Trash2,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import type { Post, Comment, User } from "@/types";
import Avatar from "@/components/ui/Avatar";
import CommentItem from "@/components/post/CommentItem";
import { mapUser } from "@/lib/apiMappers";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CommentInput from "@/components/post/CommentInput";
import VideoPlayer from "@/components/ui/VideoPlayer";

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
  onPostUpdated?: (postId: string, patch: Partial<Post>) => void;
  currentUserId?: string;
  onPostDeleted?: (postId: string) => void;
}

const modalCommentsCache = new Map<
  string,
  { comments: Comment[]; cachedAt: number }
>();
const COMMENTS_CACHE_TTL_MS = 60_000;

export default function PostModal({
  post,
  onClose,
  onPostUpdated,
  currentUserId,
  onPostDeleted,
}: PostModalProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ownerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    const cached = modalCommentsCache.get(post.id);
    if (cached) {
      setComments(cached.comments);
      setIsCommentsLoading(false);
    } else {
      setComments([]);
      setIsCommentsLoading(true);
    }
    setIsVideoPlaying(false);
    setIsMediaLoading(true);
    setIsEditModalOpen(false);
    setEditCaption(post.caption);
    setIsCaptionExpanded(false);
  }, [post?.id]);

  useEffect(() => {
    if (!post) return;
    setLiked(post.isLiked ?? false);
    setSaved(post.isSaved ?? false);
    setLikeCount(post.likes);
    setCommentCount(post.comments);
  }, [post?.comments, post?.id, post?.isLiked, post?.isSaved, post?.likes]);

  const refreshComments = useCallback(
    async (activePostId: string): Promise<number | null> => {
      setIsCommentsLoading(true);
      const cached = modalCommentsCache.get(activePostId);
      if (cached) {
        setComments(cached.comments);
        const countCached = (nodes: Comment[]): number =>
          nodes.reduce(
            (sum, node) => sum + 1 + countCached(node.replies ?? []),
            0,
          );
        const cachedTotal = countCached(cached.comments);
        setCommentCount(cachedTotal);
        onPostUpdated?.(activePostId, { comments: cachedTotal });
        if (Date.now() - cached.cachedAt < COMMENTS_CACHE_TTL_MS) {
          setIsCommentsLoading(false);
          return cachedTotal;
        }
      }
      try {
        const response = await axios.get(
          `/api/social/comments?postId=${encodeURIComponent(activePostId)}`,
          { withCredentials: true },
        );
        const data = response.data as { comments: Comment[] };
        modalCommentsCache.set(activePostId, {
          comments: data.comments,
          cachedAt: Date.now(),
        });
        setComments(data.comments);
        const countAll = (nodes: Comment[]): number =>
          nodes.reduce(
            (sum, node) => sum + 1 + countAll(node.replies ?? []),
            0,
          );
        const total = countAll(data.comments);
        setCommentCount(total);
        onPostUpdated?.(activePostId, { comments: total });
        setIsCommentsLoading(false);
        return total;
      } catch {
        setIsCommentsLoading(false);
        return null;
      }
    },
    [onPostUpdated],
  );

  useEffect(() => {
    if (!post) return;
    void refreshComments(post.id);
  }, [post?.id, refreshComments]);

  useEffect(() => {
    if (!post?.id) return;
    let mounted = true;
    const setupSocket = async () => {
      const socket = await getSocketClient();
      if (!mounted) return;
      socket.emit("room:post:join", { postId: post.id });

      const onLike = (payload: {
        postId: string;
        actorUserId: string;
        totalLikes: number;
      }) => {
        if (
          payload.postId === post.id &&
          payload.actorUserId !== currentUserId
        ) {
          setLikeCount(payload.totalLikes);
        }
      };

      const onComment = (payload: { postId: string; actorUserId: string }) => {
        if (
          payload.postId === post.id &&
          payload.actorUserId !== currentUserId
        ) {
          void refreshComments(post.id);
        }
      };

      socket.on("social:like:toggled", onLike);
      socket.on("conversation:comment:new", onComment);

      return () => {
        socket.off("social:like:toggled", onLike);
        socket.off("conversation:comment:new", onComment);
      };
    };
    void setupSocket();
    return () => {
      mounted = false;
    };
  }, [post?.id, currentUserId, refreshComments]);

  const appendReplyByParentId = useCallback(
    (nodes: Comment[], parentId: string, reply: Comment): Comment[] => {
      return nodes.map((node) => {
        if (node.id === parentId) {
          return { ...node, replies: [...(node.replies ?? []), reply] };
        }
        if (!node.replies || node.replies.length === 0) return node;
        return {
          ...node,
          replies: appendReplyByParentId(node.replies, parentId, reply),
        };
      });
    },
    [],
  );

  const removeCommentById = (nodes: Comment[], targetId: string): Comment[] => {
    return nodes
      .filter((node) => node.id !== targetId)
      .map((node) => ({
        ...node,
        replies: removeCommentById(node.replies ?? [], targetId),
      }));
  };

  const captionWithoutTags = post
    ? post.caption
        .replace(/#[A-Za-z0-9_]+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    : "";
  const captionWords = captionWithoutTags
    ? captionWithoutTags.split(/\s+/)
    : [];
  const isCaptionTruncated = captionWords.length > 22;
  const captionPreview = isCaptionTruncated
    ? `${captionWords.slice(0, 22).join(" ")}...`
    : captionWithoutTags;

  useEffect(() => {
    let mounted = true;
    const loadCurrentUser = async () => {
      try {
        const response = await axios.get("/api/auth/me", {
          withCredentials: true,
        });
        const data = response.data as {
          user: {
            id: string;
            username: string;
            displayName: string;
            avatarBlobUrl?: string | null;
            bio?: string | null;
            email?: string | null;
          };
        };
        if (!mounted) return;
        setCurrentUser(mapUser(data.user));
      } catch {}
    };
    loadCurrentUser();
    return () => {
      mounted = false;
    };
  }, []);

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
    if (!isOwnerMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!ownerMenuRef.current?.contains(event.target as Node)) {
        setIsOwnerMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isOwnerMenuOpen]);

  const handleImageLoaded = useCallback(() => {
    setIsMediaLoading(false);
  }, []);

  const handleVideoLoadStart = useCallback(() => {
    setIsMediaLoading(true);
  }, []);

  const handleVideoCanPlay = useCallback(() => {
    setIsMediaLoading(false);
  }, []);

  const handleVideoPlay = useCallback(() => {
    setIsVideoPlaying(true);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsVideoPlaying(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setIsMediaLoading(false);
  }, []);

  const toggleVideoPlayback = useCallback(async () => {
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
  }, []);

  if (!post) return null;
  const isOwner = currentUserId === post.user.id;

  const handleDeletePost = async () => {
    if (!isOwner || isDeleteSubmitting) return;
    setIsDeleteSubmitting(true);
    try {
      await axios.delete(`/api/posts/${post.id}`, { withCredentials: true });
      setIsDeleteConfirmOpen(false);
      onPostDeleted?.(post.id);
      onClose();
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
      onClose();
      router.refresh();
    } finally {
      setIsUpdateSubmitting(false);
    }
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
    if (!post || isLikeSubmitting) return;
    setIsLikeSubmitting(true);
    const optimisticLiked = !liked;
    const optimisticLikes = optimisticLiked
      ? likeCount + 1
      : Math.max(0, likeCount - 1);
    setLiked(optimisticLiked);
    setLikeCount(optimisticLikes);
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
      const data = response.data as {
        liked: boolean;
        totalLikes: number;
      };
      setLiked(data.liked);
      setLikeCount(data.totalLikes);
      onPostUpdated?.(post.id, { isLiked: data.liked, likes: data.totalLikes });
    } catch {
      setLiked(liked);
      setLikeCount(likeCount);
      onPostUpdated?.(post.id, { isLiked: liked, likes: likeCount });
    } finally {
      setIsLikeSubmitting(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!post || isSaveSubmitting) return;
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
      const data = response.data as { saved: boolean };
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/95 md:bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border-0 md:border md:border-border-soft rounded-none md:rounded-2xl w-full md:max-w-[90vw] lg:max-w-[1200px] h-[100dvh] md:h-[92vh] md:max-h-[850px] flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Header - only visible on mobile */}
        <div className="md:hidden flex items-center gap-2.5 px-3 py-2.5 border-b border-border-soft flex-shrink-0 bg-surface">
          <Avatar
            user={post.user}
            size="sm"
            ring
            onClick={() => {
              onClose();
              router.push(`/profile/@${post.user.username}`);
            }}
            className="cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/profile/@${post.user.username}`);
                }}
                className="text-[14px] font-semibold text-ink hover:opacity-70 transition-opacity text-left"
              >
                {post.user.username}
              </button>
              {post.user.isVerified && (
                <BadgeCheck size={14} className="text-blue-500 fill-blue-500 stroke-base" />
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <MemoizedMediaPane
          post={post}
          isMediaLoading={isMediaLoading}
          isVideoPlaying={isVideoPlaying}
          onImageLoaded={handleImageLoaded}
          onVideoLoadStart={handleVideoLoadStart}
          onVideoCanPlay={handleVideoCanPlay}
          onVideoPlay={handleVideoPlay}
          onVideoPause={handleVideoPause}
          onVideoError={handleVideoError}
          onToggleVideo={toggleVideoPlayback}
          videoRef={videoRef}
        />

        <div className="flex-1 md:flex-none md:w-[380px] lg:w-[420px] flex flex-col md:border-l border-border-soft min-h-0 overflow-hidden bg-surface">
          {/* Desktop Header - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border-soft flex-shrink-0">
            <Avatar
              user={post.user}
              size="sm"
              ring
              onClick={() => {
                onClose();
                router.push(`/profile/@${post.user.username}`);
              }}
              className="cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/profile/@${post.user.username}`);
                  }}
                  className="text-[14px] font-semibold text-ink hover:opacity-70 transition-opacity text-left"
                >
                  {post.user.username}
                </button>
                {post.user.isVerified && (
                  <BadgeCheck
                    size={14}
                    className="text-blue-500 fill-blue-500 stroke-base"
                  />
                )}
                <span className="text-[12px] text-ink-3">• {post.createdAt}</span>
              </div>
              {post.location && (
                <p className="text-[11px] text-ink-3 mt-0.5">{post.location}</p>
              )}
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
            {/* Close button - hidden on mobile (mobile has floating button) */}
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex w-8 h-8 rounded-full items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Caption section */}
          <div className="p-3 sm:p-4 pb-2 sm:pb-3 border-b border-border-soft flex-shrink-0">
            <p className="text-[13px] sm:text-[14px] text-ink leading-relaxed">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/profile/@${post.user.username}`);
                }}
                className="font-semibold text-ink mr-1.5 hover:opacity-70 transition-opacity"
              >
                {post.user.username}
              </button>
              <span className="whitespace-pre-wrap text-ink">
                {isCaptionExpanded ? post.caption : captionPreview}
              </span>
            </p>
            {isCaptionTruncated ? (
              <button
                type="button"
                onClick={() => setIsCaptionExpanded((prev) => !prev)}
                className="text-[12px] text-ink-3 hover:text-ink mt-1"
              >
                {isCaptionExpanded ? "See less" : "See more"}
              </button>
            ) : null}
            {!isCaptionExpanded ? (
              <p className="text-[13px] text-ink-3 mt-1.5">
                {(post.tags.length > 0
                  ? post.tags
                  : (post.caption.match(/#[A-Za-z0-9_]+/g) ?? [])
                ).join(" ")}
              </p>
            ) : null}
          </div>

          {/* Comments section */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
            {isCommentsLoading && comments.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`comment-skeleton-${index}`}
                    className="flex items-start gap-3 animate-pulse"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-3.5 rounded bg-surface-2" />
                        <div className="w-28 h-3.5 rounded bg-surface-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-2.5 rounded bg-surface-2" />
                        <div className="w-12 h-2.5 rounded bg-surface-2" />
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded bg-surface-2 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle size={52} className="text-ink-3/30 mb-4" strokeWidth={1} />
                <p className="text-[16px] font-semibold text-ink">No comments yet</p>
                <p className="text-[14px] text-ink-3 mt-1">Start the conversation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((cmt) => (
                  <CommentItem
                    key={cmt.id}
                    comment={cmt}
                    postId={post.id}
                    depth={0}
                    parentId={null}
                    currentUser={currentUser ?? undefined}
                    onReplyCreated={(totalComments) => {
                      setCommentCount(totalComments);
                      onPostUpdated?.(post.id, { comments: totalComments });
                    }}
                    onCommentDeleted={({ commentId, totalComments }) => {
                      setCommentCount(totalComments);
                      onPostUpdated?.(post.id, { comments: totalComments });
                      setComments((prev) => {
                        const updated = removeCommentById(prev, commentId);
                        modalCommentsCache.set(post.id, {
                          comments: updated,
                          cachedAt: Date.now(),
                        });
                        return updated;
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action bar with inline counts */}
          <div className="flex items-center px-2 py-1.5 border-t border-border-soft flex-shrink-0 bg-surface">
            {/* Like button with count */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => void handleLike()}
                disabled={isLikeSubmitting}
                className="p-2 transition-transform active:scale-90"
              >
                <Heart
                  size={24}
                  strokeWidth={1.8}
                  className={`transition-colors ${liked ? "text-red-500 fill-red-500" : "text-ink"}`}
                  fill={liked ? "currentColor" : "none"}
                />
              </button>
              {likeCount > 0 && (
                <span className="text-[13px] font-semibold text-ink -ml-0.5">{likeCount.toLocaleString()}</span>
              )}
            </div>
            
            {/* Comment button with count */}
            <div className="flex items-center ml-1">
              <button
                type="button"
                className="p-2 transition-transform active:scale-90"
              >
                <MessageCircle size={24} strokeWidth={1.8} className="text-ink" />
              </button>
              {commentCount > 0 && (
                <span className="text-[13px] font-semibold text-ink -ml-0.5">{commentCount.toLocaleString()}</span>
              )}
            </div>
            
            {/* Share button */}
            <button
              type="button"
              onClick={() => void handleSharePost()}
              className="p-2 ml-1 transition-transform active:scale-90"
            >
              <Send size={22} strokeWidth={1.8} className="text-ink -rotate-12" />
            </button>
            
            {/* Save button */}
            <button
              type="button"
              onClick={() => void handleSaveToggle()}
              disabled={isSaveSubmitting}
              className="ml-auto p-2 transition-transform active:scale-90"
            >
              <Bookmark
                size={24}
                strokeWidth={1.8}
                className={`transition-colors ${saved ? "text-ink fill-ink" : "text-ink"}`}
                fill={saved ? "currentColor" : "none"}
              />
            </button>
          </div>

          <CommentInput
            onSubmit={async (text) => {
              if (!post) return;
              try {
                const response = await axios.post(
                  "/api/social/comments",
                  { postId: post.id, content: text },
                  { withCredentials: true },
                );
                const data = response.data as {
                  comment?: Comment;
                  parentId?: string | null;
                  totalComments?: number;
                };
                if (typeof data.totalComments === "number") {
                  setCommentCount(data.totalComments);
                  onPostUpdated?.(post.id, { comments: data.totalComments });
                }
                if (data.comment) {
                  if (data.parentId) {
                    setComments((prev) => {
                      const updated = appendReplyByParentId(
                        prev,
                        data.parentId as string,
                        data.comment as Comment,
                      );
                      modalCommentsCache.set(post.id, {
                        comments: updated,
                        cachedAt: Date.now(),
                      });
                      return updated;
                    });
                  } else {
                    setComments((prev) => {
                      const updated = [...prev, data.comment as Comment];
                      modalCommentsCache.set(post.id, {
                        comments: updated,
                        cachedAt: Date.now(),
                      });
                      return updated;
                    });
                  }
                }
              } catch {}
            }}
          />
        </div>
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
    </div>
  );
}

const MemoizedMediaPane = memo(
  function MemoizedMediaPane({
    post,
    isMediaLoading,
    isVideoPlaying,
    onImageLoaded,
    onVideoLoadStart,
    onVideoCanPlay,
    onVideoPlay,
    onVideoPause,
    onVideoError,
    onToggleVideo,
    videoRef,
  }: {
    post: Post;
    isMediaLoading: boolean;
    isVideoPlaying: boolean;
    onImageLoaded: () => void;
    onVideoLoadStart: () => void;
    onVideoCanPlay: () => void;
    onVideoPlay: () => void;
    onVideoPause: () => void;
    onVideoError: () => void;
    onToggleVideo: () => void;
    videoRef: RefObject<HTMLVideoElement | null>;
  }) {
    return (
      <div className="w-full md:h-full md:flex-1 min-w-0 bg-base flex items-center justify-center relative overflow-hidden flex-shrink-0">
        {post.mediaType === "image" ? (
          <img
            src={post.mediaUrl}
            alt={post.mediaLabel}
            className="w-full h-auto max-h-[60vh] md:max-h-full object-contain"
            onLoad={onImageLoaded}
            onError={onImageLoaded}
          />
        ) : (
          <VideoPlayer
            src={post.mediaUrl}
            poster={post.thumbnailUrl}
            className="w-full h-auto max-h-[60vh] md:max-h-full object-contain"
            autoPlay
            muted
            loop
            onReady={onVideoCanPlay}
            showSeekBar
            showPlayButton
            showMuteButton
          />
        )}

        {isMediaLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2/50">
            <Loader2 size={28} className="animate-spin text-ink-3" />
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.post.id === next.post.id &&
      prev.post.mediaUrl === next.post.mediaUrl &&
      prev.post.thumbnailUrl === next.post.thumbnailUrl &&
      prev.post.mediaType === next.post.mediaType &&
      prev.isMediaLoading === next.isMediaLoading &&
      prev.isVideoPlaying === next.isVideoPlaying
    );
  },
);
