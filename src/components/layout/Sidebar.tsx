"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, UserPlus } from "lucide-react";
import { currentUser, suggestedUsers } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";

interface SidebarProps {
  isLoading?: boolean;
}

export default function Sidebar({ isLoading = false }: SidebarProps) {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
                <div key={`suggested-skeleton-${index}`} className="flex items-center gap-3 py-2.5 px-2">
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
      ) : (
        <>

      {/* Profile */}
      <div className="px-1 pb-2">
        <div className="flex items-center gap-3.5 mb-2">
          <Avatar
            user={currentUser}
            size="lg"
            ring
            onClick={() => router.push(`/profile/@${currentUser.username}`)}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-semibold text-ink leading-tight">{currentUser.displayName}</p>
            <p className="text-[15px] text-ink-2 mt-0.5">@{currentUser.username}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/profile/@${currentUser.username}`)}
            className="text-[13px] font-semibold text-ink-2 hover:text-ink transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Suggested Friends */}
      <div className="px-1 pt-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px] font-semibold text-ink-3 uppercase tracking-[1.1px]">
            Suggested for you
          </span>
          <button type="button" className="text-[12px] font-semibold text-ink-2 hover:text-ink transition-colors">
            See all
          </button>
        </div>

        <div className="space-y-2">
          {suggestedUsers.map((user) => (
            <div
              key={user.id}
              className={[
                "flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-surface/50 transition-colors",
              ].join(" ")}
            >
              <Avatar
                user={user}
                size="sm"
                ring
                onClick={() => router.push(`/profile/@${user.username}`)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className="text-[14px] font-semibold text-ink truncate cursor-pointer transition-colors leading-tight hover:text-ink-2"
                    onClick={() => router.push(`/profile/@${user.username}`)}
                  >
                    {user.displayName}
                  </p>
                    {user.isVerified && (
                      <BadgeCheck size={13} className="text-white flex-shrink-0 fill-white/80 stroke-base" />
                    )}
                </div>
                <p className="text-[13px] text-ink-3 mt-0.5 truncate">@{user.username}</p>
                <p className="text-[12px] text-ink-3/90 mt-0.5 truncate">{user.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFollow(user.id)}
                className={[
                  "flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap",
                  following.has(user.id)
                    ? "bg-surface-2 text-ink-3 border border-border-soft"
                    : "bg-ink text-base hover:opacity-90",
                ].join(" ")}
              >
                {!following.has(user.id) && <UserPlus size={13} strokeWidth={2.5} />}
                {following.has(user.id) ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[12px] text-ink-3 leading-loose px-1">
        About · Portfolio · Contact<br />
        <span suppressHydrationWarning>© {new Date().getFullYear()} Dilshan</span> ·{" "}
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
      )}
    </aside>
  );
}
