"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ShieldCheck, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SEM Manager");
  const [loading, setLoading] = useState(false);
  const [loadStage, setLoadStage] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadStage(0);

    // Simulate Auth Storage
    localStorage.setItem("user_email", email || "demo@forecastiq.ai");
    localStorage.setItem("user_role", role);

    // Premium transitions ticker
    const totalStages = 4;
    let currentStage = 0;
    
    const ticker = setInterval(() => {
      currentStage += 1;
      setLoadStage(currentStage);
      if (currentStage >= totalStages) {
        clearInterval(ticker);
        router.push("/dashboard");
      }
    }, 450);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#f5f5f7] relative overflow-hidden">
      {/* Background visual detail */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-gradient-to-br from-[#0071e3]/5 to-transparent blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-gradient-to-tr from-[#00c6ff]/5 to-transparent blur-[120px] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-[400px] p-8 bg-white border border-[#e8e8ed] rounded-[28px] shadow-[0_4px_32px_rgba(0,0,0,0.015)] relative z-10 transition-all duration-500 hover:shadow-[0_8px_40px_rgba(0,0,0,0.03)] hover:-translate-y-0.5">
        
        {/* Apple-style minimalist logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-14 h-14 rounded-2xl bg-[#1d1d1f] flex items-center justify-center text-white text-xl font-semibold tracking-tight shadow-[0_4px_20px_rgba(0,0,0,0.15)] group-hover:scale-[1.03] transition-transform duration-300">
              FI
            </div>
            <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-[#0071e3] to-[#00c6ff] opacity-0 group-hover:opacity-15 blur-md transition-opacity duration-300"></div>
          </div>
          
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#1d1d1f]">ForecastIQ AI</h1>
          <p className="mt-1.5 text-xs text-[#86868b] font-medium tracking-wide uppercase">SaaS Ads Optimization Engine</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#86868b]" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition text-[#1d1d1f] placeholder:text-[#a1a1a6]"
            />
          </div>

          <div>
            <label className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-2">
              <User className="w-3.5 h-3.5 text-[#86868b]" />
              <span>Your Persona Role</span>
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition appearance-none text-[#1d1d1f]"
              >
                <option value="SEM Manager">SEM Manager</option>
                <option value="Media Executive">Media Executive</option>
                <option value="Analyst">Analyst</option>
              </select>
              {/* Down Arrow element */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#86868b]">
                <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md apple-transition disabled:opacity-50 mt-2 flex items-center justify-center space-x-1.5 group"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f5f5f7] text-center text-[10px] font-medium text-[#86868b] tracking-normal">
          Demo Mode: Enter any email to access the dashboard.
        </div>
      </div>

      {/* Full-screen Loading Overlay with Cinematic Animation */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f5f7] transition-all duration-500 animate-fadeIn">
          <div className="flex flex-col items-center max-w-[320px] text-center space-y-7">
            {/* Glowing Apple-style Pulsing Icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-[#1d1d1f] flex items-center justify-center text-white text-2xl font-bold tracking-tight shadow-xl animate-scalePulse relative z-10">
                FI
              </div>
              {/* Background glowing rings */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#0071e3] to-[#00c6ff] opacity-20 blur-xl animate-pulse"></div>
              <div className="absolute -inset-4 rounded-3xl bg-[#0071e3]/10 blur-2xl animate-pulse delay-75"></div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[#1d1d1f] tracking-tight transition-all duration-300">
                {loadStage === 0 && "Verifying Credentials..."}
                {loadStage === 1 && "Ingesting SEM Workspace..."}
                {loadStage === 2 && "Synthesizing Neural Curves..."}
                {loadStage === 3 && "Initializing Dashboard..."}
                {loadStage >= 4 && "Welcome Back!"}
              </h2>
              <p className="text-[10px] text-[#86868b] h-4 font-medium transition-all duration-300">
                {loadStage === 0 && "Checking secure user authorization tokens"}
                {loadStage === 1 && "Caching transaction records & models"}
                {loadStage === 2 && "Applying AI-powered diminishing return curves"}
                {loadStage === 3 && "Injecting interface widgets and logs"}
                {loadStage >= 4 && "Signing in..."}
              </p>
            </div>

            {/* Premium Gradient Progress Bar */}
            <div className="w-48 h-[3px] bg-[#e8e8ed] rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
              <div 
                className="h-full bg-gradient-to-r from-[#0071e3] via-[#00c6ff] to-[#0071e3] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((loadStage + 1) * 20, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Credit */}
      <footer className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-[9px] tracking-widest text-[#86868b] font-medium uppercase opacity-50 hover:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-default select-none">
          Designed by <span className="text-[#1d1d1f] font-semibold">Romit Chakraborty</span>
        </p>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scalePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); filter: drop-shadow(0 12px 24px rgba(0,0,0,0.12)); }
          100% { transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scalePulse {
          animation: scalePulse 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
