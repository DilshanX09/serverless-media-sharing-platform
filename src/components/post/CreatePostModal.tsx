"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  X,
  ImagePlus,
  Video,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Tag,
  FileText,
  Loader2,
  CheckCircle,
  Upload,
  RefreshCw,
} from "lucide-react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: "post" | "reel";
  onPublished?: () => void;
}

type Step = "select" | "preview" | "details" | "publishing" | "done";

interface MediaFile {
  file: File;
  url: string;
  type: "image" | "video";
  name: string;
  sizeLabel: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function CreatePostModal({
  isOpen,
  onClose,
  initialType = "post",
  onPublished,
}: CreatePostModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [captionCount, setCaptionCount] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (media?.url) URL.revokeObjectURL(media.url);
    setMedia(null);
    setCaption("");
    setTags("");
    setStep("select");
    setPublishError(null);
    setIsDragging(false);
    onClose();
  }, [media?.url, onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  // Revoke object URLs on unmount / media change
  useEffect(() => {
    return () => {
      if (media?.url) URL.revokeObjectURL(media.url);
    };
  }, [media]);


  const processFile = useCallback((file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      alert("Please select an image or video file.");
      return;
    }
    if (initialType === "reel" && !isVideo) {
      alert("Reels must be uploaded as video.");
      return;
    }
    if (media?.url) URL.revokeObjectURL(media.url);
    const url = URL.createObjectURL(file);
    setMedia({
      file,
      url,
      type: isImage ? "image" : "video",
      name: file.name,
      sizeLabel: formatBytes(file.size),
    });
    setStep("preview");
  }, [initialType, media?.url]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handlePublish = async () => {
    if (!media) return;
    setPublishError(null);
    setStep("publishing");

    try {
      const normalizedTags = tags
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
      const captionBase = caption.trim();
      const fullCaption = [captionBase, normalizedTags.join(" ")].filter(Boolean).join("\n\n");
      const mediaType = media.type === "video" ? "VIDEO" : "IMAGE";
      const sasResponse = await fetch("/api/upload/sas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: media.name,
          mediaType,
        }),
      });
      if (!sasResponse.ok) {
        const payload = (await sasResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to request upload URL.");
      }

      const sasData = (await sasResponse.json()) as {
        uploadUrl: string;
        blobUrl: string;
      };

      const uploadResponse = await fetch(sasData.uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": media.file.type || "application/octet-stream",
        },
        body: media.file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Blob upload failed.");
      }

