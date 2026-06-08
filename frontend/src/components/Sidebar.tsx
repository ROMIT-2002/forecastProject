"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  TrendingUp, AlertTriangle, Lightbulb, BarChart3, 
  Upload, Layers, Play, Settings as SettingsIcon, FileText 
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState("SEM Manager");
  const [userEmail, setUserEmail] = useState("demo@forecastiq.ai");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("user_role") || "SEM Manager");
      setUserEmail(localStorage.getItem("user_email") || "demo@forecastiq.ai");
    }
  }, []);

  const links = [
    { href: "/dashboard", label: "Overview", icon: Layers },
    { href: "/upload", label: "Upload CSV", icon: Upload },
    { href: "/campaigns", label: "Campaigns", icon: BarChart3 },
    { href: "/forecasting", label: "Forecasting", icon: TrendingUp },
    { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
    { href: "/simulator", label: "Scenario Simulator", icon: Play },
    { href: "/anomalies", label: "Anomaly Center", icon: AlertTriangle },
    { href: "/reports", label: "Executive Summary", icon: FileText },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 border-r border-[#e8e8ed] bg-white flex flex-col justify-between p-6 h-screen sticky top-0">
      <div>
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-xl bg-[#1d1d1f] flex items-center justify-center text-white text-sm font-bold shadow-sm">
            FI
          </div>
          <span className="font-semibold text-base tracking-tight text-[#1d1d1f]">ForecastIQ AI</span>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-2xl text-sm font-medium apple-transition ${
                  isActive 
                    ? "bg-[#f5f5f7] text-[#1d1d1f]" 
                    : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile section */}
      <div className="border-t border-[#e8e8ed] pt-4 px-2">
        <p className="text-xs font-semibold text-[#1d1d1f] truncate">{userEmail}</p>
        <span className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">{userRole}</span>
      </div>
    </aside>
  );
}
