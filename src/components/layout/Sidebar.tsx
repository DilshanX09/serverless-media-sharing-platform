"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import axios from "axios";
import type { SuggestedUser, User } from "@/types";
import { useToast } from "@/components/ui/Toast";

interface SidebarProps {
  isLoading?: boolean;
  currentUserData?: User;
  suggestedUsersData?: SuggestedUser[];
  isGuest?: boolean;
  onFollowedSuggestion?: (userId: string) => void;
}

export default function Sidebar({
  isLoading = false,
  currentUserData,
  suggestedUsersData,
  isGuest = false,
  onFollowedSuggestion,
}: SidebarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmittingFor, setIsSubmittingFor] = useState<string | null>(null);
  const user = currentUserData;
  const suggestions = suggestedUsersData ?? [];

  const handleFollow = async (targetUserId: string, username: string) => {
    try {
      setIsSubmittingFor(targetUserId);
      await axios.post(
        "/api/social/follows/toggle",
        { targetUserId },
        { withCredentials: true },
      );
      onFollowedSuggestion?.(targetUserId);
      showToast(`You're now following ${username}`, "success");
    } catch {
      showToast("Failed to follow user", "error");
    } finally {
      setIsSubmittingFor(null);
    }
  };

  return (
    <aside className="sticky top-[88px] space-y-4">
      {isLoading ? (
        <>
          <div className="px-1 pb-2">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-surface-2 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-28 h-3.5 rounded bg-surface-2 animate-pulse" />
                <div className="w-20 h-3 rounded bg-surface-2 animate-pulse" />
              </div>
              <div className="w-10 h-3 rounded bg-surface-2 animate-pulse" />
            </div>
          </div>

          <div className="px-1 pt-2">
            <div className="flex items-center justify-between mb-4">
              <div className="w-24 h-3 rounded bg-surface-2 animate-pulse" />
              <div className="w-12 h-3 rounded bg-surface-2 animate-pulse" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`suggested-skeleton-${index}`}
                  className="flex items-center gap-3 py-2.5 px-2"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-24 h-3 rounded bg-surface-2 animate-pulse" />
                    <div className="w-20 h-3 rounded bg-surface-2 animate-pulse" />
                  </div>
                  <div className="w-14 h-6 rounded-md bg-surface-2 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : isGuest ? (
        <div className="p-4 rounded-2xl border border-border-soft bg-surface">
          <p className="text-[15px] font-semibold text-ink">
            Unlock full mini.insta
          </p>
          <p className="text-[13px] text-ink-3 mt-1">
            Logged-in users can view stories, suggestions, profile tools, and
            more.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-4 w-full rounded-xl bg-ink text-base text-[14px] font-semibold py-2.5 hover:opacity-90 transition-opacity"
          >
            Click here to log in
          </button>
        </div>
      ) : user ? (
        <>
          {/* Profile */}
          <div className="px-1 pb-2">
            <Link
              href={`/profile/@${user.username}`}
              prefetch={true}
              className="flex items-center gap-3.5 mb-2 group"
            >
              <Avatar user={user} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-ink leading-tight group-hover:text-brand transition-colors">
                  {user.displayName}
                </p>
                <p className="text-[15px] text-ink-2 ">@{user.username}</p>
              </div>
              <span className="text-[13px] font-semibold text-ink-2 group-hover:text-ink transition-colors">
                Edit
              </span>
            </Link>
          </div>

          {/* Suggested Friends */}
          <div className="px-1 pt-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-semibold text-ink-3 uppercase tracking-[1.1px]">
                Suggested for you
              </span>
              <button
                type="button"
                className="text-[12px] font-semibold text-ink-2 hover:text-ink transition-colors"
              >
                See all
              </button>
            </div>

            <div className="space-y-2">
              {suggestions.map((suggested) => (
                <div
                  key={suggested.id}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-surface/50 transition-colors"
                >
                  <Avatar
                    user={suggested}
                    size="lg"
                    onClick={() =>
                      router.push(`/profile/@${suggested.username}`)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className="text-[14px] font-semibold text-ink truncate cursor-pointer transition-colors leading-tight hover:text-ink-2"
                        onClick={() =>
                          router.push(`/profile/@${suggested.username}`)
                        }
                      >
                        {suggested.displayName}
                      </p>
                      {suggested.isVerified && (
                        <BadgeCheck
                          size={13}
                          className="text-white flex-shrink-0 fill-white/80 stroke-base"
                        />
                      )}
                    </div>
                    <p className="text-[13px] text-ink-3 mt-0.5 truncate">
                      @{suggested.username}
                    </p>
                    <p className="text-[12px] text-ink-3/90 mt-0.5 truncate">
                      {suggested.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleFollow(suggested.id, suggested.username)
                    }
                    disabled={isSubmittingFor === suggested.id}
                    className="text-[12px] font-semibold text-brand hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {isSubmittingFor === suggested.id
                      ? "..."
                      : suggested.isFollowedBy
                        ? "Follow back"
                        : "Follow"}
                  </button>
                </div>
              ))}
              {suggestions.length === 0 && (
                <p className="text-[13px] text-ink-3 px-2 py-3">
                  No suggestions right now.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-[12px] text-ink-3 leading-loose px-1">
            About · Portfolio · Contact
            <br />
            <span suppressHydrationWarning>
              © {new Date().getFullYear()} Dilshan
            </span>{" "}
            ·{" "}
            <a
              href="https://www.dilshanxo.dev"
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 hover:text-ink transition-colors"
            >
              www.dilshanxo.dev
            </a>
          </p>
        </>
      ) : (
        <div className="px-1 py-3 text-[13px] text-ink-3">
          Loading account...
        </div>
      )}
    </aside>
  );
}
