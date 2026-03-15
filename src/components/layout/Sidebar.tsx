"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, UserPlus } from "lucide-react";
import { currentUser, suggestedUsers } from "@/lib/mockData";
import Avatar from "@/components/ui/Avatar";

export default function Sidebar() {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <aside className="sticky top-[88px] space-y-4">

      {/* Profile Card */}
      <div className="bg-surface border border-border-soft rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            user={currentUser}
            size="lg"
            ring
            onClick={() => router.push(`/profile/@${currentUser.username}`)}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-ink leading-tight">{currentUser.displayName}</p>
            <p className="text-[13px] text-ink-3 mt-0.5">@{currentUser.username}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/profile/@${currentUser.username}`)}
            className="text-[13px] font-semibold text-brand hover:opacity-70 transition-opacity"
          >
            Edit
          </button>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", gap: "1px" }}
        >
          {[
            { label: "Posts", value: currentUser.posts ?? 0 },
            { label: "Followers", value: currentUser.followers ?? 0 },
            { label: "Following", value: currentUser.following ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface py-3 text-center cursor-pointer hover:bg-surface-2 transition-colors">
              <p className="text-[17px] font-bold text-ink leading-none">
                {value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}
              </p>
              <p className="text-[12px] text-ink-3 mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Friends */}
      <div className="bg-surface border border-border-soft rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-semibold text-ink-3 uppercase tracking-[0.8px]">
            Suggested for you
          </span>
          <button type="button" className="text-[13px] font-semibold text-brand hover:opacity-70 transition-opacity">
            See all
          </button>
        </div>

        <div className="space-y-0.5">
          {suggestedUsers.map((user, i) => (
            <div
              key={user.id}
              className={[
                "flex items-center gap-3 py-2.5",
                i < suggestedUsers.length - 1 ? "border-b border-border-soft" : "",
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
                    className="text-[14px] font-medium text-ink truncate hover:text-brand cursor-pointer transition-colors leading-tight"
                    onClick={() => router.push(`/profile/@${user.username}`)}
                  >
                    {user.username}
                  </p>
                  {user.isVerified && (
                    <BadgeCheck size={13} className="text-sky-400 flex-shrink-0 fill-sky-500 stroke-[#1a1a1a]" />
                  )}
                </div>
                <p className="text-[13px] text-ink-3 mt-0.5 truncate">{user.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFollow(user.id)}
                className={[
                  "flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-1.5 rounded-lg border transition-all whitespace-nowrap",
                  following.has(user.id)
                    ? "bg-surface-3 border-border-soft text-ink-3"
                    : "bg-brand/10 border-brand/20 text-brand hover:bg-brand hover:text-[#111]",
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
        About · Help · Privacy · Terms · Advertising<br />
        © {new Date().getFullYear()} mini.insta
      </p>
    </aside>
  );
}
