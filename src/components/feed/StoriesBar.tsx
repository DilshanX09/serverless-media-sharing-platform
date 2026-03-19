"use client";

import axios from "axios";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Maximize2, Minimize2, Pause, Play, Plus, Trash2, UserRound, Volume2, VolumeX } from "lucide-react";
import type { Story } from "@/types";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";

interface StoriesBarProps {
  stories?: Story[];
  onStoryCreated?: () => void;
  currentUserId?: string;
}

export default function StoriesBar({ stories, onStoryCreated, currentUserId }: StoriesBarProps) {
  const { showToast } = useToast();
  const storyItems = useMemo(
    () => (stories ?? []).filter((story) => Boolean(story.mediaUrl)),
    [stories]
  );
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [viewingStory, setViewingStory] = useState<string | null>(null);
  const [storyDurationMs, setStoryDurationMs] = useState(7000);
  const [viewerVideoPlaying, setViewerVideoPlaying] = useState(true);
  const [viewerControlVisible, setViewerControlVisible] = useState(true);
  const [viewerVideoReady, setViewerVideoReady] = useState(false);
  const [viewerVideoProgress, setViewerVideoProgress] = useState(0);
  const [viewerMuted, setViewerMuted] = useState(true);
  const [viewerFitMode, setViewerFitMode] = useState<"fit" | "fill">("fit");
  const [nowTick, setNowTick] = useState(Date.now());
  const storyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const storySeekBarRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [storyDeleteTarget, setStoryDeleteTarget] = useState<Story | null>(null);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const [isSeekingStory, setIsSeekingStory] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const closeStory = () => {
    if (storyTimeoutRef.current) clearTimeout(storyTimeoutRef.current);
    if (controlTimeoutRef.current) clearTimeout(controlTimeoutRef.current);
    setViewingStory(null);
  };

  useEffect(() => {
    const raw = window.localStorage.getItem("mini_insta_story_seen");
    if (!raw) return;
    const ids = raw.split(",").filter(Boolean);
    setWatched(new Set(ids));
  }, []);

  useEffect(() => {
    if (!storyItems.length) return;
    setWatched((prev) => {
      const validIds = new Set(storyItems.map((story) => story.id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      if (next.size !== prev.size) {
        window.localStorage.setItem("mini_insta_story_seen", Array.from(next).join(","));
      }
      return next;
    });
  }, [storyItems]);

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
    setWatched((prev) => {
      const next = new Set([...prev, id]);
      window.localStorage.setItem("mini_insta_story_seen", Array.from(next).join(","));
      return next;
    });
    setViewingStory(id);
    const story = storyItems.find((s) => s.id === id);
    const isVideo = story?.mediaType === "video";
    setViewerVideoPlaying(false);
    setViewerControlVisible(!isVideo);
    setViewerVideoReady(!isVideo);
    setViewerVideoProgress(0);
    setViewerMuted(true);
    setViewerFitMode("fit");
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
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const preloadVideoEls = storyItems
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
  }, [storyItems]);

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

  const handleStorySeek = (clientX: number) => {
    const video = viewerVideoRef.current;
    const bar = storySeekBarRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const newTime = percent * video.duration;
    if (Number.isFinite(newTime)) {
      video.currentTime = newTime;
      setViewerVideoProgress(percent * 100);
    }
  };

  const handleStorySeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsSeekingStory(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    handleStorySeek(clientX);
  };

  const handleStorySeekMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSeekingStory) return;
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    handleStorySeek(clientX);
  };

  const handleStorySeekEnd = () => {
    setIsSeekingStory(false);
    revealViewerControl(true);
  };

  useEffect(() => {
    if (!isSeekingStory) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      handleStorySeek(clientX);
    };
    const handleEnd = () => handleStorySeekEnd();
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeekingStory]);

  const handleStoryFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isUploadingStory) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;

    setIsUploadingStory(true);
    try {
      const mediaType = isVideo ? "VIDEO" : "IMAGE";
      const sasResponse = await axios.post(
        "/api/upload/sas",
        { fileName: file.name, mediaType },
        { withCredentials: true }
      );
      const sasData = sasResponse.data as { uploadUrl: string; blobUrl: string };

      await axios.put(sasData.uploadUrl, file, {
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      await axios.post(
        "/api/stories/active",
        { blobUrl: sasData.blobUrl, mediaType },
        { withCredentials: true }
      );
      onStoryCreated?.();
      showToast("Story added!", "success");
    } catch {
      showToast("Failed to upload story", "error");
    } finally {
      setIsUploadingStory(false);
    }
  };

  const formatStoryTime = (createdAt?: string): string => {
    if (!createdAt) return "now";
    const diffMs = nowTick - new Date(createdAt).getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleConfirmStoryDelete = async () => {
    if (!storyDeleteTarget) return;
    setIsDeletingStory(true);
    try {
      await axios.delete("/api/stories/active", {
        data: { storyId: storyDeleteTarget.id },
        withCredentials: true,
      });
      closeStory();
      setStoryDeleteTarget(null);
      onStoryCreated?.();
      showToast("Story deleted", "success");
    } catch {
      showToast("Failed to delete story", "error");
    } finally {
      setIsDeletingStory(false);
    }
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
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="relative w-[74px] h-[74px] rounded-full bg-surface-2 flex items-center justify-center shadow-sm">
              <span className="w-9 h-9 rounded-full flex items-center justify-center">
                {isUploadingStory ? (
                  <Loader2 size={20} className="text-ink animate-spin" strokeWidth={2.5} />
                ) : (
                  <Plus size={20} className="text-ink" strokeWidth={2.5} />
                )}
              </span>
            </div>
            <span className="text-[12px] text-ink-3 max-w-[74px] text-center truncate group-hover:text-ink-2 transition-colors">
              Your story
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime,video/mov"
            onChange={(e) => void handleStoryFileInput(e)}
          />

          {storyItems.map((story) => {
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
                    {story.avatarUrl || story.thumbnailUrl || story.mediaUrl ? (
                      <Image
                        src={story.avatarUrl ?? story.thumbnailUrl ?? story.mediaUrl}
                        alt={story.username}
                        fill
                        sizes="74px"
                        className={[
                          "object-cover",
                          isSeen ? "opacity-75" : "opacity-100",
                        ].join(" ")}
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                        <UserRound size={16} className="text-ink-3" />
                      </div>
                    )}
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
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-base to-transparent" />
      </div>

      {viewingStory &&
        (() => {
           const story = storyItems.find((s) => s.id === viewingStory);
          if (!story) return null;
          return (
            <div
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center"
              onClick={closeStory}
            >
              <div
                className="relative w-full max-w-[92vw] h-[92vh] mx-4 bg-surface rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress bar for images, or non-interactive indicator for videos */}
                <div className="absolute z-30 top-4 left-4 right-4 h-[3px] bg-white/20 rounded-full overflow-hidden">
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

                <div className="absolute z-30 top-10 left-4 right-4 flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-full border-2 border-white/70 overflow-hidden">
                    <Image
                      src={story.avatarUrl ?? story.thumbnailUrl ?? story.mediaUrl}
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
                    <p className="text-[11px] text-white/50">{formatStoryTime(story.createdAt)}</p>
                  </div>
                  {story.authorId === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => setStoryDeleteTarget(story)}
                      className="ml-auto w-8 h-8 rounded-full bg-black/35 border border-white/25 flex items-center justify-center hover:bg-black/45 transition-colors"
                      title="Delete story"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  ) : null}
                </div>

                {story.mediaType === "image" ? (
                  <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center bg-black">
                    <Image
                      src={story.mediaUrl}
                      alt={story.username}
                      fill
                      sizes="(max-width: 768px) 100vw, 92vw"
                      className={viewerFitMode === "fit" ? "object-contain" : "object-cover"}
                    />
                  </div>
                ) : (
                  <video
                    ref={viewerVideoRef}
                    src={story.mediaUrl}
                    className={`absolute inset-0 z-0 w-full h-full bg-black ${viewerFitMode === "fit" ? "object-contain" : "object-cover"}`}
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

                <div
                  className={[
                    "absolute z-30 right-4 bottom-16 transition-opacity duration-200",
                    story.mediaType === "video" ? (viewerControlVisible && viewerVideoReady ? "opacity-100" : "opacity-0 pointer-events-none") : "opacity-100",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => setViewerFitMode((prev) => (prev === "fit" ? "fill" : "fit"))}
                    className="w-10 h-10 rounded-full bg-black/35 backdrop-blur border border-white/25 flex items-center justify-center hover:bg-black/45 transition-colors"
                    aria-label={viewerFitMode === "fit" ? "Fill screen" : "Fit media"}
                    title={viewerFitMode === "fit" ? "Fill screen" : "Fit media"}
                  >
                    {viewerFitMode === "fit" ? (
                      <Maximize2 size={17} className="text-white" />
                    ) : (
                      <Minimize2 size={17} className="text-white" />
                    )}
                  </button>
                </div>

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
                        "absolute z-30 right-4 bottom-28 transition-opacity duration-200",
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

                    {/* Video Seekbar */}
                    <div
                      className={[
                        "absolute z-30 bottom-20 left-4 right-4 transition-opacity duration-200",
                        viewerControlVisible && viewerVideoReady
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <div
                        ref={storySeekBarRef}
                        className="h-6 flex items-center cursor-pointer select-none"
                        onMouseDown={handleStorySeekStart}
                        onTouchStart={handleStorySeekStart}
                        onMouseMove={handleStorySeekMove}
                        onTouchMove={handleStorySeekMove}
                      >
                        <div className="relative w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-white rounded-full"
                            style={{ width: `${viewerVideoProgress}%` }}
                          />
                        </div>
                        {/* Custom thumb */}
                        <div
                          className="absolute w-4 h-4 bg-white rounded-full shadow-md pointer-events-none transition-transform"
                          style={{
                            left: `${viewerVideoProgress}%`,
                            transform: "translateX(-50%)",
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="absolute z-30 bottom-5 left-4 right-4">
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

      <ConfirmModal
        isOpen={Boolean(storyDeleteTarget)}
        title="Delete story"
        description="This story will be removed immediately and cannot be undone."
        confirmLabel={isDeletingStory ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isConfirming={isDeletingStory}
        onConfirm={() => void handleConfirmStoryDelete()}
        onCancel={() => {
          if (isDeletingStory) return;
          setStoryDeleteTarget(null);
        }}
        tone="danger"
      />

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
