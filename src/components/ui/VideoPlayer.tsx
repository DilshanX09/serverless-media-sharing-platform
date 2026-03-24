"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onReady?: () => void;
  onTimeUpdate?: (
    progress: number,
    currentTime: number,
    duration: number,
  ) => void;
  onEnded?: () => void;
  showSeekBar?: boolean;
  showPlayButton?: boolean;
  showMuteButton?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({
  src,
  poster,
  className = "",
  autoPlay = true,
  loop = true,
  muted: initialMuted = true,
  onReady,
  onTimeUpdate,
  onEnded,
  showSeekBar = true,
  showPlayButton = true,
  showMuteButton = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVolumeRef = useRef(1);
  const isSeekingRef = useRef(false);
  const isAdjustingVolumeRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(initialMuted ? 0 : 1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setIsInitialLoading(true);
    setIsReady(false);
    setShowControls(false);
    setShowVolumeSlider(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsMuted(initialMuted);
    setVolume(initialMuted ? 0 : 1);
    prevVolumeRef.current = initialMuted ? 1 : 1;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : volume;
  }, [isMuted, volume]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const apply = (matches: boolean) => setIsTouchDevice(matches);
    apply(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => apply(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(
      () => {
        const video = videoRef.current;
        if (
          video &&
          !video.paused &&
          !isSeekingRef.current &&
          !isAdjustingVolumeRef.current
        ) {
          setShowControls(false);
        }
      },
      isTouchDevice ? 3600 : 2000,
    );
  };

  const revealControls = () => {
    setShowControls(true);
    hideControlsAfterDelay();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      setIsMuted(false);
      setVolume(video.volume);
    } else {
      prevVolumeRef.current = video.volume;
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleSeek = (clientX: number) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || !Number.isFinite(video.duration)) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const newTime = percent * video.duration;
    if (Number.isFinite(newTime)) {
      video.currentTime = newTime;
      setProgress(percent * 100);
      setCurrentTime(newTime);
    }
  };

  const handleVolumeAdjust = (clientY: number) => {
    const video = videoRef.current;
    const bar = volumeBarRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.bottom - clientY, rect.height));
    const percent = y / rect.height;
    video.volume = percent;
    video.muted = percent === 0;
    setVolume(percent);
    setIsMuted(percent === 0);
    if (percent > 0) prevVolumeRef.current = percent;
  };

  // Seek event handlers
  const onSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isSeekingRef.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    handleSeek(clientX);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      handleSeek(cx);
    };
    const onEnd = () => {
      isSeekingRef.current = false;
      hideControlsAfterDelay();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  };

  // Volume event handlers
  const onVolumeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isAdjustingVolumeRef.current = true;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    handleVolumeAdjust(clientY);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      handleVolumeAdjust(cy);
    };
    const onEnd = () => {
      isAdjustingVolumeRef.current = false;
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
      volumeTimeoutRef.current = setTimeout(
        () => setShowVolumeSlider(false),
        1000,
      );
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  };

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`relative ${className}`}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (!isReady || isInitialLoading) return;
        if (isTouchDevice) {
          togglePlay();
          setShowControls(true);
          hideControlsAfterDelay();
          return;
        }
        revealControls();
      }}
      onMouseMove={() => {
        if (isReady) revealControls();
      }}
      onMouseLeave={() => {
        if (!isSeekingRef.current && !isAdjustingVolumeRef.current) {
          setShowControls(false);
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        preload="auto"
        className="w-full h-full object-contain"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onLoadStart={() => {
          setIsInitialLoading(true);
          setIsReady(false);
        }}
        onLoadedData={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
          setIsInitialLoading(false);
          setIsReady(true);
          onReady?.();
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        onCanPlayThrough={() => {
          if (!isReady) {
            setIsInitialLoading(false);
            setIsReady(true);
            onReady?.();
          }
        }}
        onPlaying={() => {
          setIsPlaying(true);
          hideControlsAfterDelay();
        }}
        onPlay={() => {
          setIsPlaying(true);
          hideControlsAfterDelay();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (controlsTimeoutRef.current)
            clearTimeout(controlsTimeoutRef.current);
        }}
        onTimeUpdate={(e) => {
          const { currentTime: ct, duration: d } = e.currentTarget;
          if (Number.isFinite(d) && d > 0 && !isSeekingRef.current) {
            setProgress((ct / d) * 100);
            setCurrentTime(ct);
            onTimeUpdate?.((ct / d) * 100, ct, d);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onVolumeChange={(e) => {
          setIsMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onError={() => {
          setIsInitialLoading(false);
          setIsReady(false);
        }}
      />

      {isInitialLoading && (
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/40 via-black/60 to-black/75 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 border border-white/20 backdrop-blur-sm">
            <Loader2 size={14} className="text-white animate-spin" />
            <span className="text-[11px] tracking-wide uppercase text-white/90 font-semibold">
              Loading video
            </span>
          </div>
        </div>
      )}

      {/* Large center play/pause button */}
      {showPlayButton && !isInitialLoading && (
        <div
          className={[
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-20",
            showControls || !isPlaying
              ? "opacity-100"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/60 hover:scale-105 transition-all"
          >
            {isPlaying ? (
              <Pause size={24} className="text-white md:w-7 md:h-7" />
            ) : (
              <Play
                size={24}
                className="text-white fill-white ml-1 md:w-7 md:h-7"
              />
            )}
          </button>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className={[
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 transition-opacity duration-300 z-30",
          !isInitialLoading && (showControls || !isPlaying)
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {/* Seekbar */}
          {showSeekBar && (
            <div
              ref={seekBarRef}
              className="flex-1 h-7 flex items-center cursor-pointer select-none relative group/seek"
              onMouseDown={onSeekStart}
              onTouchStart={onSeekStart}
            >
              <div className="relative w-full h-1 group-hover/seek:h-1.5 bg-white/30 rounded-full overflow-hidden transition-all">
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Thumb */}
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{
                  left: `${progress}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
          )}

          {/* Time */}
          <span className="text-[11px] text-white font-medium tabular-nums whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Volume */}
          {showMuteButton && (
            <div
              className="relative"
              onMouseEnter={() => {
                if (volumeTimeoutRef.current)
                  clearTimeout(volumeTimeoutRef.current);
                setShowVolumeSlider(true);
              }}
              onMouseLeave={() => {
                if (!isAdjustingVolumeRef.current) {
                  volumeTimeoutRef.current = setTimeout(
                    () => setShowVolumeSlider(false),
                    600,
                  );
                }
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showVolumeSlider) {
                    if (volumeTimeoutRef.current)
                      clearTimeout(volumeTimeoutRef.current);
                    setShowVolumeSlider(true);
                    return;
                  }
                  toggleMute();
                }}
                className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              >
                <VolumeIcon size={18} className="text-white" />
              </button>

              {/* Volume slider */}
              <div
                className={[
                  "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-3 bg-black/85 backdrop-blur-sm rounded-lg transition-all duration-200",
                  showVolumeSlider
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-90 pointer-events-none",
                ].join(" ")}
              >
                <div
                  ref={volumeBarRef}
                  className="w-5 h-20 flex items-end justify-center cursor-pointer select-none relative"
                  onMouseDown={onVolumeStart}
                  onTouchStart={onVolumeStart}
                >
                  <div className="relative w-1 h-full bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-white rounded-full"
                      style={{ height: `${volume * 100}%` }}
                    />
                  </div>
                  <div
                    className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none"
                    style={{
                      bottom: `${volume * 100}%`,
                      transform: "translateY(50%)",
                      left: "50%",
                      marginLeft: "-6px",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
