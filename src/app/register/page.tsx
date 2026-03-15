"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setIsLoading(true);
    // Simulate registration
    setTimeout(() => {
      setIsLoading(false);
      router.push("/profile/@" + username);
    }, 1500);
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
          <h1 className="text-[24px] font-bold text-[#ffffff] mb-2 tracking-tight">Create an account</h1>
          <p className="text-[14px] text-ink-3 leading-relaxed">
            Join mini.insta today to start sharing your moments.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
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
              className="w-full bg-base border border-[#ffffff]/10 rounded-2xl px-4 py-3.5 text-[15px] text-[#ffffff] placeholder-[#555555] outline-none focus:border-brand/40 focus:bg-base transition-all"
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
              className="w-full bg-base border border-[#ffffff]/10 rounded-2xl px-4 py-3.5 text-[15px] text-[#ffffff] placeholder-[#555555] outline-none focus:border-brand/40 focus:bg-base transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full bg-base border border-[#ffffff]/10 rounded-2xl px-4 py-3.5 text-[15px] text-[#ffffff] placeholder-[#555555] outline-none focus:border-brand/40 focus:bg-base transition-all"
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
                className="w-full bg-base border border-[#ffffff]/10 rounded-2xl px-4 py-3.5 text-[15px] text-[#ffffff] placeholder-[#555555] outline-none focus:border-brand/40 focus:bg-base transition-all"
              />
            </div>
          </div>

          <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 flex items-start gap-2.5 mt-2">
            <span className="text-[16px] mt-0.5 opacity-90">💡</span>
            <p className="text-[12px] text-ink-3 leading-snug">
              <strong className="text-[#ffffff]">Note:</strong> Your full name can be added later in the "Edit Profile" section.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password || !username || password !== confirmPassword}
            className="w-full bg-brand hover:bg-brand hover:brightness-95 disabled:bg-brand/50 disabled:cursor-not-allowed text-[#000000] text-[15px] font-bold py-3.5 rounded-2xl transition-all mt-4 flex items-center justify-center shadow-lg shadow-brand/10"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-center text-[14px] text-ink-3 mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-[#ffffff] hover:text-brand font-semibold transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
