"use client";

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
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex-shrink-0 rounded-full flex items-center justify-content-center",
        "bg-gradient-to-br",
        user.avatarGradient,
        sizeMap[size],
        ring ? "ring-2 ring-[#2a2a2a] ring-offset-1 ring-offset-[#111]" : "",
        onClick ? "cursor-pointer hover:scale-105 transition-transform duration-150" : "cursor-default",
        className,
      ].join(" ")}
      aria-label={user.displayName}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <span className="font-bold text-white leading-none select-none">
        {user.avatarInitial}
      </span>
    </button>
  );
}
