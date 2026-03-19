"use client";

import axios from "axios";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      showToast("Passwords do not match", "error");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await axios.post(
        "/api/auth/register",
        { email, username, password, displayName: username },
        { withCredentials: true }
      );
      setIsLoading(false);
      showToast("Account created! Welcome to mini.insta", "success");
      router.push("/");
    } catch (err: unknown) {
      setIsLoading(false);
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || "Unable to create account. Please try again.";
      setError(msg);
      showToast(msg, "error");
    }
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
            Create your account to start sharing posts, stories, and reels.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-ink-3 uppercase tracking-wide mb-2 ml-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. dilshan"
              required
              className="w-full bg-transparent border-0 border-b border-border-soft px-1 py-3 text-[15px] text-ink placeholder-ink-3 outline-none focus:border-ink transition-colors rounded-none"
            />
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-ink-3 uppercase tracking-wide mb-2 ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-transparent border-0 border-b border-border-soft px-1 py-3 text-[15px] text-ink placeholder-ink-3 outline-none focus:border-ink transition-colors rounded-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-ink-3 uppercase tracking-wide mb-2 ml-1 w-full truncate">
                Confirm PW
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-transparent border-0 border-b border-border-soft px-1 py-3 text-[15px] text-ink placeholder-ink-3 outline-none focus:border-ink transition-colors rounded-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password || !username || password !== confirmPassword}
            className="w-full bg-ink hover:opacity-90 disabled:bg-surface-3 disabled:text-ink-3 disabled:cursor-not-allowed text-base text-[15px] font-bold py-3.5 rounded-xl transition-all mt-4 flex items-center justify-center"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>

          {error ? <p className="text-[13px] text-red-500 font-medium">{error}</p> : null}
        </form>

        <p className="text-left text-[14px] text-ink-3 mt-9">
          Already have an account?{" "}
          <Link href="/login" className="text-ink hover:text-brand font-semibold transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
