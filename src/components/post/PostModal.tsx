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
  Smile,
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
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
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
  const commentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "🙏", "❤️", "👍"];

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
    setCommentText("");
    setIsVideoPlaying(false);
    setIsEmojiOpen(false);
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
  }, [
    post?.comments,
    post?.id,
    post?.isLiked,
    post?.isSaved,
    post?.likes,
  ]);

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
          { withCredentials: true }
        );
        const data = response.data as { comments: Comment[] };
        modalCommentsCache.set(activePostId, {
        comments: data.comments,
        cachedAt: Date.now(),
      });
      setComments(data.comments);
      const countAll = (nodes: Comment[]): number =>
        nodes.reduce((sum, node) => sum + 1 + countAll(node.replies ?? []), 0);
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

      const onLike = (payload: { postId: string; actorUserId: string; totalLikes: number }) => {
        if (payload.postId === post.id && payload.actorUserId !== currentUserId) {
          setLikeCount(payload.totalLikes);
        }
      };

      const onComment = (payload: { postId: string; actorUserId: string }) => {
        if (payload.postId === post.id && payload.actorUserId !== currentUserId) {
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
    return () => { mounted = false; };
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
        const response = await axios.get("/api/auth/me", { withCredentials: true });
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
    if (!isEmojiOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) {
        setIsEmojiOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isEmojiOpen]);

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
        { withCredentials: true }
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
        { withCredentials: true }
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
        { withCredentials: true }
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

  const submitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !post) return;
    try {
      const response = await axios.post(
        "/api/social/comments",
        { postId: post.id, content: trimmed },
        { withCredentials: true }
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
    setCommentText("");
    setIsEmojiOpen(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setCommentText((prev) => `${prev}${emoji}`);
    setIsEmojiOpen(false);
    commentInputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-stretch md:items-center md:justify-center p-0 md:p-3 lg:p-6 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border-0 md:border md:border-border-mid rounded-none md:rounded-3xl w-full md:max-w-[980px] h-[100dvh] md:h-[92vh] md:max-h-[760px] flex flex-col md:flex-row overflow-hidden animate-[modalPop_0.22s_cubic-bezier(0.34,1.56,0.64,1)]">
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

        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col md:border-l border-border-soft h-full min-h-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 md:border-b border-border-soft flex-shrink-0">
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
                  className="text-[15px] font-semibold text-ink hover:text-brand transition-colors text-left"
                >
                  {post.user.username}
                </button>
                {post.user.isVerified && (
                  <BadgeCheck
                    size={15}
                    className="text-ink-2 fill-ink-3 stroke-base"
                  />
                )}
              </div>
              {post.location && (
                <p className="text-[12px] text-ink-3 mt-0.5">{post.location}</p>
              )}
              <p className="text-[11px] text-ink-3 mt-0.5">{post.createdAt}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <X size={18} strokeWidth={2} />
            </button>
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

          <div className="md:hidden bg-base relative h-[38vh] min-h-[240px] max-h-[48vh] flex-shrink-0">
            {post.mediaType === "image" ? (
              <Image
                src={post.mediaUrl}
                alt={post.mediaLabel}
                fill
                priority={true}
                sizes="100vw"
                className="object-contain"
                onLoad={handleImageLoaded}
                onError={handleImageLoaded}
              />
            ) : (
              <VideoPlayer
                src={post.mediaUrl}
                poster={post.thumbnailUrl}
                className="w-full h-full"
                autoPlay
                muted
                loop
                onReady={handleVideoCanPlay}
                showSeekBar
                showPlayButton
                showMuteButton
              />
            )}
            <div
              className={[
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200 bg-base/75 backdrop-blur-[1px]",
                isMediaLoading
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-ink text-[13px] font-medium bg-surface/90 border border-border-soft rounded-full px-3 py-2">
                <Loader2 size={14} className="animate-spin" />
                Loading media...
              </div>
            </div>
          </div>

          <div className="p-4 pb-3 md:border-b border-border-soft flex-shrink-0">
            <p className="text-[14px] text-ink-2 leading-relaxed">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/profile/@${post.user.username}`);
                }}
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
                className="text-[12px] text-ink-3 hover:text-ink mt-1"
              >
                {isCaptionExpanded ? "See less" : "See more"}
              </button>
            ) : null}
            {!isCaptionExpanded ? (
              <p className="text-[13px] text-ink mt-1.5">
                {(post.tags.length > 0
                  ? post.tags
                  : (post.caption.match(/#[A-Za-z0-9_]+/g) ?? [])
                ).join(" ")}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2 px-4 py-2 md:border-b border-border-soft flex-shrink-0">
            <div className="rounded-xl px-2 py-2 text-left">
              <p className="text-[16px] font-bold text-ink">{likeCount}</p>
              <p className="text-[11px] text-ink-3">Likes</p>
            </div>
            <div className="rounded-xl px-2 py-2 text-left">
              <p className="text-[16px] font-bold text-ink">{commentCount}</p>
              <p className="text-[11px] text-ink-3">Comments</p>
            </div>
            <div className="rounded-xl px-2 py-2 text-left">
              <p className="text-[16px] font-bold text-ink">{saved ? 1 : 0}</p>
              <p className="text-[11px] text-ink-3">Saved</p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 [scrollbar-width:none]">
            {isCommentsLoading && comments.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`comment-skeleton-${index}`}
                    className="flex items-start gap-2.5 animate-pulse"
                  >
                    <div className="w-7 h-7 rounded-full bg-surface-2" />
                    <div className="flex-1 space-y-2">
                      <div className="w-28 h-3 rounded bg-surface-2" />
                      <div className="w-full h-3 rounded bg-surface-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {comments.map((cmt) => (
                  <motion.div
                    key={cmt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <CommentItem
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
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="flex items-center gap-1 px-3 py-2 md:border-t border-border-soft flex-shrink-0 bg-surface">
            <button
              type="button"
              onClick={() => void handleLike()}
              disabled={isLikeSubmitting}
              className={[
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                liked
                  ? "text-brand bg-brand/10"
                  : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              <Heart
                size={22}
                strokeWidth={1.8}
                fill={liked ? "currentColor" : "none"}
              />
            </button>
            <span className="text-[13px] text-ink-3 min-w-[22px]">
              {likeCount}
            </span>
            <button
              type="button"
              onClick={() => commentInputRef.current?.focus()}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <MessageCircle size={22} strokeWidth={1.8} />
            </button>
            <span className="text-[13px] text-ink-3 min-w-[22px]">
              {commentCount}
            </span>
            <button
              type="button"
              onClick={() => void handleSharePost()}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink transition-all"
            >
              <Send size={21} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => void handleSaveToggle()}
              disabled={isSaveSubmitting}
              className={[
                "ml-auto w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                saved
                  ? "text-brand bg-brand/10"
                  : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              <Bookmark
                size={22}
                strokeWidth={1.8}
                fill={saved ? "currentColor" : "none"}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 md:border-t border-border-soft flex-shrink-0 bg-surface pb-[max(12px,env(safe-area-inset-bottom))]">
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
                    className="absolute bottom-11 left-0 z-20 rounded-xl border border-border-soft bg-surface p-2 shadow-xl"
                  >
                    <div className="grid grid-cols-4 gap-1">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
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
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-surface-2 border border-border-soft rounded-full px-4 py-2 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-border-strong focus:bg-surface-3 transition-all"
              style={{
                fontFamily:
                  "var(--font-inter), Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
              }}
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
      <div className="hidden md:flex md:flex-1 min-w-0 h-[42vh] md:h-auto bg-base items-center justify-center relative overflow-hidden">
        {post.mediaType === "image" ? (
          <Image
            src={post.mediaUrl}
            alt={post.mediaLabel}
            fill
            sizes="(max-width: 768px) 100vw, 980px"
            priority={true}
            className="object-contain"
            onLoad={onImageLoaded}
            onError={onImageLoaded}
          />
        ) : (
          <VideoPlayer
            src={post.mediaUrl}
            poster={post.thumbnailUrl}
            className="w-full h-full"
            autoPlay
            muted
            loop
            onReady={onVideoCanPlay}
            showSeekBar
            showPlayButton
            showMuteButton
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
