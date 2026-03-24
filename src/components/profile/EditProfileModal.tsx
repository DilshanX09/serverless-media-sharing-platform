"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import NextImage from "next/image";
import { X, Camera, Loader2, CheckCircle, UserRound } from "lucide-react";
import type { User } from "@/types";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";
import { logError } from "@/lib/logger";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (nextUser: Partial<User>) => Promise<void> | void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  onSave,
}: EditProfileModalProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [fullName, setFullName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "success">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCropping, setIsCropping] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleClose = useCallback(() => {
    setStatus("idle");
    onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "saving") handleClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, status, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    setAvatarUrl(user.avatarUrl || "");
    setFullName(user.displayName);
    setUsername(user.username);
    setBio(user.bio ?? "");
  }, [isOpen, user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImageUrl(url);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCropComplete = useCallback((_: Area, nextCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!originalImageUrl || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(originalImageUrl, croppedAreaPixels);
      setAvatarUrl(croppedImage);
      setIsCropping(false);
    } catch (e) {
      logError("Failed to crop image", e);
      alert("Failed to crop image.");
    }
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setOriginalImageUrl("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      await onSave({
        displayName: fullName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl || undefined,
        avatarInitial: (fullName.trim()[0] || username.trim()[0] || "U").toUpperCase(),
      });
      setStatus("success");
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setStatus("idle");
      alert("Failed to save profile.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) =>
        e.target === e.currentTarget && status !== "saving" && handleClose()
      }
    >
      <div
        className="bg-surface border border-border-strong rounded-3xl w-full max-w-[480px] overflow-hidden shadow-2xl animate-modal-pop flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-[62px] border-b border-border-soft shrink-0">
          <div className="w-8" />
          <h2 className="flex-1 text-center text-[16px] font-bold text-ink">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={status === "saving"}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {status === "success" ? (
          <div className="p-16 flex flex-col items-center justify-center gap-4 text-center h-[400px]">
            <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center animate-[modalPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
              <CheckCircle size={32} className="text-brand" />
            </div>
            <div>
              <p className="text-[18px] font-bold text-ink mb-1">Profile Updated</p>
              <p className="text-[14px] text-ink-2">Your changes have been saved.</p>
            </div>
          </div>
        ) : isCropping ? (
          <div className="flex flex-col h-[500px]">
            <div className="relative flex-1 bg-black">
              <Cropper
                image={originalImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-5 flex flex-col gap-4 bg-surface shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-ink-3 text-[12px] font-bold tracking-wider">ZOOM</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-brand h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink font-bold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="flex-1 bg-ink hover:opacity-90 text-base font-bold py-3 rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-surface-3 bg-surface-2">
                  {avatarUrl ? (
                    <NextImage
                      src={avatarUrl}
                      alt="Avatar"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-3 text-2xl font-bold uppercase pb-1">
                      {username?.[0] ? username[0] : <UserRound size={24} />}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center gap-1">
                  <Camera size={20} className="text-white" />
                  <span className="text-[10px] uppercase font-bold text-white tracking-widest">Edit</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-1.5 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-base border border-border-mid rounded-xl px-4 py-3 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/40 focus:bg-surface transition-all"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-1.5 ml-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 font-semibold">@</span>
                  <input
                    type="text"
                    value={username}
                    readOnly
                    className="w-full bg-surface-2 border border-border-soft rounded-xl pl-9 pr-4 py-3 text-[14px] text-ink-2"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                  <label className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide">
                    Bio
                  </label>
                  <span className="text-[11px] text-ink-3">{bio.length}/160</span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  placeholder="Write a short bio..."
                  rows={3}
                  className="w-full bg-base border border-border-mid rounded-xl px-4 py-3 text-[14px] text-ink placeholder-ink-3 outline-none focus:border-brand/40 focus:bg-surface transition-all resize-none"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={status === "saving" || !fullName || !username}
              className="w-full bg-ink hover:opacity-90 disabled:bg-surface-3 disabled:text-ink-3 disabled:cursor-not-allowed text-base text-[15px] font-bold py-3.5 rounded-xl transition-all mt-6 flex items-center justify-center gap-2"
            >
              {status === "saving" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
