"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      router.push("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
          <span className="text-[28px] font-black tracking-tighter text-[#ffffff] group-hover:text-white/90 transition-colors font-mono">
            mini
          </span>
          <span className="text-[28px] font-black tracking-tighter text-brand group-hover:text-brand/90 transition-colors font-mono">
            .insta
          </span>
        </Link>
      </div>

      {/* Form Container */}
      <div className="bg-surface-2 border border-[#ffffff]/10 w-full max-w-[420px] rounded-3xl p-8 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-bold text-[#ffffff] mb-2 tracking-tight">Welcome back</h1>
          <p className="text-[14px] text-ink-3 leading-relaxed">
            Enter your details below to log in to your account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full bg-base border border-[#ffffff]/10 rounded-2xl px-4 py-3.5 text-[15px] text-[#ffffff] placeholder-[#555555] outline-none focus:border-brand/40 focus:bg-base transition-all"
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
              className="w-full bg-base border border-[#ffffff]/10 rounded-2xl px-4 py-3.5 text-[15px] text-[#ffffff] placeholder-[#555555] outline-none focus:border-brand/40 focus:bg-base transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-brand hover:bg-brand hover:brightness-95 disabled:bg-brand/50 disabled:cursor-not-allowed text-[#000000] text-[15px] font-bold py-3.5 rounded-2xl transition-all mt-4 flex items-center justify-center shadow-lg shadow-brand/10"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-[14px] text-ink-3 mt-8">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#ffffff] hover:text-brand font-semibold transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
