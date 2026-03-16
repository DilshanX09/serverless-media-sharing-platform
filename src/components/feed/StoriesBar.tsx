"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Pause, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { mockStories } from "@/lib/mockData";

export default function StoriesBar() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [viewingStory, setViewingStory] = useState<string | null>(null);
  const [storyDurationMs, setStoryDurationMs] = useState(7000);
  const [viewerVideoPlaying, setViewerVideoPlaying] = useState(true);
  const [viewerControlVisible, setViewerControlVisible] = useState(true);
  const [viewerVideoReady, setViewerVideoReady] = useState(false);
  const [viewerVideoProgress, setViewerVideoProgress] = useState(0);
  const [viewerMuted, setViewerMuted] = useState(true);
  const storyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const closeStory = () => {
    if (storyTimeoutRef.current) clearTimeout(storyTimeoutRef.current);
    if (controlTimeoutRef.current) clearTimeout(controlTimeoutRef.current);
    setViewingStory(null);
  };

  const scheduleClose = (durationMs: number) => {
    if (storyTimeoutRef.current) clearTimeout(storyTimeoutRef.current);
    setStoryDurationMs(durationMs);
    storyTimeoutRef.current = setTimeout(
      () => setViewingStory(null),
      durationMs,
    );
  };

  const openStory = (id: string) => {
    if (storyTimeoutRef.current) clearTimeout(storyTimeoutRef.current);
    if (controlTimeoutRef.current) clearTimeout(controlTimeoutRef.current);
    setWatched((prev) => new Set([...prev, id]));
    setViewingStory(id);
    const story = mockStories.find((s) => s.id === id);
    const isVideo = story?.mediaType === "video";
    setViewerVideoPlaying(false);
    setViewerControlVisible(!isVideo);
    setViewerVideoReady(!isVideo);
    setViewerVideoProgress(0);
    setViewerMuted(true);
    setStoryDurationMs(7000);
    if (!isVideo) scheduleClose(7000);
  };

  const revealViewerControl = (autoHide = false) => {
    if (controlTimeoutRef.current) clearTimeout(controlTimeoutRef.current);
    setViewerControlVisible(true);
    if (autoHide) {
      controlTimeoutRef.current = setTimeout(
        () => setViewerControlVisible(false),
        1200,
      );
    }
  };

  const toggleViewerPlayback = async () => {
    const video = viewerVideoRef.current;
    if (!video || !viewerVideoReady) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        video.muted = true;
        await video.play();
      }
      setViewerVideoPlaying(true);
      revealViewerControl(true);
      return;
    }

    video.pause();
    setViewerVideoPlaying(false);
    revealViewerControl(false);
  };

  const toggleViewerMute = async () => {
    const video = viewerVideoRef.current;
    if (!video || !viewerVideoReady) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setViewerMuted(nextMuted);
    if (!video.paused) {
      revealViewerControl(true);
      return;
    }
    try {
      await video.play();
      setViewerVideoPlaying(true);
      revealViewerControl(true);
    } catch {
      // Keep paused state if autoplay is blocked after unmute.
    }
  };

  useEffect(() => {
    const preloadVideoEls = mockStories
      .filter((s) => s.mediaType === "video")
      .map((s) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = s.mediaUrl;
        return video;
      });

    return () => {
      if (storyTimeoutRef.current) clearTimeout(storyTimeoutRef.current);
      if (controlTimeoutRef.current) clearTimeout(controlTimeoutRef.current);
      preloadVideoEls.forEach((video) => {
        video.src = "";
        video.load();
      });
    };
  }, []);

  useEffect(() => {
    const stripEl = stripRef.current;
    if (!stripEl) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      stripEl.scrollBy({ left: event.deltaY, behavior: "auto" });
    };

    stripEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      stripEl.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleStripPointerDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!stripRef.current) return;
    isDraggingRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = stripRef.current.scrollLeft;
  };

  const handleStripPointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!stripRef.current || !isDraggingRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;
    stripRef.current.scrollLeft = dragStartScrollLeftRef.current - deltaX;
  };

  const endStripPointerDrag = () => {
    isDraggingRef.current = false;
  };

  return (
    <>
      <div className="mb-6 relative">
        <div
          ref={stripRef}
          onMouseDown={handleStripPointerDown}
          onMouseMove={handleStripPointerMove}
          onMouseUp={endStripPointerDrag}
          onMouseLeave={endStripPointerDrag}
          className="flex gap-3 overflow-x-auto pb-3 cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
            onClick={() => alert("Add story coming soon!")}
          >
            <div className="relative w-[74px] h-[74px] rounded-full bg-surface-2 flex items-center justify-center shadow-sm">
              <span className="w-9 h-9 rounded-full flex items-center justify-center">
                <Plus size={20} className="text-ink" strokeWidth={2.5} />
              </span>
            </div>
            <span className="text-[12px] text-ink-3 max-w-[74px] text-center truncate group-hover:text-ink-2 transition-colors">
              Your story
            </span>
          </div>

          {mockStories.map((story) => {
            const isSeen = story.seen || watched.has(story.id);
            const isViewing = viewingStory === story.id;
            return (
              <div
                key={story.id}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                onClick={() => openStory(story.id)}
              >
                <div
                  className={[
                    "w-[74px] h-[74px] rounded-full p-[2px] transition-all duration-200 hover:scale-105",
                    isViewing ? "ring-2 ring-white/70" : "",
                  ].join(" ")}
                  style={{
                    background: isSeen
                      ? "var(--bg-surface-3)"
                      : "conic-gradient(from 160deg, #f58529, #feda77, #dd2a7b, #8134af, #515bd4, #f58529)",
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden relative bg-surface">
                    <Image
                      src={story.thumbnailUrl ?? story.mediaUrl}
                      alt={story.username}
                      fill
                      sizes="74px"
                      className={[
                        "object-cover",
                        isSeen ? "opacity-75" : "opacity-100",
                      ].join(" ")}
                    />
                    {story.mediaType === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                          <Play
                            size={10}
                            className="text-white fill-white ml-0.5"
                          />
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={[
                    "text-[12px] max-w-[74px] text-center truncate transition-colors font-medium",
                    isSeen ? "text-ink-3" : "text-ink-2",
                  ].join(" ")}
                >
                  {story.username}
                </span>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-base to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-base to-transparent" />
      </div>

      {viewingStory &&
        (() => {
          const story = mockStories.find((s) => s.id === viewingStory);
          if (!story) return null;
          return (
            <div
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center"
              onClick={closeStory}
            >
              <div
                className="relative w-full max-w-[410px] mx-4 aspect-[9/16] bg-surface rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-4 left-4 right-4 h-[3px] bg-white/20 rounded-full overflow-hidden">
                  {story.mediaType === "video" ? (
                    <div
                      className="h-full bg-white rounded-full transition-[width] duration-150"
                      style={{ width: `${viewerVideoProgress}%` }}
                    />
                  ) : (
                    <div
                      key={`${viewingStory}-${storyDurationMs}`}
                      className="h-full bg-white rounded-full"
                      style={{
                        animation: `storyProgress ${storyDurationMs}ms linear forwards`,
                      }}
                    />
                  )}
                </div>

                <div className="absolute top-10 left-4 right-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full border-2 border-white/70 overflow-hidden">
                    <Image
                      src={story.thumbnailUrl ?? story.mediaUrl}
                      alt={story.username}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">
                      {story.username}
                    </p>
                    <p className="text-[11px] text-white/50">Just now</p>
                  </div>
                </div>

                {story.mediaType === "image" ? (
                  <Image
                    src={story.mediaUrl}
                    alt={story.username}
                    fill
                    sizes="(max-width: 768px) 100vw, 410px"
                    className="object-cover"
                  />
                ) : (
                  <video
                    ref={viewerVideoRef}
                    src={story.mediaUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={viewerMuted}
                    preload="auto"
                    playsInline
                    onClick={() => revealViewerControl(true)}
                    onLoadedMetadata={(e) => {
                      const seconds = e.currentTarget.duration;
                      if (Number.isFinite(seconds) && seconds > 0) {
                        const ms = Math.min(
                          Math.max(seconds * 1000, 10000),
                          25000,
                        );
                        setStoryDurationMs(ms);
                      }
                    }}
                    onCanPlay={() => {
                      setViewerVideoReady(true);
                      setViewerControlVisible(true);
                      setViewerMuted(viewerVideoRef.current?.muted ?? true);
                    }}
                    onWaiting={() => {
                      setViewerVideoPlaying(false);
                      setViewerControlVisible(false);
                    }}
                    onTimeUpdate={(e) => {
                      const { duration, currentTime } = e.currentTarget;
                      if (Number.isFinite(duration) && duration > 0) {
                        setViewerVideoProgress((currentTime / duration) * 100);
                      }
                    }}
                    onPlay={() => {
                      setViewerVideoPlaying(true);
                      revealViewerControl(true);
                    }}
                    onPause={() => {
                      setViewerVideoPlaying(false);
                      revealViewerControl(false);
                    }}
                    onVolumeChange={(e) => {
                      setViewerMuted(e.currentTarget.muted);
                    }}
                    onEnded={closeStory}
                  />
                )}

                {story.mediaType === "video" && (
                  <>
                    <div
                      className={[
                        "absolute inset-0 flex items-center justify-center transition-opacity duration-200 bg-black/25",
                        viewerVideoReady
                          ? "opacity-0 pointer-events-none"
                          : "opacity-100",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 text-white text-[13px] font-medium bg-black/45 px-3 py-2 rounded-full">
                        <Loader2 size={14} className="animate-spin" />
                        Loading video...
                      </div>
                    </div>

                    <div
                      className={[
                        "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                        viewerControlVisible && viewerVideoReady
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={toggleViewerPlayback}
                        className="w-16 h-16 rounded-full bg-black/35 backdrop-blur border border-white/30 flex items-center justify-center hover:bg-black/45 transition-colors"
                      >
                        {viewerVideoPlaying ? (
                          <Pause size={24} className="text-white" />
                        ) : (
                          <Play
                            size={24}
                            className="text-white fill-white ml-0.5"
                          />
                        )}
                      </button>
                    </div>

                    <div
                      className={[
                        "absolute right-4 bottom-16 transition-opacity duration-200",
                        viewerControlVisible && viewerVideoReady
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={toggleViewerMute}
                        className="w-10 h-10 rounded-full bg-black/35 backdrop-blur border border-white/25 flex items-center justify-center hover:bg-black/45 transition-colors"
                        aria-label={viewerMuted ? "Unmute video" : "Mute video"}
                      >
                        {viewerMuted ? (
                          <VolumeX size={18} className="text-white" />
                        ) : (
                          <Volume2 size={18} className="text-white" />
                        )}
                      </button>
                    </div>
                  </>
                )}

                <div className="absolute bottom-5 left-4 right-4">
                  <p className="text-[14px] text-white/80 font-medium">
                    {story.username}&apos;s story
                  </p>
                  <p className="text-[12px] text-white/55 mt-1">
                    Tap anywhere to close
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

      <style jsx>{`
        @keyframes storyProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