      const postResponse = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          blobUrl: sasData.blobUrl,
          mediaType,
          caption: fullCaption,
        }),
      });
      if (!postResponse.ok) {
        const payload = (await postResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to create post.");
      }

      setStep("done");
      router.refresh();
      onPublished?.();
    } catch (error) {
      setStep("details");
      setPublishError(error instanceof Error ? error.message : "Failed to publish post.");
    }
  };

  const acceptTypes =
    "image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime,video/mov";

  const primaryButtonClass =
    "w-full flex items-center justify-center gap-2 bg-ink hover:opacity-90 text-base text-[15px] font-bold py-3 rounded-xl transition-all";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) =>
        e.target === e.currentTarget && step !== "publishing" && handleClose()
      }
    >
      {/* Modal */}
      <div
        className="bg-surface border border-border-mid rounded-3xl w-full overflow-hidden shadow-2xl"
        style={{
          maxWidth: step === "details" ? "820px" : "540px",
          maxHeight: "92vh",
          animation: "modalPop 0.25s cubic-bezier(0.34,1.4,0.64,1)",
          transition: "max-width 0.3s ease",
        }}
      >
        {/* ───── STEP: SELECT ───── */}
        {step === "select" && (
          <>
            <ModalHeader
              title={initialType === "reel" ? "Create new reel" : "Create new post"}
              onClose={handleClose}
            />
            <div className="p-6">
              {/* Drop zone */}
              <div
                className={[
                  "relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-5 cursor-pointer transition-all duration-200",
                  isDragging
                    ? "border-brand bg-brand/5 scale-[1.01]"
                    : "border-border-mid hover:border-border-strong hover:bg-white/[0.02]",
                ].join(" ")}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                {/* Icon cluster */}
                <div className="flex items-end justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-3 border border-border-soft flex items-center justify-center rotate-[-6deg] shadow-xl">
                    <ImageIcon size={26} className="text-ink-3" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center z-10 shadow-2xl">
                    <Upload size={28} className="text-brand" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-surface-3 border border-border-soft flex items-center justify-center rotate-[6deg] shadow-xl">
                    <Video size={26} className="text-ink-3" />
                  </div>
                </div>

                <div className="text-center">
                    <p className="text-[17px] font-bold text-ink mb-1.5">
                      Drop your media here
                    </p>
                    <p className="text-[14px] text-ink-3 mb-5 leading-relaxed">
                      Drag & drop or click to choose a<br />
                      single image or video
                    </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 bg-ink hover:opacity-90 text-base text-[14px] font-bold px-5 py-2.5 rounded-xl transition-all"
                    >
                      <ImagePlus size={17} strokeWidth={2.5} />
                      Choose file
                    </button>
                  </div>
                </div>

                {/* Format hints */}
                <div className="flex items-center gap-4 mt-2">
                  <FormatBadge
                    icon={<ImageIcon size={12} />}
                    label="JPG, PNG, GIF, WEBP"
                  />
                  <span className="w-px h-4 bg-border-soft" />
                  <FormatBadge
                    icon={<Video size={12} />}
                    label="MP4, MOV, WEBM"
                  />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes}
                className="hidden"
                onChange={handleFileInput}
              />

              <p className="text-center text-[12px] text-ink-3 mt-4">
                Max file size: 100 MB &nbsp;·&nbsp; One file at a time
              </p>
            </div>
          </>
        )}

        {/* ───── STEP: PREVIEW ───── */}
        {step === "preview" && media && (
          <>
            <ModalHeader
              title="Preview"
              onClose={handleClose}
              leftAction={
                <button
                  type="button"
                  onClick={() => {
                    setStep("select");
                    setMedia(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-3 transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
              }
            />
            <div className="p-5">
              {/* Media Preview */}
              <div className="rounded-2xl overflow-hidden bg-base border border-border-soft mb-4 relative">
                {media.type === "image" ? (
                  <div className="relative w-full max-h-[420px] aspect-square">
                    <NextImage
                      src={media.url}
                      alt="Preview"
                      fill
                      sizes="540px"
                      unoptimized
                      className="object-contain"
                      style={{ background: "var(--bg-base)" }}
                    />
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={media.url}
                    controls
                    className="w-full max-h-[420px]"
                    style={{ background: "var(--bg-base)" }}
                  />
                )}
                {/* Type badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-border-mid">
                  {media.type === "image" ? (
                    <ImageIcon size={13} />
                  ) : (
                    <Video size={13} />
                  )}
                  {media.type === "image" ? "Image" : "Video"}
                </div>
              </div>

              {/* File info */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-base border border-border-soft mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-3 border border-border-soft flex-shrink-0">
                  {media.type === "image" ? (
                    <ImageIcon size={18} className="text-brand" />
                  ) : (
                    <Video size={18} className="text-brand" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink truncate">
                    {media.name}
                  </p>
                  <p className="text-[12px] text-ink-3 mt-0.5">
                    {media.sizeLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMedia(null);
                    setStep("select");
                  }}
                  className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink transition-colors px-2 py-1"
                >
                  <RefreshCw size={13} />
                  Change
                </button>
              </div>

              {/* Next */}
              <button
                type="button"
                onClick={() => setStep("details")}
                className={primaryButtonClass}
              >
                Add Details
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </>
        )}

        {/* ───── STEP: DETAILS ───── */}
        {step === "details" && media && (
          <>
            <ModalHeader
              title="Post details"
              onClose={handleClose}
              leftAction={
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-3 transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
              }
            />
            <div
              className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
              style={{ maxHeight: "calc(92vh - 64px)" }}
            >
              {/* Left: Preview thumbnail (desktop) */}
              <div className="hidden md:flex flex-col w-[320px] flex-shrink-0 bg-base border-r border-border-soft p-5 gap-4">
                <div className="rounded-2xl overflow-hidden border border-border-soft bg-base">
                  {media.type === "image" ? (
                    <div className="relative w-full" style={{ maxHeight: "320px", aspectRatio: "1 / 1" }}>
                      <NextImage
                        src={media.url}
                        alt="Preview"
                        fill
                        sizes="320px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <video
                      src={media.url}
                      className="w-full"
                      style={{ maxHeight: "320px" }}
                      loop
                      muted
                      autoPlay
                      playsInline
                    />
                  )}
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border-soft">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-3">
                    {media.type === "image" ? (
                      <ImageIcon size={15} className="text-brand" />
                    ) : (
                      <Video size={15} className="text-brand" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {media.name}
                    </p>
                    <p className="text-[11px] text-ink-3">{media.sizeLabel}</p>
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-5 space-y-4 flex-1">
                  {publishError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-200">
                      {publishError}
                    </div>
                  ) : null}

                  {/* Caption */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 uppercase tracking-wide mb-2">
                      <FileText size={13} />
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => {
                        setCaption(e.target.value);
                        setCaptionCount(e.target.value.length);
                      }}
                      placeholder="Write a caption, share a thought…"
                      maxLength={2200}
                      rows={5}
                      className="w-full bg-base border border-border-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/30 focus:bg-surface resize-none transition-all leading-relaxed"
                    />
                    <p className="text-right text-[12px] text-ink-3 mt-1">
                      {captionCount} / 2200
                    </p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 uppercase tracking-wide mb-2">
                      <Tag size={13} />
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="#photography #travel #nature"
                      className="w-full bg-base border border-border-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/30 focus:bg-surface transition-all"
                    />
                    <p className="text-[12px] text-ink-3 mt-1.5">
                      Separate tags with spaces
                    </p>
                  </div>

                  {/* Audience notice */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-brand/5 border border-brand/10">
                    <span className="text-lg mt-0.5">🌍</span>
                    <div>
                      <p className="text-[13px] font-semibold text-brand/90">
                        Public post
                      </p>
                      <p className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">
                        Everyone on mini.insta can see this post.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Publish button */}
                <div className="p-5 pt-0 border-t border-border-soft mt-2">
                  <button
                    type="button"
                    onClick={handlePublish}
                    className={primaryButtonClass}
                  >
                    {initialType === "reel" ? "Share reel" : "Share post"}
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ───── STEP: PUBLISHING ───── */}
        {step === "publishing" && (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-brand/20 flex items-center justify-center">
                <Loader2 size={36} className="text-brand animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[18px] font-bold text-ink mb-1.5">
                Sharing your post…
              </p>
              <p className="text-[14px] text-ink-3">
                Uploading your {media?.type ?? "media"}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full max-w-[280px] h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ animation: "publishProgress 2.2s ease-out forwards" }}
              />
            </div>
            <style jsx>{`
              @keyframes publishProgress {
                0% {
                  width: 0%;
                }
                60% {
                  width: 75%;
                }
                100% {
                  width: 100%;
                }
              }
            `}</style>
          </div>
        )}

        {/* ───── STEP: DONE ───── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
              <CheckCircle
                size={40}
                className="text-brand"
                strokeWidth={1.8}
              />
            </div>
            <div>
              <p className="text-[20px] font-bold text-ink mb-2">
                {initialType === "reel" ? "Reel shared! 🎉" : "Post shared! 🎉"}
              </p>
              <p className="text-[14px] text-ink-3 leading-relaxed">
                Your {media?.type === "video" ? "video" : "photo"} has been
                shared
                <br />
                with your followers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleClose();
                router.refresh();
              }}
              className="mt-2 px-8 py-2.5 bg-ink hover:opacity-90 text-base text-[14px] font-bold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function ModalHeader({
  title,
  onClose,
  leftAction,
}: {
  title: string;
  onClose: () => void;
  leftAction?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 h-[60px] border-b border-border-soft flex-shrink-0">
      <div className="w-8 flex items-center justify-start">
        {leftAction ?? <span />}
      </div>
      <h2 className="flex-1 text-center text-[15px] font-bold text-ink">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-3 transition-all"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function FormatBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink-3 font-medium">
      <span className="text-ink-3">{icon}</span>
      {label}
    </div>
  );
}
