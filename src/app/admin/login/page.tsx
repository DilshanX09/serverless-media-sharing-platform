"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await axios.post(
        "/api/admin/auth/login",
        { password },
        { withCredentials: true },
      );
      router.replace("/admin");
    } catch (loginError: unknown) {
      if (axios.isAxiosError(loginError)) {
        setError(loginError.response?.data?.error ?? "Invalid admin password");
      } else {
        setError("Failed to sign in to admin panel");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base text-ink flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_50%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_50%)]" />

      <div className="relative w-full max-w-[460px] rounded-3xl border border-border-soft bg-surface shadow-2xl p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-[12px] font-semibold text-brand">
          <ShieldCheck size={14} />
          Admin Access
        </div>

        <h1 className="mt-4 text-[28px] font-extrabold tracking-tight">
          Dashboard Login
        </h1>
        <p className="text-[14px] text-ink-3 mt-1">
          Password-only access for the admin control panel.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide">
              Admin password
            </span>
            <div className="mt-2 relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                className="h-11 w-full rounded-xl border border-border-soft bg-base pl-10 pr-3 text-[14px] outline-none focus:border-border-strong"
                placeholder="Enter admin password"
              />
            </div>
          </label>

          {error ? (
            <p className="text-[13px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="h-11 w-full rounded-xl bg-ink text-base text-[14px] font-semibold disabled:opacity-45 inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {isSubmitting ? "Signing in..." : "Open Admin Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
