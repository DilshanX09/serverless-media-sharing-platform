"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
import { useToast } from "@/components/ui/Toast";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: "post" | "reel";
  onPublished?: () => void;
}

type Step = "select" | "preview" | "details" | "publishing" | "done";
type PublishPhase = "preparing" | "uploading" | "creating";

const FLOW_STEPS = ["Select", "Preview", "Details"] as const;

interface MediaFile {
  file: File;
  url: string;
  type: "image" | "video";
  name: string;
  sizeLabel: string;
}

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_TAGS = 8;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
    ),
  ).slice(0, MAX_TAGS);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLoadedBytes, setUploadLoadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState<number | null>(null);
  const [publishPhase, setPublishPhase] = useState<PublishPhase>("preparing");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadPulseTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const normalizedTagChips = useMemo(() => parseTags(tags), [tags]);
  const captionRemaining = 2200 - captionCount;

  const clearUploadPulseTimer = useCallback(() => {
    if (uploadPulseTimerRef.current !== null) {
      window.clearInterval(uploadPulseTimerRef.current);
      uploadPulseTimerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearUploadPulseTimer();
    if (media?.url) URL.revokeObjectURL(media.url);
    setMedia(null);
    setCaption("");
    setTags("");
    setStep("select");
    setPublishError(null);
    setUploadProgress(0);
    setUploadLoadedBytes(0);
    setUploadTotalBytes(null);
    setPublishPhase("preparing");
    setIsDragging(false);
    onClose();
  }, [clearUploadPulseTimer, media?.url, onClose]);

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
      clearUploadPulseTimer();
      if (media?.url) URL.revokeObjectURL(media.url);
    };
  }, [clearUploadPulseTimer, media]);

  const processFile = useCallback(
    (file: File) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        showToast("Please select an image or video file", "error");
        return;
      }
      if (initialType === "reel" && !isVideo) {
        showToast("Reels must be uploaded as video", "error");
        return;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
        showToast("Image size must be 20 MB or less", "error");
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        showToast("Video size must be 100 MB or less", "error");
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
    },
    [initialType, media?.url, showToast],
  );

  const uploadBlobWithProgress = (
    uploadUrl: string,
    file: File,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      clearUploadPulseTimer();
      setUploadTotalBytes(file.size || null);
      setUploadLoadedBytes(0);
      setUploadProgress(6);

      uploadPulseTimerRef.current = window.setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 92) return prev;
          return prev + 1;
        });
      }, 220);

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          setUploadTotalBytes(event.total);
          setUploadLoadedBytes(event.loaded);
          const percent = Math.min(
            99,
            Math.round((event.loaded / event.total) * 100),
          );
          setUploadProgress((prev) => Math.max(prev, percent));
          return;
        }

        if (event.loaded > 0) {
          setUploadLoadedBytes(event.loaded);
          setUploadProgress((prev) => Math.max(prev, 18));
        }
      };

      xhr.onerror = () => {
        clearUploadPulseTimer();
        reject(new Error("Blob upload failed."));
      };
      xhr.onabort = () => {
        clearUploadPulseTimer();
        reject(new Error("Upload aborted."));
      };
      xhr.onload = () => {
        clearUploadPulseTimer();
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadLoadedBytes(file.size);
          setUploadProgress(100);
          resolve();
          return;
        }
        reject(new Error("Blob upload failed."));
      };

      xhr.send(file);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handlePublish = async () => {
    if (!media) return;
    setPublishError(null);
    setUploadProgress(0);
    setUploadLoadedBytes(0);
    setUploadTotalBytes(media.file.size || null);
    setPublishPhase("preparing");
    setStep("publishing");

    try {
      const normalizedTags = parseTags(tags);
      const captionBase = caption.trim();
      const fullCaption = [captionBase, normalizedTags.join(" ")]
        .filter(Boolean)
        .join("\n\n");
      const mediaType = media.type === "video" ? "VIDEO" : "IMAGE";
      setPublishPhase("preparing");
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
        const payload = (await sasResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to request upload URL.");
      }

      const sasData = (await sasResponse.json()) as {
        uploadUrl: string;
        blobUrl: string;
      };

      setPublishPhase("uploading");
      await uploadBlobWithProgress(sasData.uploadUrl, media.file);

      setPublishPhase("creating");
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
        const payload = (await postResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to create post.");
      }

      setStep("done");
      router.refresh();
      onPublished?.();
      showToast("Post published successfully!", "success");
    } catch (error) {
      setStep("details");
      const msg =
        error instanceof Error ? error.message : "Failed to publish post.";
      setPublishError(msg);
      showToast(msg, "error");
    }
  };

  const acceptTypes =
    "image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime,video/mov";

  const primaryButtonClass =
    "w-full flex items-center justify-center gap-2 bg-ink hover:opacity-90 text-base text-[15px] font-bold py-3 rounded-xl transition-all";

  const safeUploadProgress = Math.min(100, Math.max(0, uploadProgress));

  const publishingPercent =
    publishPhase === "preparing"
      ? Math.max(safeUploadProgress, 8)
      : publishPhase === "uploading"
        ? Math.max(safeUploadProgress, 14)
        : 100;

  const phaseTitle =
    publishPhase === "preparing"
      ? "Preparing secure upload"
      : publishPhase === "uploading"
        ? "Uploading media"
        : "Finalizing post";

  const phaseDescription =
    publishPhase === "preparing"
      ? "Connecting to storage and requesting upload token"
      : publishPhase === "uploading"
        ? `${media?.type === "video" ? "Video" : "Image"} transfer in progress`
        : "Creating the post and refreshing your feed";

  const uploadTransferLabel =
    uploadTotalBytes && uploadTotalBytes > 0
      ? `${formatBytes(uploadLoadedBytes)} / ${formatBytes(uploadTotalBytes)}`
      : uploadLoadedBytes > 0
        ? `${formatBytes(uploadLoadedBytes)} uploaded`
        : "Waiting for transfer data";

  const modalMaxWidth =
    step === "details" ? "920px" : step === "preview" ? "620px" : "540px";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) =>
        e.target === e.currentTarget && step !== "publishing" && handleClose()
      }
    >
      <style>{`
        @keyframes progressFill {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .progress-bar-animated {
          background: #fff;
          background-size: 260% 100%;
          animation: progressFill 1.8s ease-in-out infinite;
        }
      `}</style>
      {/* Modal */}
      <div
        className={[
          "bg-surface rounded-3xl w-full overflow-hidden shadow-2xl",
          step === "done" ? "border-0" : "border border-border-mid",
        ].join(" ")}
        style={{
          maxWidth: modalMaxWidth,
          maxHeight: "92vh",
          animation: "modalPop 0.25s cubic-bezier(0.34,1.4,0.64,1)",
          transition: "max-width 0.3s ease",
        }}
      >
        {/* ───── STEP: SELECT ───── */}
        {step === "select" && (
          <>
            <ModalHeader
              title={
                initialType === "reel" ? "Create new reel" : "Create new post"
              }
              onClose={handleClose}
            />
            <StepPills currentStep={0} />
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

              <div className="mt-4 rounded-xl bg-surface-2 px-3.5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-3">
                  <span>Max size: 100 MB</span>
                  <span>One file only</span>
                  <span>Fast upload starts right away</span>
                </div>
              </div>
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
            <StepPills currentStep={1} />
            <div className="p-5">
              {/* Media Preview */}
              <div className="rounded-2xl overflow-hidden bg-base mb-4 relative border border-surface-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMedia(null);
                    setStep("select");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-surface-2 hover:bg-surface-3 text-ink text-[14px] font-semibold py-3 rounded-xl transition-colors"
                >
                  <RefreshCw size={16} />
                  Replace media
                </button>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className={primaryButtonClass}
                >
                  Add Details
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
              </div>
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
            <StepPills currentStep={2} />
            <div
              className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
              style={{ maxHeight: "calc(92vh - 64px)" }}
            >
              {/* Left: Preview thumbnail (desktop) */}
              <div className="hidden md:flex flex-col w-[420px] flex-shrink-0 bg-base p-5 gap-5 items-center justify-start">
                <div className="w-full rounded-3xl overflow-hidden bg-surface-2 aspect-square">
                  {media.type === "image" ? (
                    <div className="relative w-full h-full">
                      <NextImage
                        src={media.url}
                        alt="Preview"
                        fill
                        sizes="420px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      loop
                      muted
                      autoPlay
                      playsInline
                    />
                  )}
                </div>
                <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-2/50">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-3 flex-shrink-0">
                    {media.type === "image" ? (
                      <ImageIcon size={14} className="text-brand" />
                    ) : (
                      <Video size={14} className="text-brand" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-ink truncate">
                      {media.name}
                    </p>
                    <p className="text-[11px] text-ink-3 leading-tight">
                      {media.sizeLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-5 space-y-4 flex-1">
                  <div className="md:hidden rounded-xl bg-surface-2/40 p-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-3 flex-shrink-0">
                        {media.type === "image" ? (
                          <ImageIcon size={14} className="text-brand" />
                        ) : (
                          <Video size={14} className="text-brand" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-[12px]">
                        <p className="font-medium text-ink truncate">
                          {media.name}
                        </p>
                        <p className="text-ink-3 text-[11px]">
                          {media.sizeLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {publishError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-200">
                      {publishError}
                    </div>
                  ) : null}

                  {/* Caption */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 uppercase tracking-wider mb-3">
                      <FileText size={12} />
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => {
                        setCaption(e.target.value);
                        setCaptionCount(e.target.value.length);
                      }}
                      placeholder="Write a message, share your thoughts…"
                      maxLength={2200}
                      rows={5}
                      className="w-full bg-base border border-surface-3 rounded-2xl px-4 py-3 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/50 focus:bg-surface-2/50 resize-none transition-all leading-relaxed"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span
                        className={
                          captionRemaining < 120
                            ? "text-amber-400"
                            : "text-ink-3"
                        }
                      >
                        {captionRemaining} left
                      </span>
                      <span className="text-ink-3">{captionCount} / 2200</span>
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${captionCount > 1900 ? "bg-amber-400" : "bg-brand/75"}`}
                        style={{
                          width: `${Math.min(100, (captionCount / 2200) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 uppercase tracking-wider mb-3">
                      <Tag size={12} />
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      onBlur={() => {
                        if (!tags.trim()) return;
                        setTags(normalizedTagChips.join(" "));
                      }}
                      placeholder="photo, travel, nature"
                      className="w-full bg-base border border-surface-3 rounded-2xl px-4 py-3 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/50 focus:bg-surface-2/50 transition-all"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                      <span>Spaces or commas</span>
                      <span>
                        {normalizedTagChips.length} / {MAX_TAGS}
                      </span>
                    </div>
                    {normalizedTagChips.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {normalizedTagChips.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand/12 text-brand"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Publish button */}
                <div className="p-5 mt-auto">
                  <button
                    type="button"
                    onClick={handlePublish}
                    className={primaryButtonClass}
                  >
                    {initialType === "reel" ? "Share reel" : "Share post"}
                    <ArrowRight size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ───── STEP: PUBLISHING ───── */}
        {step === "publishing" && (
          <div className="py-8 px-4 sm:px-7">
            <div className="relative overflow-hidden rounded-xl p-4 sm:p-6">
              <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-brand/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 w-44 h-44 rounded-full bg-brand/15 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 flex items-center justify-center">
                    {publishPhase === "creating" ? (
                      <Upload size={24} className="text-brand" />
                    ) : (
                      <Loader2 size={24} className="text-brand animate-spin" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[18px] font-bold text-ink">
                      Publishing your post
                    </p>
                    <p className="text-[13px] text-ink-3">
                      {phaseTitle} • {publishingPercent}%
                    </p>
                  </div>
                </div>

                <div className="mb-2.5 rounded-xl bg-surface-2/70 py-2.5 text-[12px] text-ink-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>{phaseDescription}</span>
                    <span className="text-ink">{uploadTransferLabel}</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full progress-bar-animated rounded-full transition-all duration-200"
                    style={{ width: `${publishingPercent}%` }}
                  />
                </div>

                <div className="mt-4 rounded-xl bg-surface-2/55 py-2 text-[11px] text-ink-3">
                  <div className="flex items-center justify-between gap-2">
                    <span>Keep this window open until publish completes</span>
                    <span className="text-ink">{publishingPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── STEP: DONE ───── */}
        {step === "done" && (
          <div className="px-6 py-9 sm:px-8 sm:py-10">
            <div className="rounded-3xl bg-gradient-to-br from-surface-2/70 to-surface-3/35 p-8 sm:p-9 text-center">
              <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-brand/12 flex items-center justify-center">
                <CheckCircle
                  size={40}
                  className="text-brand"
                  strokeWidth={1.9}
                />
              </div>
              <p className="text-[20px] font-bold text-ink mb-2">
                {initialType === "reel" ? "Reel shared!" : "Post shared!"}
              </p>
              <p className="text-[14px] text-ink-3 leading-relaxed">
                Your {media?.type === "video" ? "video" : "photo"} is now live
                on your profile.
              </p>

              <button
                type="button"
                onClick={() => {
                  handleClose();
                  router.refresh();
                }}
                className="mt-6 px-8 py-2.5 bg-ink hover:opacity-90 text-base text-[14px] font-bold rounded-full transition-all"
              >
                Done
              </button>
            </div>
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

function StepPills({ currentStep }: { currentStep: number }) {
  return (
    <div className="px-5 py-2.5 border-b border-border-soft bg-surface-2/45">
      <div className="flex items-center gap-2">
        {FLOW_STEPS.map((label, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <div
              key={label}
              className={[
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                isActive
                  ? "bg-brand/15 text-brand"
                  : isDone
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-surface-3 text-ink-3",
              ].join(" ")}
            >
              {label}
            </div>
          );
        })}
      </div>
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
