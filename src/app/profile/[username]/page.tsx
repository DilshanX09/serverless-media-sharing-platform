"use client";

import axios from "axios";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
  Grid3X3,
  Bookmark,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  BadgeCheck,
  ArrowLeft,
  Settings,
  LogOut,
  Play,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import EditProfileModal from "@/components/profile/EditProfileModal";
import FollowListModal from "@/components/profile/FollowListModal";
import PostModal from "@/components/post/PostModal";
import type { Post, User } from "@/types";
import { getAvatarGradient } from "@/lib/apiMappers";
import { useToast } from "@/components/ui/Toast";

interface ProfileResponse {
  user: User;
  posts: Post[];
  savedPosts?: Post[];
  isOwn: boolean;
  currentUserId?: string;
}

const profileCacheKey = (username: string) => `mini_insta_profile_${username}`;

async function uploadAvatarFromBlobUrl(blobUrl: string): Promise<string> {
  const blobResponse = await fetch(blobUrl);
  if (!blobResponse.ok) throw new Error("Failed to read selected avatar.");
  const blob = await blobResponse.blob();
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const fileName = `avatar-${Date.now()}.${extension}`;

  const sasResponse = await axios.post(
    "/api/upload/sas",
    { fileName, mediaType: "IMAGE" },
    { withCredentials: true }
  );
  const sasData = sasResponse.data as { uploadUrl: string; blobUrl: string };

  await axios.put(sasData.uploadUrl, blob, {
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": blob.type || "application/octet-stream",
    },
  });
  return sasData.blobUrl;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const usernameParam = params?.username;
  const usernameValue = Array.isArray(usernameParam) ? usernameParam[0] : usernameParam;
  const rawUsername = decodeURIComponent(usernameValue ?? "unknown").replace(/^@/, "");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [editableUser, setEditableUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      setLoadError(null);
      // Check sessionStorage cache first - show instantly if available
      const cached = window.sessionStorage.getItem(profileCacheKey(rawUsername));
      if (cached && mounted) {
        try {
          const parsed = JSON.parse(cached) as ProfileResponse;
          setProfileData(parsed);
          setEditableUser(parsed.user);
          setIsLoading(false);
          // Set current user ID from cache
          if (parsed.currentUserId) {
            setCurrentUserId(parsed.currentUserId);
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }
      // Fetch fresh data in background
      try {
        const response = await axios.get(`/api/profile/${encodeURIComponent(rawUsername)}`, { withCredentials: true });
        const data = response.data as ProfileResponse;
        if (!mounted) return;
        setProfileData(data);
        setEditableUser(data.user);
        // Set current user ID from response
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
        window.sessionStorage.setItem(profileCacheKey(rawUsername), JSON.stringify(data));
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          router.replace("/login");
          return;
        }
        // Only show error if we have no cached data
        if (!cached && mounted) {
          setLoadError("Profile not found.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [rawUsername, router]);

  useEffect(() => {
    if (activeTab !== "saved" || !profileData?.isOwn || profileData.savedPosts) return;
    let active = true;
    const loadSaved = async () => {
      setIsSavedLoading(true);
      try {
        const response = await axios.get(`/api/profile/${encodeURIComponent(rawUsername)}?includeSaved=1`, { withCredentials: true });
        if (!active) return;
        const data = response.data as ProfileResponse;
        setProfileData((prev) => (prev ? { ...prev, savedPosts: data.savedPosts ?? [] } : prev));
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          router.replace("/login");
        }
      } finally {
        if (active) setIsSavedLoading(false);
      }
    };
    void loadSaved();
    return () => {
      active = false;
    };
  }, [activeTab, profileData?.isOwn, profileData?.savedPosts, rawUsername, router]);

  const persistProfile = async (nextUser: Partial<User>) => {
    if (!profileData?.isOwn || isSavingProfile) return;
    setIsSavingProfile(true);
    let avatarBlobUrl =
      nextUser.avatarUrl && !nextUser.avatarUrl.startsWith("blob:") ? nextUser.avatarUrl : undefined;
    if (nextUser.avatarUrl?.startsWith("blob:")) {
      avatarBlobUrl = await uploadAvatarFromBlobUrl(nextUser.avatarUrl);
    }

    const response = await axios.patch("/api/profile/me", {
      displayName: nextUser.displayName,
      bio: nextUser.bio,
      ...(avatarBlobUrl ? { avatarBlobUrl } : {}),
    }, { withCredentials: true });

    const data = response.data as {
      profile: {
        displayName: string;
        bio?: string | null;
        avatarUrl?: string | null;
        counts: { followers: number; following: number; posts: number };
      };
    };

    setEditableUser((prev) =>
      prev
        ? {
            ...prev,
            displayName: data.profile.displayName,
            bio: data.profile.bio ?? "",
            avatarUrl: data.profile.avatarUrl ?? prev.avatarUrl,
            followers: data.profile.counts.followers,
            following: data.profile.counts.following,
            posts: data.profile.counts.posts,
            avatarInitial: (data.profile.displayName[0] ?? prev.avatarInitial).toUpperCase(),
          }
        : prev
    );
    setProfileData((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        user: {
          ...prev.user,
          displayName: data.profile.displayName,
          bio: data.profile.bio ?? "",
          avatarUrl: data.profile.avatarUrl ?? prev.user.avatarUrl,
          followers: data.profile.counts.followers,
          following: data.profile.counts.following,
          posts: data.profile.counts.posts,
          avatarInitial: (data.profile.displayName[0] ?? prev.user.avatarInitial).toUpperCase(),
        },
      };
      window.sessionStorage.setItem(profileCacheKey(rawUsername), JSON.stringify(next));
      return next;
    });

    setIsSavingProfile(false);
    showToast("Profile updated", "success");
  };

  const handleLogout = async () => {
    await axios.post("/api/auth/logout", {}, { withCredentials: true });
    showToast("Logged out successfully", "success");
    router.push("/login");
    router.refresh();
  };

  if (isLoading || !editableUser || !profileData) {
    return (
      <>
        <Navbar />
        <main className="pt-[62px] min-h-screen bg-base">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
            <div className="h-10 w-28 bg-surface-2 rounded mb-6 animate-pulse" />
            <div className="h-52 rounded-2xl bg-surface-2 animate-pulse" />
          </div>
        </main>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Navbar />
        <main className="pt-[62px] min-h-screen bg-base">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16 text-center">
            <p className="text-[16px] font-semibold text-ink">{loadError}</p>
          </div>
        </main>
      </>
    );
  }

  const { posts, savedPosts = [], isOwn } = profileData;
  const displayFollowers = editableUser.followers ?? 0;
  const displayFollowing = editableUser.following ?? 0;

  return (
    <>
      <Navbar currentUserData={isOwn ? editableUser : undefined} />
      <main className="pt-[62px] min-h-screen bg-base">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-ink-3 hover:text-ink transition-colors mb-6 text-[14px] font-medium"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="p-2 sm:p-3 mb-6 border-b border-border-soft">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="flex-shrink-0">
                <div
                  className={[
                    "relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white bg-gradient-to-br",
                    editableUser.avatarGradient || getAvatarGradient(editableUser.id),
                  ].join(" ")}
                  style={{ boxShadow: "0 0 0 2px var(--bg-base), 0 0 0 4px var(--border-soft)" }}
                >
                  {editableUser.avatarUrl ? (
                    <Image src={editableUser.avatarUrl} alt={editableUser.displayName} fill sizes="112px" className="object-cover rounded-full" />
                  ) : (
                    editableUser.avatarInitial
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-[22px] sm:text-[24px] font-bold text-ink leading-tight">{editableUser.username}</h1>
                    {editableUser.isVerified && <BadgeCheck size={22} className="text-ink-2 fill-ink-3 stroke-base" />}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {isOwn ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(true)}
                          className="w-9 h-9 rounded-xl bg-ink text-base flex items-center justify-center hover:opacity-90 transition-opacity"
                          title="Edit profile"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="w-9 h-9 rounded-xl bg-surface-2 text-ink-2 flex items-center justify-center hover:text-ink hover:bg-surface-3 transition-colors"
                          title="Log out"
                        >
                          <LogOut size={16} />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-6 mb-4">
                  <div className="text-center sm:text-left">
                    <p className="text-[18px] font-bold text-ink leading-tight">{editableUser.posts ?? posts.length}</p>
                    <p className="text-[13px] text-ink-3">posts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFollowListType("followers")}
                    className="text-center sm:text-left hover:opacity-70 transition-opacity"
                  >
                    <p className="text-[18px] font-bold text-ink leading-tight">
                      {displayFollowers >= 1000 ? (displayFollowers / 1000).toFixed(1) + "k" : displayFollowers}
                    </p>
                    <p className="text-[13px] text-ink-3">followers</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowListType("following")}
                    className="text-center sm:text-left hover:opacity-70 transition-opacity"
                  >
                    <p className="text-[18px] font-bold text-ink leading-tight">
                      {displayFollowing >= 1000 ? (displayFollowing / 1000).toFixed(1) + "k" : displayFollowing}
                    </p>
                    <p className="text-[13px] text-ink-3">following</p>
                  </button>
                </div>

                <p className="text-[15px] font-semibold text-ink">{editableUser.displayName}</p>
                {editableUser.bio ? (
                  <p className="text-[14px] text-ink-3 mt-1 leading-relaxed">{editableUser.bio}</p>
                ) : (
                  <p className="text-[14px] text-ink-3 mt-1 italic">
                    {isOwn ? "Add a bio to tell people about yourself." : "No bio yet."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex border-b border-border-soft mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={[
                "flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-all",
                activeTab === "posts" ? "border-brand text-brand" : "border-transparent text-ink-3 hover:text-ink-3",
              ].join(" ")}
            >
              <Grid3X3 size={16} />
              Posts
            </button>
            {isOwn ? (
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={[
                  "flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-all",
                  activeTab === "saved" ? "border-brand text-brand" : "border-transparent text-ink-3 hover:text-ink-3",
                ].join(" ")}
              >
                <Bookmark size={16} />
                Saved
              </button>
            ) : null}
          </div>

          {activeTab === "posts" && (
            <>
              {posts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="aspect-square bg-surface-2 rounded-xl overflow-hidden relative cursor-pointer group transition-colors"
                      onClick={() => setActivePost(post)}
                    >
                      {post.mediaType === "image" && post.mediaUrl ? (
                        <Image
                          src={post.mediaUrl}
                          alt={post.mediaLabel}
                          fill
                          sizes="(max-width: 640px) 50vw, 280px"
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : post.mediaUrl ? (
                        <>
                          <video
                            src={post.mediaUrl}
                            poster={post.thumbnailUrl}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            muted
                            loop
                            playsInline
                            preload="auto"
                            autoPlay
                          />
                          {/* Video indicator */}
                          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 pointer-events-none">
                            <Play size={12} fill="white" className="text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-surface-3 flex items-center justify-center">
                          <ImageIcon size={24} className="text-ink/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-xl flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-1.5 text-white text-[14px] font-bold">
                          <Heart size={18} fill="white" />
                          {post.likes >= 1000 ? (post.likes / 1000).toFixed(1) + "k" : post.likes}
                        </div>
                        <div className="flex items-center gap-1.5 text-white text-[14px] font-bold">
                          <MessageCircle size={18} fill="white" />
                          {post.comments}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                    <ImageIcon size={28} className="text-ink-3" />
                  </div>
                  <p className="text-[16px] font-semibold text-ink mb-1">No posts yet</p>
                  <p className="text-[14px] text-ink-3">
                    {isOwn ? "Share your first photo to get started." : "Nothing shared yet."}
                  </p>
                </div>
              )}
            </>
          )}

          {isOwn && activeTab === "saved" && (
            <>
              {isSavedLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`saved-skel-${index}`} className="aspect-square bg-surface-2 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : savedPosts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {savedPosts.map((post) => (
                    <div
                      key={`saved-${post.id}`}
                      className="aspect-square bg-surface-2 rounded-xl overflow-hidden relative cursor-pointer group transition-colors"
                      onClick={() => setActivePost(post)}
                    >
                      {post.mediaType === "image" && post.mediaUrl ? (
                        <Image
                          src={post.mediaUrl}
                          alt={post.mediaLabel}
                          fill
                          sizes="(max-width: 640px) 50vw, 280px"
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : post.mediaUrl ? (
                        <>
                          <video
                            src={post.mediaUrl}
                            poster={post.thumbnailUrl}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            muted
                            loop
                            playsInline
                            preload="auto"
                            autoPlay
                          />
                          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 pointer-events-none">
                            <Play size={12} fill="white" className="text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-surface-3 flex items-center justify-center">
                          <ImageIcon size={24} className="text-ink/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                    <Bookmark size={28} className="text-ink-3" />
                  </div>
                  <p className="text-[16px] font-semibold text-ink mb-1">No saved posts yet</p>
                  <p className="text-[14px] text-ink-3">Save posts you love and they&apos;ll appear here.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={editableUser}
        onSave={persistProfile}
      />
      <PostModal post={activePost} onClose={() => setActivePost(null)} />
      {editableUser && (
        <FollowListModal
          isOpen={followListType !== null}
          onClose={() => setFollowListType(null)}
          userId={rawUsername}
          type={followListType ?? "followers"}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
