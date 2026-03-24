"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CirclePlay,
  Users,
  Image as ImageIcon,
  MessageSquare,
  ChartColumn,
  LogOut,
  RefreshCcw,
  Trash2,
  Search,
  X,
  Grid3X3,
  List,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import VideoPlayer from "@/components/ui/VideoPlayer";

type DashboardTab = "overview" | "users" | "posts" | "stories" | "comments";

interface AdminOverviewResponse {
  admin: { session: "password" };
  stats: {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    totalStories: number;
    totalLikes: number;
    newUsersLast7Days: number;
    newPostsLast7Days: number;
  };
  recentUsers: Array<{
    id: string;
    username: string;
    displayName: string;
    email: string;
    createdAt: string;
  }>;
  recentPosts: Array<{
    id: string;
    caption: string | null;
    mediaType: "IMAGE" | "VIDEO";
    createdAt: string;
    author: { username: string; displayName: string };
    _count: { likes: number; comments: number; savedBy: number };
  }>;
}

interface AdminListResponse<T> {
  page: number;
  totalPages: number;
  users?: T[];
  posts?: T[];
  stories?: T[];
  comments?: T[];
}

interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
  _count: {
    posts: number;
    comments: number;
    followers: number;
    following: number;
  };
}

interface AdminPostRow {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO";
  blobUrl: string;
  mediaUrl?: string;
  createdAt: string;
  author: { username: string; displayName: string; email: string };
  _count: { likes: number; comments: number; savedBy: number };
}

interface AdminCommentRow {
  id: string;
  content: string;
  createdAt: string;
  author: { username: string; displayName: string; email: string };
  post: { id: string; caption: string | null; author: { username: string } };
  _count: { replies: number; likes: number };
}

