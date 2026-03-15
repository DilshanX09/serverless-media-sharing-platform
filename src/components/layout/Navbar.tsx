"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  PlusSquare,
  Bell,
  MessageCircle,
  Moon,
  Sun,
} from "lucide-react";
import { currentUser } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";
import CreatePostModal from "@/components/post/CreatePostModal";
import { useTheme } from "next-themes";
import { useEffect } from "react";

interface NavbarProps {
  onAddPost?: () => void;
  onLoginClick?: () => void;
}

export default function Navbar({ onAddPost, onLoginClick }: NavbarProps) {
  const [notifSeen, setNotifSeen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-[62px] bg-base/95 backdrop-blur-2xl border-b border-border-soft flex items-center px-4 sm:px-6 lg:px-10 gap-3">

        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-1.5 cursor-pointer select-none group flex-shrink-0"
          onClick={() => router.push("/")}
        >
          <span className="text-[20px] font-black tracking-tighter text-white group-hover:text-white/90 transition-colors font-mono">
            mini
          </span>
          <span className="text-[20px] font-black tracking-tighter text-brand group-hover:text-brand/90 transition-colors font-mono">
            .insta
          </span>
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-sm hidden sm:block ml-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-ink-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search people, posts…"
            className="w-full bg-[#1e1e1e] border border-border-soft rounded-xl pl-9 pr-4 py-[9px] text-[14px] text-ink placeholder-ink-3 outline-none focus:border-border-strong focus:bg-surface-3 transition-all"
          />
        </div>

        {/* Nav Actions */}
        <div className="ml-auto flex items-center gap-1.5">

          {/* Theme Toggle */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
              className="w-9 h-9 flex-shrink-0 rounded-xl border border-border-soft bg-transparent text-ink-3 flex items-center justify-center hover:bg-surface-2 hover:text-white hover:border-border-strong transition-all"
            >
              {theme === "dark" ? (
                <Sun size={18} strokeWidth={1.8} className="text-brand" />
              ) : (
                <Moon size={18} strokeWidth={1.8} className="text-ink-3" />
              )}
            </button>
          )}

          {/* Add Post */}
          <button
            type="button"
            onClick={() => {
              if (onAddPost) onAddPost();
              setIsCreateModalOpen(true);
            }}
            title="New post"
            className="w-9 h-9 rounded-xl border border-border-soft bg-transparent text-ink-3 flex items-center justify-center hover:bg-surface-2 hover:text-white hover:border-border-strong transition-all"
          >
            <PlusSquare size={19} strokeWidth={1.8} />
          </button>

          {/* Notifications */}
          <button
            type="button"
            title="Notifications"
            onClick={() => setNotifSeen(true)}
            className="relative w-9 h-9 rounded-xl border border-border-soft bg-transparent text-ink-3 flex items-center justify-center hover:bg-surface-2 hover:text-white hover:border-border-strong transition-all"
          >
            <Bell size={19} strokeWidth={1.8} />
            {!notifSeen && (
              <span className="absolute top-[9px] right-[9px] w-[7px] h-[7px] rounded-full bg-red-500 border-[1.5px] border-[#111]" />
            )}
          </button>

          {/* Messages */}
          <button
            type="button"
            title="Messages"
            className="w-9 h-9 rounded-xl border border-border-soft bg-transparent text-ink-3 hidden md:flex items-center justify-center hover:bg-surface-2 hover:text-white hover:border-border-strong transition-all"
          >
            <MessageCircle size={19} strokeWidth={1.8} />
          </button>

          {/* Avatar */}
          <div className="ml-1">
            <Avatar
              user={currentUser}
              size="sm"
              ring
              onClick={() => router.push(`/profile/@${currentUser.username}`)}
            />
          </div>
        </div>
      </header>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
