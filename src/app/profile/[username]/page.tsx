"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
  Grid3X3,
  Bookmark,
  Heart,
  Image as ImageIcon,
  UserPlus,
  UserCheck,
  MessageCircle,
  BadgeCheck,
  ArrowLeft,
  Settings,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import EditProfileModal from "@/components/profile/EditProfileModal";
import PostModal from "@/components/post/PostModal";
import { mockPosts, currentUser, suggestedUsers } from "@/lib/mockData";
import type { Post, User } from "@/types";

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
      avatarGradient: "from-zinc-600 to-zinc-800",
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

  const [editableUser, setEditableUser] = useState<User>(user);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);

  useEffect(() => {
    setEditableUser(user);
  }, [user]);

  const displayFollowers = (editableUser.followers ?? 0) + (following && !isOwn ? 1 : 0);
  const displayFollowing = editableUser.following ?? 0;

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
          <div className="p-2 sm:p-3 mb-6 border-b border-border-soft">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

              {/* Avatar */}
              <div className="flex-shrink-0">
                <div
                    className={[
                      "relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white bg-gradient-to-br",
                      editableUser.avatarGradient,
                    ].join(" ")}
                    style={{
                      boxShadow: "0 0 0 2px var(--bg-base), 0 0 0 4px var(--border-soft)",
                    }}
                  >
                    {editableUser.avatarUrl ? (
                      <Image
                        src={editableUser.avatarUrl}
                        alt={editableUser.displayName}
                        fill
                        sizes="112px"
                        className="object-cover rounded-full"
                      />
                    ) : (
                      editableUser.avatarInitial
                    )}
                  </div>
                </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-[22px] sm:text-[24px] font-bold text-ink leading-tight">
                      {editableUser.username}
                    </h1>
                    {editableUser.isVerified && (
                      <BadgeCheck size={22} className="text-ink-2 fill-ink-3 stroke-base" />
                    )}
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
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setFollowing((f) => !f)}
                          className={[
                            "flex items-center gap-1.5 text-[14px] font-semibold px-5 py-1.5 rounded-xl transition-all",
                            following
                              ? "bg-surface-2 border border-border-mid text-ink hover:bg-surface-3"
                              : "bg-ink hover:opacity-90 text-base",
                          ].join(" ")}
                        >
                          {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
                          {following ? "Following" : "Follow"}
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-[14px] font-semibold bg-surface-2 border border-border-mid text-ink px-4 py-1.5 rounded-xl hover:bg-surface-3 transition-all"
                        >
                          <MessageCircle size={15} />
                          Message
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-center sm:justify-start gap-6 mb-4">
                  <div className="text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity">
                    <p className="text-[18px] font-bold text-ink leading-tight">{editableUser.posts ?? posts.length}</p>
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
                <p className="text-[15px] font-semibold text-ink">{editableUser.displayName}</p>
                {editableUser.bio && (
                  <p className="text-[14px] text-ink-3 mt-1 leading-relaxed">{editableUser.bio}</p>
                )}
                {!editableUser.bio && (
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
                      className="aspect-square bg-surface-2 rounded-xl overflow-hidden relative cursor-pointer group transition-colors"
                      onClick={() => setActivePost(post)}
                    >
                      {post.mediaType === "image" ? (
                        <Image
                          src={post.mediaUrl}
                          alt={post.mediaLabel}
                          fill
                          sizes="(max-width: 640px) 50vw, 280px"
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <video
                          src={post.mediaUrl}
                          poster={post.thumbnailUrl}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          muted
                          playsInline
                        />
                      )}
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

          {activeTab === "saved" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <Bookmark size={28} className="text-ink-3" />
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
        user={editableUser}
        onSave={(nextUser) => {
          setEditableUser((prev) => ({
            ...prev,
            ...nextUser,
          }));
        }}
      />
      <PostModal post={activePost} onClose={() => setActivePost(null)} />
    </>
  );
}
