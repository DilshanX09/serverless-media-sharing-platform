"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setIsLoading(false);
      setError(data.error ?? "Unable to log in. Please try again.");
      return;
    }

    setIsLoading(false);
    router.push("/");
  };

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-base flex flex-col items-center justify-center px-5 py-10">
      {/* Brand Header */}
      <div className="mb-10 w-full max-w-[420px]">
        <Link href="/" className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
          <span className="text-[28px] font-black tracking-tighter text-ink group-hover:text-ink-2 transition-colors font-mono">
            mini
          </span>
          <span className="text-[28px] font-black tracking-tighter text-brand group-hover:text-brand/90 transition-colors font-mono">
            .insta
          </span>
        </Link>
      </div>

      <div className="w-full max-w-[420px]">
        <div className="mb-9">
          <p className="text-[14px] text-ink-3 leading-relaxed">
            Log in to continue to your feed, reels, and profile updates.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-ink-3 uppercase tracking-wide mb-2 ml-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full bg-transparent border-0 border-b border-border-soft px-1 py-3 text-[15px] text-ink placeholder-ink-3 outline-none focus:border-ink transition-colors rounded-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 ml-1 mr-1">
              <label className="text-[13px] font-semibold text-ink-3 uppercase tracking-wide">
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-transparent border-0 border-b border-border-soft px-1 py-3 text-[15px] text-ink placeholder-ink-3 outline-none focus:border-ink transition-colors rounded-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-ink hover:opacity-90 disabled:bg-surface-3 disabled:text-ink-3 disabled:cursor-not-allowed text-base text-[15px] font-bold py-3.5 rounded-xl transition-all mt-4 flex items-center justify-center"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>

          {error ? <p className="text-[13px] text-red-500 font-medium">{error}</p> : null}
        </form>

        <p className="text-left text-[14px] text-ink-3 mt-9">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-ink hover:text-brand font-semibold transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
