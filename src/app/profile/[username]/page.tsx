"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Grid3X3,
  Bookmark,
  Heart,
  UserPlus,
  UserCheck,
  MessageCircle,
  BadgeCheck,
  ArrowLeft,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { mockPosts, currentUser, suggestedUsers } from "@/lib/mockData";

// Build profile lookup from all available users
const buildProfileData = (username: string) => {
  // Strip leading @
  const clean = username.replace(/^@/, "");

  // Is this the current user?
  if (clean === currentUser.username) {
    return {
      user: currentUser,
      posts: mockPosts,
      isOwn: true,
    };
  }

  // Look in mockPosts users
  const postUser = mockPosts.find((p) => p.user.username === clean)?.user;
  const suggestUser = suggestedUsers.find((u) => u.username === clean);
  const found = postUser ?? suggestUser ?? null;

  if (!found) return null;

  // Give them some posts (filter or fabricate)
  const userPosts = mockPosts.filter((p) => p.user.username === clean);

  return {
    user: found,
    posts: userPosts,
    isOwn: false,
  };
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = decodeURIComponent(params.username as string);

  const profile = buildProfileData(rawUsername) ?? {
    user: {
      id: rawUsername,
      username: rawUsername.replace(/^@/, ""),
      displayName: rawUsername.replace(/^@/, ""),
      avatarInitial: rawUsername.replace(/^@/, "")[0]?.toUpperCase() ?? "U",
      avatarGradient: "from-violet-500 to-purple-700",
      isVerified: false,
      followers: 0,
      following: 0,
      posts: 0,
      bio: "",
    },
    posts: [],
    isOwn: false,
  };

  const { user, posts, isOwn } = profile;

  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const displayFollowers = (user.followers ?? 0) + (following && !isOwn ? 1 : 0);
  const displayFollowing = user.following ?? 0;

  return (
    <>
      <Navbar />
      <main className="pt-[62px] min-h-screen bg-base">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">

          {/* Back button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-ink-3 hover:text-ink transition-colors mb-6 text-[14px] font-medium"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {/* Profile Header */}
          <div className="bg-surface border border-border-soft rounded-3xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

              {/* Avatar */}
              <div className="flex-shrink-0">
                <div
                  className={[
                    "w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white bg-gradient-to-br",
                    user.avatarGradient,
                  ].join(" ")}
                  style={{
                    boxShadow: "0 0 0 4px #1a1a1a, 0 0 0 6px rgba(232,255,71,0.25)",
                  }}
                >
                  {user.avatarInitial}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-[22px] sm:text-[24px] font-bold text-ink leading-tight">
                      {user.username}
                    </h1>
                    {user.isVerified && (
                      <BadgeCheck size={22} className="text-sky-400 fill-sky-500 stroke-[#1a1a1a]" />
                    )}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {isOwn ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(true)}
                          className="flex items-center gap-1.5 text-[14px] font-semibold bg-surface-3 border border-border-mid text-ink px-4 py-1.5 rounded-xl hover:bg-surface-3 transition-all"
                        >
                          <Settings size={15} />
                          Edit profile
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-3 hover:bg-surface-3 hover:text-ink transition-all border border-border-soft"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setFollowing((f) => !f)}
                          className={[
                            "flex items-center gap-1.5 text-[14px] font-semibold px-5 py-1.5 rounded-xl transition-all",
                            following
                              ? "bg-surface-3 border border-border-mid text-ink hover:bg-surface-3"
                              : "bg-brand hover:bg-brand hover:brightness-95 text-[#111]",
                          ].join(" ")}
                        >
                          {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
                          {following ? "Following" : "Follow"}
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-[14px] font-semibold bg-surface-3 border border-border-mid text-ink px-4 py-1.5 rounded-xl hover:bg-surface-3 transition-all"
                        >
                          <MessageCircle size={15} />
                          Message
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-3 hover:bg-surface-3 hover:text-ink transition-all border border-border-soft"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-center sm:justify-start gap-6 mb-4">
                  <div className="text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity">
                    <p className="text-[18px] font-bold text-ink leading-tight">{user.posts ?? posts.length}</p>
                    <p className="text-[13px] text-ink-3">posts</p>
                  </div>
                  <div className="text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity">
                    <p className="text-[18px] font-bold text-ink leading-tight">
                      {displayFollowers >= 1000 ? (displayFollowers / 1000).toFixed(1) + "k" : displayFollowers}
                    </p>
                    <p className="text-[13px] text-ink-3">followers</p>
                  </div>
                  <div className="text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity">
                    <p className="text-[18px] font-bold text-ink leading-tight">
                      {displayFollowing >= 1000 ? (displayFollowing / 1000).toFixed(1) + "k" : displayFollowing}
                    </p>
                    <p className="text-[13px] text-ink-3">following</p>
                  </div>
                </div>

                {/* Display name & bio */}
                <p className="text-[15px] font-semibold text-ink">{user.displayName}</p>
                {user.bio && (
                  <p className="text-[14px] text-ink-3 mt-1 leading-relaxed">{user.bio}</p>
                )}
                {!user.bio && (
                  <p className="text-[14px] text-ink-3 mt-1 italic">
                    {isOwn ? "Add a bio to tell people about yourself." : "No bio yet."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border-soft mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={[
                "flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-all",
                activeTab === "posts"
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-3 hover:text-ink-3",
              ].join(" ")}
            >
              <Grid3X3 size={16} />
              Posts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={[
                "flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-all",
                activeTab === "saved"
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-3 hover:text-ink-3",
              ].join(" ")}
            >
              <Bookmark size={16} />
              Saved
            </button>
          </div>

          {/* Posts Grid */}
          {activeTab === "posts" && (
            <>
              {posts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="aspect-square bg-surface rounded-xl overflow-hidden relative cursor-pointer group border border-border-soft hover:border-border-mid transition-colors"
                    >
                      <div className="w-full h-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300">
                        {post.mediaEmoji}
                      </div>
                      {/* Hover overlay */}
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
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 text-3xl">
                    📷
                  </div>
                  <p className="text-[16px] font-semibold text-ink mb-1">No posts yet</p>
                  <p className="text-[14px] text-ink-3">
                    {isOwn ? "Share your first photo to get started." : "Nothing shared yet."}
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "saved" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 text-3xl">
                🔖
              </div>
              <p className="text-[16px] font-semibold text-ink mb-1">
                {isOwn ? "No saved posts yet" : "Private collection"}
              </p>
              <p className="text-[14px] text-ink-3">
                {isOwn
                  ? "Save posts you love and they'll appear here."
                  : "Only this person can see their saved posts."}
              </p>
            </div>
          )}
        </div>
      </main>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
      />
    </>
  );
}