interface AdminStoryRow {
  id: string;
  blobUrl: string;
  mediaUrl?: string;
  mediaType: "IMAGE" | "VIDEO";
  createdAt: string;
  expiresAt: string;
  author: { id: string; username: string; displayName: string; email: string };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function clip(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function PostMediaPreview({
  mediaType,
  mediaUrl,
  viewMode = "single",
}: {
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  viewMode?: "single" | "grid";
}) {
  const [mediaError, setMediaError] = useState(false);
  const isGrid = viewMode === "grid";

  if (!mediaUrl || mediaError) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-surface-2 ring-1 ring-border-soft ${isGrid ? "min-h-[180px]" : "min-h-[240px]"}`}
      >
        <div className="text-center px-3">
          <p className="text-[12px] font-semibold text-ink-2">Media unavailable</p>
          <p className="text-[11px] text-ink-3 mt-1">Open media link from details</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black ring-1 ring-border-soft flex items-center justify-center ${isGrid ? "min-h-[180px]" : "min-h-[240px]"}`}
    >
      <span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white">
        {mediaType}
      </span>
      {mediaType === "VIDEO" ? (
        <VideoPlayer
          src={mediaUrl}
          className={`w-full h-auto object-contain ${isGrid ? "max-h-[44vh]" : "max-h-[70vh]"}`}
          autoPlay={false}
          muted={false}
          loop={false}
          showSeekBar
          showPlayButton
          showMuteButton
        />
      ) : (
        <img
          src={mediaUrl}
          alt="Post media"
          className={`w-full h-auto object-contain ${isGrid ? "max-h-[44vh]" : "max-h-[70vh]"}`}
          loading="lazy"
          onError={() => setMediaError(true)}
        />
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postsViewMode, setPostsViewMode] = useState<"single" | "grid">(
    "single",
  );
  const [usersTableSearch, setUsersTableSearch] = useState("");
  const [commentsTableSearch, setCommentsTableSearch] = useState("");

  const [comments, setComments] = useState<AdminCommentRow[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [stories, setStories] = useState<AdminStoryRow[]>([]);
  const [storiesPage, setStoriesPage] = useState(1);
  const [storiesTotalPages, setStoriesTotalPages] = useState(1);
  const [storiesTableSearch, setStoriesTableSearch] = useState("");

  const loadOverview = useCallback(async () => {
    const response = await axios.get("/api/admin/overview", {
      withCredentials: true,
    });
    setOverview(response.data as AdminOverviewResponse);
  }, []);

  const loadUsers = useCallback(async (page = 1, keyword = "") => {
    const response = await axios.get("/api/admin/users", {
      withCredentials: true,
      params: { page, pageSize: 20, search: keyword || undefined },
    });
    const data = response.data as AdminListResponse<AdminUserRow>;
    setUsers(data.users ?? []);
    setUsersPage(data.page);
    setUsersTotalPages(data.totalPages);
  }, []);

  const loadPosts = useCallback(async (page = 1, keyword = "") => {
    const response = await axios.get("/api/admin/posts", {
      withCredentials: true,
      params: { page, pageSize: 20, search: keyword || undefined },
    });
    const data = response.data as AdminListResponse<AdminPostRow>;
    setPosts(data.posts ?? []);
    setPostsPage(data.page);
    setPostsTotalPages(data.totalPages);
  }, []);

  const loadComments = useCallback(async (page = 1, keyword = "") => {
    const response = await axios.get("/api/admin/comments", {
      withCredentials: true,
      params: { page, pageSize: 20, search: keyword || undefined },
    });
    const data = response.data as AdminListResponse<AdminCommentRow>;
    setComments(data.comments ?? []);
    setCommentsPage(data.page);
    setCommentsTotalPages(data.totalPages);
  }, []);

  const loadStories = useCallback(async (page = 1, keyword = "") => {
    const response = await axios.get("/api/admin/stories", {
      withCredentials: true,
      params: { page, pageSize: 20, search: keyword || undefined },
    });
    const data = response.data as AdminListResponse<AdminStoryRow>;
    setStories(data.stories ?? []);
    setStoriesPage(data.page);
    setStoriesTotalPages(data.totalPages);
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    setIsBusy(true);
    setError(null);
    try {
      await Promise.all([
        loadOverview(),
        loadUsers(1),
        loadPosts(1),
        loadStories(1),
        loadComments(1),
      ]);
    } catch (loadError: unknown) {
      if (axios.isAxiosError(loadError) && loadError.response?.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setError("Failed to load admin data.");
      showToast("Failed to load admin data", "error");
      return;
    } finally {
      setIsBusy(false);
      setIsLoading(false);
    }
    if (!silent) {
      showToast("Dashboard refreshed", "success");
    }
  }, [loadComments, loadOverview, loadPosts, loadStories, loadUsers, router, showToast]);

  useEffect(() => {
    void loadAll(true);
  }, [loadAll]);

  const runSearch = async () => {
    setIsBusy(true);
    setError(null);
    try {
      if (activeTab === "users") await loadUsers(1, search.trim());
      if (activeTab === "posts") await loadPosts(1, search.trim());
      if (activeTab === "stories") await loadStories(1, search.trim());
      if (activeTab === "comments") await loadComments(1, search.trim());
      showToast("Search results updated", "success");
    } catch {
      setError("Search failed.");
      showToast("Search failed", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const clearSearch = async () => {
    setSearch("");
    setIsBusy(true);
    try {
      if (activeTab === "users") await loadUsers(1, "");
      if (activeTab === "posts") await loadPosts(1, "");
      if (activeTab === "stories") await loadStories(1, "");
      if (activeTab === "comments") await loadComments(1, "");
      showToast("Filters reset", "info");
    } catch {
      showToast("Failed to reset filters", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const runLogout = async () => {
    setIsBusy(true);
    try {
      await axios.post("/api/admin/auth/logout", {}, { withCredentials: true });
      showToast("Logged out", "info");
    } finally {
      router.replace("/admin/login");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Delete this user and all related data?")) return;
    setIsBusy(true);
    try {
      await axios.delete("/api/admin/users", {
        data: { userId },
        withCredentials: true,
      });
      await Promise.all([loadOverview(), loadUsers(usersPage, search.trim())]);
      showToast("User deleted", "success");
    } catch {
      setError("Failed to delete user.");
      showToast("Failed to delete user", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("Delete this post?")) return;
    setIsBusy(true);
    try {
      await axios.delete("/api/admin/posts", {
        data: { postId },
        withCredentials: true,
      });
      await Promise.all([loadOverview(), loadPosts(postsPage, search.trim())]);
      showToast("Post removed", "success");
    } catch {
      setError("Failed to delete post.");
      showToast("Failed to delete post", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    setIsBusy(true);
    try {
      await axios.delete("/api/admin/comments", {
        data: { commentId },
        withCredentials: true,
      });
      await Promise.all([
        loadOverview(),
        loadComments(commentsPage, search.trim()),
      ]);
      showToast("Comment deleted", "success");
    } catch {
      setError("Failed to delete comment.");
      showToast("Failed to delete comment", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!window.confirm("Delete this story?")) return;
    setIsBusy(true);
    try {
      await axios.delete("/api/admin/stories", {
        data: { storyId },
        withCredentials: true,
      });
      await Promise.all([loadOverview(), loadStories(storiesPage, search.trim())]);
      showToast("Story deleted", "success");
    } catch {
      showToast("Failed to delete story", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const pager = (
    page: number,
    totalPages: number,
    onChange: (page: number) => Promise<void>,
  ) => (
    <div className="flex items-center justify-end gap-2 mt-3">
      <button
        type="button"
        disabled={page <= 1 || isBusy}
        onClick={() => void onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg border border-border-soft text-[12px] font-semibold disabled:opacity-45"
      >
        Prev
      </button>
      <span className="text-[12px] text-ink-3">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages || isBusy}
        onClick={() => void onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg border border-border-soft text-[12px] font-semibold disabled:opacity-45"
      >
        Next
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base text-ink flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-ink-3">
          <Loader2 size={18} className="animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  const navItems: Array<{
    key: DashboardTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { key: "overview", label: "Overview", icon: ChartColumn },
    { key: "users", label: "Users", icon: Users },
    { key: "posts", label: "Posts", icon: ImageIcon },
    { key: "stories", label: "Stories", icon: CirclePlay },
    { key: "comments", label: "Comments", icon: MessageSquare },
  ];

  const statCards = [
    {
      label: "Users",
      value: overview?.stats.totalUsers ?? 0,
      hint: "Total accounts",
      chip: `+${overview?.stats.newUsersLast7Days ?? 0} this week`,
      icon: Users,
    },
    {
      label: "Posts",
      value: overview?.stats.totalPosts ?? 0,
      hint: "Published content",
      chip: `+${overview?.stats.newPostsLast7Days ?? 0} this week`,
      icon: ImageIcon,
    },
    {
      label: "Comments",
      value: overview?.stats.totalComments ?? 0,
      hint: "Conversation volume",
      chip: "Community signals",
      icon: MessageSquare,
    },
    {
      label: "Likes",
      value: overview?.stats.totalLikes ?? 0,
      hint: "Engagement total",
      chip: "Across all posts",
      icon: ChartColumn,
    },
  ];

  const filteredUsers = users.filter((user) => {
    const q = usersTableSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      user.displayName.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  const filteredComments = comments.filter((comment) => {
    const q = commentsTableSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      comment.content.toLowerCase().includes(q) ||
      comment.author.displayName.toLowerCase().includes(q) ||
      comment.author.username.toLowerCase().includes(q) ||
      (comment.post.caption ?? "").toLowerCase().includes(q)
    );
  });

  const filteredStories = stories.filter((story) => {
    const q = storiesTableSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      story.author.displayName.toLowerCase().includes(q) ||
      story.author.username.toLowerCase().includes(q) ||
      story.author.email.toLowerCase().includes(q) ||
      story.mediaType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-base text-ink relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.06),transparent_28%)]" />
      <div className="mx-auto max-w-[1460px] p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside className="rounded-3xl bg-surface/92 backdrop-blur-xl ring-1 ring-border-soft p-5 h-fit lg:sticky lg:top-6">
            <div className="mb-6">
              <p className="text-[15px] font-semibold">Shutterly Admin</p>
              <p className="text-[12px] text-ink-3 mt-0.5">
                Manage users, posts, comments
              </p>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl transition-colors ${
                      active
                        ? "bg-ink text-base"
                        : "bg-base/75 text-ink-2 hover:text-ink hover:bg-base"
                    }`}
                  >
                    <Icon size={15} />
                    <span className="text-[13px] font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => void runLogout()}
              className="mt-6 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/12 text-red-400 text-[13px] font-medium hover:bg-red-500/16 transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </aside>

          <section className="space-y-4">
            <div className="rounded-3xl bg-surface/92 backdrop-blur-xl ring-1 ring-border-soft p-5 sm:p-6">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <p className="text-[26px] font-extrabold tracking-tight">
                    Admin Panel
                  </p>
                  <p className="text-[13px] text-ink-3">
                    Manage users, posts, comments, and platform health.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-base/85 ring-1 ring-border-soft px-3 py-1 text-[11px] text-ink-3">
                      Session: Password Protected
                    </span>
                    <span className="inline-flex items-center rounded-full bg-base/85 ring-1 ring-border-soft px-3 py-1 text-[11px] text-ink-3">
                      Active: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAll(false)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-ink text-base text-[13px] font-medium disabled:opacity-50"
                >
                  <RefreshCcw
                    size={14}
                    className={isBusy ? "animate-spin" : ""}
                  />
                  Refresh data
                </button>
              </div>

              {error ? (
                <p className="mt-3 text-[13px] text-red-400">{error}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="rounded-2xl ring-1 ring-border-soft bg-surface px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] uppercase tracking-wide text-ink-3 font-medium">
                          {card.label}
                        </p>
                        <p className="text-[28px] leading-none font-bold mt-2">
                          {compactNumber(card.value)}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-base/70 ring-1 ring-border-soft flex items-center justify-center text-ink-2">
                        <Icon size={16} />
                      </div>
                    </div>
                    <p className="text-[12px] text-ink-3 mt-2">{card.hint}</p>
                    <p className="text-[11px] text-ink-2 mt-1 font-medium">{card.chip}</p>
                  </article>
                );
              })}
            </div>

            {activeTab === "overview" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl ring-1 ring-border-soft bg-surface p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-[15px] font-semibold">Latest users</p>
                    <span className="text-[11px] text-ink-3">Recent signups</span>
                  </div>
                  <div className="space-y-3">
                    {(overview?.recentUsers ?? []).map((user) => (
                      <div
                        key={user.id}
                        className="rounded-xl ring-1 ring-border-soft bg-base px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold">
                              {user.displayName}{" "}
                              <span className="text-ink-3">@{user.username}</span>
                            </p>
                            <p className="text-[12px] text-ink-3 mt-0.5">{user.email}</p>
                          </div>
                          <span className="text-[11px] text-ink-3 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl ring-1 ring-border-soft bg-surface p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-[15px] font-semibold">Latest posts</p>
                    <span className="text-[11px] text-ink-3">Recent content</span>
                  </div>
                  <div className="space-y-3">
                    {(overview?.recentPosts ?? []).map((post) => (
                      <div
                        key={post.id}
                        className="rounded-xl ring-1 ring-border-soft bg-base px-3 py-3"
                      >
                        <p className="text-[13px] font-semibold">
                          {post.author.displayName}{" "}
                          <span className="text-ink-3">
                            @{post.author.username}
                          </span>
                        </p>
                        <p className="text-[12px] text-ink-2 mt-1 break-words">
                          {clip(post.caption ?? "(no caption)", 180)}
                        </p>
                        <p className="text-[11px] text-ink-3 mt-1">
                          {formatDate(post.createdAt)} · {post._count.likes}{" "}
                          likes · {post._count.comments} comments
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "users" ? (
              <div className="rounded-2xl bg-surface/92 ring-1 ring-border-soft p-3 sm:p-4 overflow-x-auto">
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative w-full sm:max-w-[360px]">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                    <input
                      value={usersTableSearch}
                      onChange={(event) => setUsersTableSearch(event.target.value)}
                      className="h-10 w-full rounded-xl bg-base pl-9 pr-8 text-[13px] ring-1 ring-border-soft outline-none"
                      placeholder="Search users in this page..."
                    />
                    {usersTableSearch ? (
                      <button
                        type="button"
                        onClick={() => setUsersTableSearch("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-2 inline-flex items-center justify-center text-ink-3"
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
                <table className="w-full min-w-[860px] text-left text-[13px]">
                  <thead className="text-ink-3">
                    <tr>
                      <th className="px-2 py-2">User</th>
                      <th className="px-2 py-2">Email</th>
                      <th className="px-2 py-2">Activity</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-border-soft">
                        <td className="px-2 py-2.5">
                          <p className="font-semibold">{user.displayName}</p>
                          <p className="text-ink-3">@{user.username}</p>
                        </td>
                        <td className="px-2 py-2.5">{user.email}</td>
                        <td className="px-2 py-2.5 text-ink-2">
                          {user._count.posts} posts · {user._count.comments}{" "}
                          comments
                        </td>
                        <td className="px-2 py-2.5 text-ink-3">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void deleteUser(user.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-red-400 font-medium"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pager(usersPage, usersTotalPages, async (page) => {
                  setIsBusy(true);
                  try {
                    await loadUsers(page, search.trim());
                  } finally {
                    setIsBusy(false);
                  }
                })}
              </div>
            ) : null}

            {activeTab === "posts" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) =>
                        event.key === "Enter" && void runSearch()
                      }
                      className="h-11 w-full rounded-2xl bg-base/85 pl-10 pr-10 text-[13px] outline-none ring-1 ring-border-soft focus:ring-border-strong"
                      placeholder="Search posts..."
                    />
                    {search ? (
                      <button
                        type="button"
                        onClick={() => void clearSearch()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-surface-2 text-ink-3 hover:text-ink transition-colors inline-flex items-center justify-center"
                        aria-label="Clear post search"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void runSearch()}
                    disabled={isBusy}
                    className="h-11 px-4 rounded-2xl bg-base/85 text-[13px] font-medium ring-1 ring-border-soft"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearSearch()}
                    disabled={isBusy || !search}
                    className="h-11 px-4 rounded-2xl bg-surface-2/80 text-[13px] text-ink-2 font-medium disabled:opacity-45"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPostsViewMode("single")}
                    className={`h-9 px-3 rounded-xl text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                      postsViewMode === "single"
                        ? "bg-ink text-base"
                        : "bg-surface-2/80 text-ink-2"
                    }`}
                  >
                    <List size={14} />
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostsViewMode("grid")}
                    className={`h-9 px-3 rounded-xl text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                      postsViewMode === "grid"
                        ? "bg-ink text-base"
                        : "bg-surface-2/80 text-ink-2"
                    }`}
                  >
                    <Grid3X3 size={14} />
                    Grid
                  </button>
                </div>

                <div
                  className={
                    postsViewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                      : "space-y-4"
                  }
                >
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-3xl bg-surface/92 ring-1 ring-border-soft p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold">
                          {post.author.displayName}{" "}
                          <span className="text-ink-3">@{post.author.username}</span>
                        </p>
                        <p className="text-[12px] text-ink-3 mt-0.5">
                          {post.author.email} · {formatDate(post.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deletePost(post.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-red-400 text-[12px] font-medium"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>

                    <div className="mt-4">
                      <PostMediaPreview
                        mediaType={post.mediaType}
                        mediaUrl={post.mediaUrl ?? post.blobUrl}
                        viewMode={postsViewMode}
                      />
                    </div>

                    <p className="mt-4 text-[14px] leading-relaxed text-ink break-words whitespace-pre-wrap">
                      {postsViewMode === "grid"
                        ? clip(post.caption?.trim() || "(No caption)", 120)
                        : post.caption?.trim() || "(No caption)"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-ink-3">
                      <span className="rounded-full bg-base/80 px-2.5 py-1 ring-1 ring-border-soft">
                        {post.mediaType}
                      </span>
                      <span>{post._count.likes} likes</span>
                      <span>{post._count.comments} comments</span>
                      <a
                        href={post.mediaUrl ?? post.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 underline underline-offset-2"
                      >
                        Open media
                      </a>
                    </div>
                  </article>
                ))}
                </div>
                {pager(postsPage, postsTotalPages, async (page) => {
                  setIsBusy(true);
                  try {
                    await loadPosts(page, search.trim());
                  } finally {
                    setIsBusy(false);
                  }
                })}
              </div>
            ) : null}

            {activeTab === "comments" ? (
              <div className="rounded-2xl bg-surface/92 ring-1 ring-border-soft p-3 sm:p-4 overflow-x-auto">
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative w-full sm:max-w-[360px]">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                    <input
                      value={commentsTableSearch}
                      onChange={(event) => setCommentsTableSearch(event.target.value)}
                      className="h-10 w-full rounded-xl bg-base pl-9 pr-8 text-[13px] ring-1 ring-border-soft outline-none"
                      placeholder="Search comments in this page..."
                    />
                    {commentsTableSearch ? (
                      <button
                        type="button"
                        onClick={() => setCommentsTableSearch("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-2 inline-flex items-center justify-center text-ink-3"
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
                <table className="w-full min-w-[900px] text-left text-[13px]">
                  <thead className="text-ink-3">
                    <tr>
                      <th className="px-2 py-2">Author</th>
                      <th className="px-2 py-2">Comment</th>
                      <th className="px-2 py-2">Post</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComments.map((comment) => (
                      <tr
                        key={comment.id}
                        className="border-t border-border-soft"
                      >
                        <td className="px-2 py-2.5">
                          <p className="font-semibold">
                            {comment.author.displayName}
                          </p>
                          <p className="text-ink-3">
                            @{comment.author.username}
                          </p>
                        </td>
                        <td className="px-2 py-2.5">
                          <p className="text-ink-2 break-words">
                            {clip(comment.content, 140)}
                          </p>
                          <p className="text-[11px] text-ink-3 mt-1">
                            {comment._count.likes} likes ·{" "}
                            {comment._count.replies} replies
                          </p>
                        </td>
                        <td className="px-2 py-2.5">
                          <p className="font-medium text-ink-2">
                            @{comment.post.author.username}
                          </p>
                          <p className="text-[12px] text-ink-3 break-words">
                            {clip(comment.post.caption ?? "(no caption)", 80)}
                          </p>
                        </td>
                        <td className="px-2 py-2.5 text-ink-3">
                          {formatDate(comment.createdAt)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void deleteComment(comment.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-red-400 font-medium"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pager(commentsPage, commentsTotalPages, async (page) => {
                  setIsBusy(true);
                  try {
                    await loadComments(page, search.trim());
                  } finally {
                    setIsBusy(false);
                  }
                })}
              </div>
            ) : null}

            {activeTab === "stories" ? (
              <div className="rounded-2xl bg-surface/92 ring-1 ring-border-soft p-3 sm:p-4 overflow-x-auto">
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative w-full sm:max-w-[360px]">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                    <input
                      value={storiesTableSearch}
                      onChange={(event) => setStoriesTableSearch(event.target.value)}
                      className="h-10 w-full rounded-xl bg-base pl-9 pr-8 text-[13px] ring-1 ring-border-soft outline-none"
                      placeholder="Search stories in this page..."
                    />
                    {storiesTableSearch ? (
                      <button
                        type="button"
                        onClick={() => setStoriesTableSearch("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-2 inline-flex items-center justify-center text-ink-3"
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <table className="w-full min-w-[980px] text-left text-[13px]">
                  <thead className="text-ink-3">
                    <tr>
                      <th className="px-2 py-2">Author</th>
                      <th className="px-2 py-2">Media</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2">Expires</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStories.map((story) => (
                      <tr key={story.id} className="border-t border-border-soft">
                        <td className="px-2 py-2.5">
                          <p className="font-semibold">{story.author.displayName}</p>
                          <p className="text-ink-3">@{story.author.username}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <a
                            href={story.mediaUrl ?? story.blobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 underline underline-offset-2"
                          >
                            Open story media
                          </a>
                        </td>
                        <td className="px-2 py-2.5 text-ink-2">{story.mediaType}</td>
                        <td className="px-2 py-2.5 text-ink-3">{formatDate(story.createdAt)}</td>
                        <td className="px-2 py-2.5 text-ink-3">{formatDate(story.expiresAt)}</td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void deleteStory(story.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-red-400 font-medium"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pager(storiesPage, storiesTotalPages, async (page) => {
                  setIsBusy(true);
                  try {
                    await loadStories(page, search.trim());
                  } finally {
                    setIsBusy(false);
                  }
                })}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {isBusy ? (
        <div className="fixed right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-base text-[12px] font-semibold">
          <Loader2 size={14} className="animate-spin" />
          Updating dashboard...
        </div>
      ) : null}
    </div>
  );
}
