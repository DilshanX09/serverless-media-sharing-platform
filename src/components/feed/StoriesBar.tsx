"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { mockStories } from "@/lib/mockData";
import { currentUser } from "@/lib/mockData";

export default function StoriesBar() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [viewingStory, setViewingStory] = useState<string | null>(null);
  const router = useRouter();

  const openStory = (id: string, username: string) => {
    setWatched((prev) => new Set([...prev, id]));
    setViewingStory(id);
    // Close after 4s like real stories
    setTimeout(() => setViewingStory(null), 4000);
  };

  return (
    <>
      {/* Stories Scroll Row */}
      <div
        className="flex gap-3 overflow-x-auto pb-3 mb-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >

        {/* Your Story / Add Story */}
        <div
          className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
          onClick={() => alert("Add story coming soon!")}
        >
          <div className="relative w-[64px] h-[64px]">
            {/* Ring with dashed */}
            <div className="w-full h-full rounded-full p-[2.5px] bg-surface-3 border-2 border-dashed border-[#444] group-hover:border-[#666] transition-colors">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#252525] to-[#1a1a1a] flex items-center justify-center">
                <span className="text-lg">
                  {currentUser.avatarInitial}
                </span>
              </div>
            </div>
            {/* Plus badge */}
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-brand flex items-center justify-center border-2 border-[#111]">
              <Plus size={11} className="text-[#111]" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[11px] text-ink-3 max-w-[64px] text-center truncate group-hover:text-ink-3 transition-colors">
            Your story
          </span>
        </div>

        {/* Story Items */}
        {mockStories.map((story) => {
          const isSeen = story.seen || watched.has(story.id);
          const isViewing = viewingStory === story.id;
          return (
            <div
              key={story.id}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
              onClick={() => openStory(story.id, story.username)}
            >
              <div
                className={[
                  "w-[64px] h-[64px] rounded-full p-[2.5px] transition-all duration-200 hover:scale-105",
                  isViewing ? "scale-110 ring-2 ring-white/30" : "",
                ].join(" ")}
                style={
                  isSeen
                    ? { background: "#2a2a2a" }
                    : {
                        background:
                          "conic-gradient(#e8ff47 0deg, #f87171 120deg, #a855f7 240deg, #e8ff47 360deg)",
                      }
                }
              >
                <div className="w-full h-full rounded-full bg-surface border-[3px] border-[#111] flex items-center justify-center text-xl select-none">
                  {story.emoji}
                </div>
              </div>
              <span
                className={[
                  "text-[12px] max-w-[64px] text-center truncate transition-colors",
                  isSeen ? "text-ink-3" : "text-[#bbb]",
                ].join(" ")}
              >
                {story.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Overlay */}
      {viewingStory && (() => {
        const story = mockStories.find((s) => s.id === viewingStory);
        if (!story) return null;
        return (
          <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setViewingStory(null)}
          >
            <div className="relative w-full max-w-[380px] mx-4 aspect-[9/16] bg-surface rounded-3xl overflow-hidden border border-border-mid flex flex-col items-center justify-center shadow-2xl">
              {/* Progress bar */}
              <div className="absolute top-4 left-4 right-4 h-[3px] bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ animation: "storyProgress 4s linear forwards" }}
                />
              </div>
              {/* User info */}
              <div className="absolute top-10 left-4 right-4 flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 border-brand"
                  style={{ background: "conic-gradient(#e8ff47 0deg, #f87171 120deg, #a855f7 240deg, #e8ff47 360deg)" }}
                >
                  <div className="w-full h-full rounded-full bg-surface border-[2px] border-[#1a1a1a] flex items-center justify-center text-lg">
                    {story.emoji}
                  </div>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">{story.username}</p>
                  <p className="text-[11px] text-white/50">Just now</p>
                </div>
              </div>
              {/* Content */}
              <span className="text-[100px] drop-shadow-2xl">{story.emoji}</span>
              <p className="text-[15px] text-white/70 mt-4 font-medium">{story.username}&apos;s story</p>
              <p className="text-[12px] text-white/40 mt-1">Tap anywhere to close</p>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        @keyframes storyProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
}
