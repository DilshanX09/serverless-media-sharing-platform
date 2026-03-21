"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import axios from "axios";
import type { User } from "@/types";

interface FollowUser extends User {
  isFollowing?: boolean;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  currentUserId?: string;
}

export default function FollowListModal({
  isOpen,
  onClose,
  userId,
  type,
  currentUserId,
}: FollowListModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [loadingFollowIds, setLoadingFollowIds] = useState<Set<string>>(new Set());

  const loadUsers = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/profile/${userId}?list=${type}`, { withCredentials: true });
      const data = res.data.users as FollowUser[];
      setUsers(data);
      const states: Record<string, boolean> = {};
      data.forEach((u) => {
        states[u.id] = u.isFollowing ?? false;
      });
      setFollowingStates(states);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, userId, type, showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;
    setLoadingFollowIds((prev) => new Set(prev).add(targetUserId));
    try {
      const res = await axios.post(
        "/api/social/follows/toggle",
        { targetUserId },
        { withCredentials: true }
      );
      setFollowingStates((prev) => ({
        ...prev,
        [targetUserId]: res.data.following,
      }));
      showToast(res.data.following ? "Followed" : "Unfollowed", "success");
    } catch {
      showToast("Failed to update follow", "error");
    } finally {
      setLoadingFollowIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleUserClick = (username: string) => {
    onClose();
    router.push(`/profile/@${username}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-surface w-full sm:max-w-sm sm:rounded-xl max-h-[85vh] sm:max-h-[70vh] flex flex-col overflow-hidden sm:border sm:border-border-soft rounded-t-2xl sm:rounded-t-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
            <h2 className="text-[15px] font-semibold text-ink capitalize">{type}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-2 text-ink/60 hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 rounded-full bg-surface-2 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-24 h-3 bg-surface-2 animate-pulse rounded" />
                      <div className="w-16 h-2.5 bg-surface-2 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-ink/50 text-sm">
                No {type} yet
              </div>
            ) : (
              <div className="flex flex-col">
                {users.map((user) => {
                  const isFollowing = followingStates[user.id] ?? false;
                  const isLoadingFollow = loadingFollowIds.has(user.id);
                  const isSelf = user.id === currentUserId;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2/50 transition-colors"
                    >
                      <button
                        onClick={() => handleUserClick(user.username)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <Avatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">
                            {user.username}
                          </div>
                          <div className="text-xs text-ink/50 truncate">
                            {user.displayName}
                          </div>
                        </div>
                      </button>

                      {/* Follow/Unfollow button */}
                      {currentUserId && !isSelf && (
                        <button
                          onClick={() => handleToggleFollow(user.id)}
                          disabled={isLoadingFollow}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            isFollowing
                              ? "bg-surface-2 text-ink hover:bg-surface-3"
                              : "bg-ink text-base hover:opacity-90"
                          } ${isLoadingFollow ? "opacity-50" : ""}`}
                        >
                          {isLoadingFollow ? "..." : isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
