"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import type { User } from "@/types";

interface AvatarProps {
  user: User;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  ring?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-11 h-11 text-sm",
  xl: "w-14 h-14 text-base",
};

export default function Avatar({
  user,
  size = "md",
  onClick,
  ring = false,
  className = "",
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [user.avatarUrl]);

  const classes = [
    "relative flex-shrink-0 rounded-full flex items-center justify-content-center",
    "bg-gradient-to-br",
    user.avatarGradient,
    sizeMap[size],
    ring ? "ring-2 ring-border-mid ring-offset-1 ring-offset-base" : "",
    onClick ? "cursor-pointer hover:scale-105 transition-transform duration-150" : "cursor-default",
    className,
  ].join(" ");

  const fallbackInitial = (user.avatarInitial || user.displayName?.[0] || user.username?.[0] || "").toUpperCase();

  const content = user.avatarUrl && !imageFailed ? (
    <Image
      src={user.avatarUrl}
      alt={user.displayName}
      fill
      sizes="56px"
      className="object-cover rounded-full"
      onError={() => setImageFailed(true)}
    />
  ) : (
    fallbackInitial ? (
      <span className="font-bold text-white leading-none select-none">{fallbackInitial}</span>
    ) : (
      <UserRound size={size === "xs" ? 12 : size === "sm" ? 14 : size === "md" ? 16 : 18} className="text-white/90" />
    )
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={classes}
        aria-label={user.displayName}
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={classes}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      aria-hidden="true"
    >
      {content}
    </div>
  );
}
