"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  ImagePlus,
  Video,
  House,
  Moon,
  Sun,
  X,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import CreatePostModal from "@/components/post/CreatePostModal";
import { useTheme } from "next-themes";
import type { User } from "@/types";
import axios from "axios";
import Image from "next/image";

interface NavbarProps {
  onPostPublished?: () => void;
  currentUserData?: User;
  searchableUsersData?: User[];
  isAuthLoading?: boolean;
}

export default function Navbar({
  onPostPublished,
  currentUserData,
  searchableUsersData,
  isAuthLoading: externalLoading = false,
}: NavbarProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [createType, setCreateType] = useState<"post" | "reel">("post");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [internalUser, setInternalUser] = useState<User | null>(null);
  const [internalLoading, setInternalLoading] = useState(!currentUserData);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Use external user if provided, otherwise use internally fetched
  const navUser = currentUserData ?? internalUser;
  const isAuthLoading = currentUserData ? externalLoading : internalLoading;

  // Fetch current user if not provided externally
  useEffect(() => {
    if (currentUserData) return;
    let mounted = true;
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/auth/me", { withCredentials: true });
        if (mounted && res.data?.user) {
          setInternalUser(res.data.user);
        }
      } catch {
        // Not logged in
      } finally {
        if (mounted) setInternalLoading(false);
      }
    };
    fetchUser();
    return () => {
      mounted = false;
    };
  }, [currentUserData]);

  const searchableUsers = useMemo(() => {
    if (!searchableUsersData) return [];
    if (!navUser) return searchableUsersData;
    return searchableUsersData.filter((user) => user.id !== navUser.id);
  }, [searchableUsersData, navUser]);

  const filteredUsers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return searchableUsers.slice(0, 8);
    return searchableUsers
      .filter(
        (user) =>
          user.username.toLowerCase().includes(term) ||
          user.displayName.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [searchQuery, searchableUsers]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSearchOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isCreateMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [isCreateMenuOpen]);

  useEffect(() => {
    if (!navUser?.username) return;
    router.prefetch(`/profile/@${navUser.username}`);
  }, [navUser?.username, router]);

  const openCreateModal = (type: "post" | "reel") => {
    setCreateType(type);
    setIsCreateMenuOpen(false);
    setIsCreateModalOpen(true);
  };

  const navButtonClass =
    "w-11 h-11 rounded-full text-ink-2 flex items-center justify-center hover:bg-surface-2 hover:text-ink transition-all";
  const currentPath = pathname ?? "/";
  const isHomeActive = currentPath === "/";
  const isProfileActive =
    Boolean(navUser?.username) &&
    currentPath.startsWith(`/profile/@${navUser?.username}`);

  // Keep SSR and first client render identical to avoid hydration mismatch.
  const activeTheme = isMounted ? (resolvedTheme ?? theme ?? "dark") : "dark";

  const logo =
    activeTheme === "dark" ? "/assets/dark-logo.png" : "/assets/light-logo.png";

  return (
    <>
      {/* Desktop left rail */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-[80px] border-r border-border-soft bg-base/95 backdrop-blur-xl flex-col items-center py-4">
        <button
          type="button"
          className="mt-8 mb-8 text-[30px] font-black tracking-tight text-ink"
          onClick={() => router.push("/")}
          style={{ fontFamily: "ap" }}
        >
          <Image
            src={logo}
            alt="Logo"
            className="rounded-md"
            width={35}
            height={35}
          />
        </button>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            title="Home"
            className={`${navButtonClass}`}
          >
            <House size={20} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(true);
              setSearchQuery("");
            }}
            title="Search"
            className={navButtonClass}
          >
            <Search size={20} strokeWidth={2} />
          </button>

          {navUser ? (
            <div className="relative" ref={createMenuRef}>
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen((prev) => !prev)}
                title="Create"
                className={`${navButtonClass} hover:opacity-90 hover:bg-ink`}
              >
                <Plus
                  size={20}
                  strokeWidth={2.4}
                  color={activeTheme === "dark" ? "#fff" : "#000"}
                />
              </button>

              <AnimatePresence>
                {isCreateMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-full ml-3 top-0 w-[180px] p-1.5 rounded-xl border border-border-soft bg-surface shadow-2xl z-[90]"
                  >
                    <button
                      type="button"
                      onClick={() => openCreateModal("post")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors text-left"
                    >
                      <span className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center">
                        <ImagePlus size={15} className="text-ink-2" />
                      </span>
                      <span className="text-[14px] font-medium text-ink">
                        Post
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openCreateModal("reel")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors text-left"
                    >
                      <span className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center">
                        <Video size={15} className="text-ink-2" />
                      </span>
                      <span className="text-[14px] font-medium text-ink">
                        Reel
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setTheme(activeTheme === "dark" ? "light" : "dark");
            }}
            title="Toggle theme"
            className={navButtonClass}
          >
            {!isMounted ? (
              <span className="w-[20px] h-[20px]" aria-hidden="true" />
            ) : activeTheme === "dark" ? (
              <Sun size={20} strokeWidth={1.9} className="text-brand" />
            ) : (
              <Moon size={20} strokeWidth={1.9} className="text-ink-3" />
            )}
          </button>
        </div>

        <div className="mt-auto mb-2">
          {navUser ? (
            <Link
              href={`/profile/@${navUser.username}`}
              prefetch={true}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${isProfileActive ? "bg-surface-2" : "hover:bg-surface-2"}`}
            >
              <Avatar user={navUser} size="sm" />
            </Link>
          ) : isAuthLoading ? (
            <div
              className="w-11 h-11 rounded-xl bg-surface-2 animate-pulse"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </aside>

      {/* Mobile / tablet top header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-[62px] flex items-center px-4 sm:px-6 gap-3 bg-base/95 backdrop-blur-2xl">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-1.5 cursor-pointer select-none group flex-shrink-0"
          onClick={() => router.push("/")}
        >
          <span className="font-bold text-2xl" style={{ fontFamily: "unset" }}>
            Shutterly
          </span>
        </button>

        {/* Nav Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {navUser ? (
            <>
              {/* Search */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setSearchQuery("");
                }}
                title="Search"
                className="w-9 h-9 rounded-full bg-surface-2 text-ink-3 flex items-center justify-center hover:bg-surface-3 hover:text-ink transition-all"
              >
                <Search size={18} strokeWidth={1.9} />
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                title="Home"
                className="w-9 h-9 rounded-full bg-surface-2 text-ink-3 flex items-center justify-center hover:bg-surface-3 hover:text-ink transition-all"
              >
                <House size={18} strokeWidth={1.9} />
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => {
                  setTheme(activeTheme === "dark" ? "light" : "dark");
                }}
                title="Toggle theme"
                className="w-9 h-9 flex-shrink-0 rounded-full bg-surface-2 text-ink-3 flex items-center justify-center hover:bg-surface-3 hover:text-ink transition-all"
              >
                {!isMounted ? (
                  <span className="w-[18px] h-[18px]" aria-hidden="true" />
                ) : activeTheme === "dark" ? (
                  <Sun size={18} strokeWidth={1.8} className="text-brand" />
                ) : (
                  <Moon size={18} strokeWidth={1.8} className="text-ink-3" />
                )}
              </button>

              {/* Add Post / Reel */}
              <div className="relative" ref={createMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCreateMenuOpen((prev) => !prev)}
                  title="Create"
                  className="w-9 h-9 rounded-full bg-ink text-base flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Plus size={18} strokeWidth={2.6} />
                </button>

                <AnimatePresence>
                  {isCreateMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-11 w-[180px] p-1.5 rounded-xl border border-border-soft bg-surface shadow-2xl z-[90]"
                    >
                      <button
                        type="button"
                        onClick={() => openCreateModal("post")}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors text-left"
                      >
                        <span className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center">
                          <ImagePlus size={15} className="text-ink-2" />
                        </span>
                        <span className="text-[14px] font-medium text-ink">
                          Post
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCreateModal("reel")}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors text-left"
                      >
                        <span className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center">
                          <Video size={15} className="text-ink-2" />
                        </span>
                        <span className="text-[14px] font-medium text-ink">
                          Reel
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : null}

          {/* Avatar */}
          <div className="ml-1">
            {navUser ? (
              <Link
                href={`/profile/@${navUser.username}`}
                prefetch={true}
                className="flex items-center gap-1.5"
              >
                <Avatar user={navUser} size="sm" />
              </Link>
            ) : isAuthLoading ? (
              <div
                className="w-[74px] h-9 rounded-full bg-surface-2 animate-pulse"
                aria-hidden="true"
              />
            ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="px-4 py-2 rounded-full bg-ink text-base text-[10px] font-semibold hover:opacity-90 transition-opacity"
            >
              Log in
             </button>
           )}
          </div>
        </div>
      </header>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialType={createType}
        onPublished={onPostPublished}
      />

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-[560px] bg-surface rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border-soft">
                <Search size={16} className="text-ink-3" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends by name or username..."
                  className="flex-1 bg-transparent text-[14px] text-ink placeholder-ink-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="w-7 h-7 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[340px] overflow-y-auto py-1">
                {filteredUsers.length === 0 ? (
                  <p className="px-4 py-6 text-[13px] text-ink-3 text-center">
                    No friends found.
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        router.push(`/profile/@${user.username}`);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface-2 transition-colors text-left"
                    >
                      <Avatar user={user} size="sm" ring />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink truncate">
                          {user.displayName}
                        </p>
                        <p className="text-[13px] text-ink-3 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
