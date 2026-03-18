"use client";

import axios from "axios";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import StoriesBar from "@/components/feed/StoriesBar";
import PostCard from "@/components/feed/PostCard";
import PostModal from "@/components/post/PostModal";
import type { Post, Story, SuggestedUser, User } from "@/types";
import { getSocketClient } from "@/lib/socketClient";

interface FeedResponse {
  currentUser: User;
  posts: Post[];
  followingPosts: Post[];
  stories: Story[];
  suggestedUsers: SuggestedUser[];
  searchableUsers: User[];
}

const FEED_CACHE_KEY = "mini_insta_feed_cache_v1";

export default function HomePage() {
  const router = useRouter();
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [searchableUsers, setSearchableUsers] = useState<User[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [activeFeedTab, setActiveFeedTab] = useState<"forYou" | "following">("forYou");
  const handleSuggestionFollowed = (userId: string) => {
    setSuggestedUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  const loadFeed = useCallback(async () => {
    try {
      const response = await axios.get("/api/feed", { withCredentials: true });
      const data = response.data as FeedResponse;
      setPosts(data.posts);
      setFollowingPosts(data.followingPosts ?? []);
      setStories(data.stories);
      setCurrentUser(data.currentUser);
      setSuggestedUsers(data.suggestedUsers);
      setSearchableUsers(data.searchableUsers);
      setIsGuest(false);
      try {
        window.sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify(data));
      } catch {}
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const guestResponse = await axios.get("/api/feed/public", { withCredentials: true });
          const guestData = guestResponse.data as { posts: Post[] };
          setPosts(guestData.posts);
          setFollowingPosts([]);
          setStories([]);
          setCurrentUser(null);
          setSuggestedUsers([]);
          setSearchableUsers([]);
          setIsGuest(true);
          setActiveFeedTab("forYou");
          try {
            window.sessionStorage.removeItem(FEED_CACHE_KEY);
          } catch {}
        } catch {
          // guest fetch failed
        }
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        try {
          const raw = window.sessionStorage.getItem(FEED_CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as FeedResponse;
            if (mounted) {
              setPosts(cached.posts);
              setFollowingPosts(cached.followingPosts ?? []);
              setStories(cached.stories);
              setCurrentUser(cached.currentUser);
              setSuggestedUsers(cached.suggestedUsers);
              setSearchableUsers(cached.searchableUsers);
              setIsGuest(false);
              setIsInitialLoading(false);
            }
          }
        } catch {}
        await loadFeed();
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [loadFeed]);

  const handlePostUpdated = useCallback((postId: string, patch: Partial<Post>) => {
    const applyPatch = (items: Post[]) => items.map((item) => (item.id === postId ? { ...item, ...patch } : item));
    setPosts((prev) => applyPatch(prev));
    setFollowingPosts((prev) => applyPatch(prev));
    setActivePost((prev) => (prev && prev.id === postId ? { ...prev, ...patch } : prev));
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    const removeById = (items: Post[]) => items.filter((item) => item.id !== postId);
    setPosts((prev) => removeById(prev));
    setFollowingPosts((prev) => removeById(prev));
    setActivePost((prev) => (prev?.id === postId ? null : prev));
  }, []);

  const visiblePosts = useMemo(
    () => (isGuest ? posts : activeFeedTab === "following" ? followingPosts : posts),
    [activeFeedTab, followingPosts, isGuest, posts]
  );

  useEffect(() => {
    if (isGuest || !currentUser) return;
    let cancelled = false;
    let unbind: (() => void) | null = null;
    const setup = async () => {
      const socket = await getSocketClient();
      if (cancelled) return;
      socket.emit("room:user:join", { userId: currentUser.id });
      const joined = new Set<string>();
      const joinPosts = (items: Post[]) => {
        for (const item of items) {
          if (!joined.has(item.id)) {
            socket.emit("room:post:join", { postId: item.id });
            joined.add(item.id);
          }
        }
      };
      joinPosts(posts);
      joinPosts(followingPosts);

      const onLike = (payload: { postId: string; actorUserId: string; liked: boolean; totalLikes: number }) => {
        handlePostUpdated(payload.postId, {
          likes: payload.totalLikes,
          ...(payload.actorUserId === currentUser.id ? { isLiked: payload.liked } : {}),
        });
      };
      const onComment = (payload: { postId: string; totalComments: number }) => {
        handlePostUpdated(payload.postId, { comments: payload.totalComments });
      };
      const onPostUpdatedRealtime = (payload: { postId: string; caption: string; tags: string[] }) => {
        handlePostUpdated(payload.postId, { caption: payload.caption, tags: payload.tags });
      };
      socket.on("social:like:toggled", onLike);
      socket.on("conversation:comment:new", onComment);
      socket.on("post:updated", onPostUpdatedRealtime);
      unbind = () => {
        socket.off("social:like:toggled", onLike);
        socket.off("conversation:comment:new", onComment);
        socket.off("post:updated", onPostUpdatedRealtime);
      };
    };
    void setup();
    return () => {
      cancelled = true;
      if (unbind) unbind();
    };
  }, [currentUser, followingPosts, handlePostUpdated, isGuest, posts]);

  return (
    <>
      <Navbar
        currentUserData={currentUser ?? undefined}
        searchableUsersData={searchableUsers}
        isAuthLoading={isInitialLoading}
        onPostPublished={() => void loadFeed()}
      />

      <main className="pt-[60px] min-h-screen bg-base">
        <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,68%)_minmax(260px,32%)] gap-7 items-start">

          {/* Feed Column */}
          <section>
            <div className="max-w-[600px] mx-auto w-full">
              {isInitialLoading ? (
                <div className="mb-6">
                  <div className="flex gap-3 overflow-hidden pb-3">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <div key={`story-skeleton-${index}`} className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="w-[74px] h-[74px] rounded-full bg-surface-2 animate-pulse" />
                        <div className="w-14 h-3 rounded bg-surface-2 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : !isGuest ? (
                <StoriesBar
                  stories={stories}
                  onStoryCreated={() => void loadFeed()}
                  currentUserId={currentUser?.id}
                />
              ) : (
                <div className="mb-6 rounded-2xl border border-border-soft bg-surface px-4 py-4">
                  <p className="text-[14px] font-semibold text-ink">Stories are available for logged users.</p>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="mt-2 text-[13px] font-semibold text-brand hover:opacity-80"
                  >
                    Click here to log in
                  </button>
                </div>
              )}

              <div className="flex items-center mb-5">
                {!isGuest ? (
                  <div className="inline-flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => setActiveFeedTab("forYou")}
                      className={`text-[13px] font-semibold transition-colors ${
                        activeFeedTab === "forYou" ? "text-ink" : "text-ink-3/70 hover:text-ink-2"
                      }`}
                    >
                      For you
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFeedTab("following")}
                      className={`text-[13px] font-semibold transition-colors ${
                        activeFeedTab === "following" ? "text-ink" : "text-ink-3/70 hover:text-ink-2"
                      }`}
                    >
                      Following
                    </button>
                  </div>
                ) : (
                  <span className="text-[12px] font-semibold uppercase tracking-[0.8px] text-ink-3">Recent posts</span>
                )}
              </div>

              {isInitialLoading ? (
                <div className="space-y-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`post-skeleton-${index}`} className="bg-surface rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-10 h-10 rounded-full bg-surface-2 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="w-28 h-3.5 rounded bg-surface-2 animate-pulse" />
                          <div className="w-16 h-3 rounded bg-surface-2 animate-pulse" />
                        </div>
                      </div>
                      <div className="aspect-square bg-surface-2 animate-pulse" />
                      <div className="px-4 py-4 space-y-3">
                        <div className="w-40 h-3.5 rounded bg-surface-2 animate-pulse" />
                        <div className="w-full h-3 rounded bg-surface-2 animate-pulse" />
                        <div className="w-4/5 h-3 rounded bg-surface-2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visiblePosts.length > 0 ? (
                visiblePosts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpenPost={setActivePost}
                    animDelay={`${i * 0.07}s`}
                    onPostUpdated={handlePostUpdated}
                    currentUserId={currentUser?.id}
                    onPostDeleted={handlePostDeleted}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-border-soft bg-surface px-5 py-8 text-center">
                  <p className="text-[16px] font-semibold text-ink">
                    {activeFeedTab === "following" && !isGuest ? "No following posts yet" : "No posts yet"}
                  </p>
                  <p className="text-[13px] text-ink-3 mt-1">
                    {activeFeedTab === "following" && !isGuest
                      ? "Follow more users to populate this tab."
                      : "Create your first post and follow users to see your feed here."}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar Column */}
          <Sidebar
            isLoading={isInitialLoading}
            currentUserData={currentUser ?? undefined}
            suggestedUsersData={suggestedUsers}
            isGuest={isGuest}
            onFollowedSuggestion={handleSuggestionFollowed}
          />
        </div>
      </main>

      {/* Post Modal */}
      <PostModal
        post={activePost}
        onClose={() => setActivePost(null)}
        onPostUpdated={handlePostUpdated}
        currentUserId={currentUser?.id}
        onPostDeleted={handlePostDeleted}
      />
    </>
  );
}
