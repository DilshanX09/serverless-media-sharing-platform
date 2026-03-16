"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import StoriesBar from "@/components/feed/StoriesBar";
import PostCard from "@/components/feed/PostCard";
import PostModal from "@/components/post/PostModal";
import { mockPosts } from "@/lib/mockData";
import type { Post } from "@/types";

export default function HomePage() {
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsInitialLoading(false), 320);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <Navbar
        onAddPost={() => alert("Connect to your Azure Blob Storage upload handler")}
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
              ) : (
                <StoriesBar />
              )}

              <div className="flex items-center mb-5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.8px] text-ink-3">
                  Recent posts
                </span>
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
              ) : (
                mockPosts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpenPost={setActivePost}
                    animDelay={`${i * 0.07}s`}
                  />
                ))
              )}
            </div>
          </section>

          {/* Sidebar Column */}
          <Sidebar isLoading={isInitialLoading} />
        </div>
      </main>

      {/* Post Modal */}
      <PostModal post={activePost} onClose={() => setActivePost(null)} />
    </>
  );
}
