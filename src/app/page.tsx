"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import StoriesBar from "@/components/feed/StoriesBar";
import PostCard from "@/components/feed/PostCard";
import PostModal from "@/components/post/PostModal";
import { mockPosts } from "@/lib/mockData";
import type { Post } from "@/types";

export default function HomePage() {
  const [activePost, setActivePost] = useState<Post | null>(null);

  return (
    <>
      <Navbar
        onAddPost={() => alert("Connect to your Azure Blob Storage upload handler")}
        onLoginClick={() => (window.location.href = "/login")}
      />

      <main className="pt-[60px] min-h-screen bg-base">
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-[600px_1fr] gap-10 items-start">

          {/* Feed Column */}
          <section>
            <StoriesBar />

            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-3">
                Recent posts
              </span>
              <button
                type="button"
                className="text-[12px] font-semibold text-brand hover:opacity-70 transition-opacity"
              >
                Following
              </button>
            </div>

            {mockPosts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                onOpenPost={setActivePost}
                animDelay={`${i * 0.07}s`}
              />
            ))}
          </section>

          {/* Sidebar Column */}
          <Sidebar />
        </div>
      </main>

      {/* Post Modal */}
      <PostModal post={activePost} onClose={() => setActivePost(null)} />
    </>
  );
}
