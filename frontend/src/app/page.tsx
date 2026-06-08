"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SEM Manager");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth token store
    localStorage.setItem("user_email", email || "demo@forecastiq.ai");
    localStorage.setItem("user_role", role);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#f5f5f7]">
      <div className="w-full max-w-[400px] p-8 bg-white border border-[#e8e8ed] rounded-3xl shadow-sm">
        {/* Apple-style minimalist logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#1d1d1f] flex items-center justify-center text-white text-xl font-bold tracking-tight shadow-md">
            FI
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1d1d1f]">ForecastIQ AI</h1>
          <p className="mt-1.5 text-sm text-[#86868b]">SaaS Ads Optimization Engine</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">Your Persona Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition appearance-none"
            >
              <option value="SEM Manager">SEM Manager</option>
              <option value="Media Executive">Media Executive</option>
              <option value="Analyst">Analyst</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-sm font-semibold rounded-2xl shadow-sm apple-transition disabled:opacity-50 mt-2"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#86868b]">
          Demo Mode: Enter any email to access the dashboard.
        </div>
      </div>
    </div>
  );
}
