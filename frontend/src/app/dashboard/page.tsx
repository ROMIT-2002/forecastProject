"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, AlertTriangle, Lightbulb, BarChart3, 
  Upload, Layers, Play, Settings as SettingsIcon, FileText, ChevronRight 
} from "lucide-react";

interface SummaryData {
  total_spend: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  ctr: number;
  cpc: number;
  cvr: number;
  cpa: number;
  roas: number;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryData>({
    total_spend: 24500.50,
    total_clicks: 18200,
    total_conversions: 950,
    total_revenue: 48200.00,
    ctr: 0.052,
    cpc: 1.35,
    cvr: 0.052,
    cpa: 25.79,
    roas: 1.97
  });

  const [campaigns, setCampaigns] = useState<any[]>([
    { campaign_name: "Google Search - Brand", channel: "Google Search", cost: 12000, conversions: 480, roas: 2.5, cpa: 25 },
    { campaign_name: "Meta Ads - Retargeting", channel: "Meta", cost: 3200, conversions: 210, roas: 3.2, cpa: 15.2 },
    { campaign_name: "Google - Performance Max", channel: "Performance Max", cost: 6800, conversions: 180, roas: 1.8, cpa: 37.7 }
  ]);

  const [anomalies, setAnomalies] = useState<any[]>([
    { id: 1, campaign_name: "Meta Ads - Retargeting", metric: "cpc", severity: "high", explanation: "CPC spiked by 187% compared to average." }
  ]);

  const [recs, setRecs] = useState<any[]>([
    { id: 1, campaign_name: "Google Search - Brand", title: "Increase Budget by 20%", priority: "high", description: "ROAS (2.50) is above target." }
  ]);

  const [userRole, setUserRole] = useState("SEM Manager");
  const [userEmail, setUserEmail] = useState("demo@forecastiq.ai");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("user_role") || "SEM Manager");
      setUserEmail(localStorage.getItem("user_email") || "demo@forecastiq.ai");
    }

    const fetchSummary = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/dashboard/summary`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (err) {
        console.log("Using local mock data for summary (API not running yet).");
      }
    };

    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns`);
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.slice(0, 5));
        }
      } catch (err) {
        console.log("Using local mock data for campaigns.");
      }
    };

    fetchSummary();
    fetchCampaigns();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      {/* Sidebar (Apple-style translucent glass sidebar) */}
      <aside className="w-64 border-r border-[#e8e8ed] bg-white flex flex-col justify-between p-6">
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
            <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 bg-[#f5f5f7] text-[#1d1d1f] rounded-2xl text-sm font-medium apple-transition">
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </Link>
            <Link href="/upload" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <Upload className="w-4 h-4" />
              <span>Upload CSV</span>
            </Link>
            <Link href="/campaigns" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <BarChart3 className="w-4 h-4" />
              <span>Campaigns</span>
            </Link>
            <Link href="/forecasting" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <TrendingUp className="w-4 h-4" />
              <span>Forecasting</span>
            </Link>
            <Link href="/recommendations" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <Lightbulb className="w-4 h-4" />
              <span>Recommendations</span>
            </Link>
            <Link href="/simulator" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <Play className="w-4 h-4" />
              <span>Scenario Simulator</span>
            </Link>
            <Link href="/anomalies" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <AlertTriangle className="w-4 h-4" />
              <span>Anomaly Center</span>
            </Link>
            <Link href="/reports" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <FileText className="w-4 h-4" />
              <span>Executive Summary</span>
            </Link>
            <Link href="/settings" className="flex items-center space-x-3 px-3 py-2 text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-2xl text-sm font-medium apple-transition">
              <SettingsIcon className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* User profile section */}
        <div className="border-t border-[#e8e8ed] pt-4 px-2">
          <p className="text-xs font-semibold text-[#1d1d1f] truncate">{userEmail}</p>
          <span className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">{userRole}</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Portfolio Overview</h1>
            <p className="text-sm text-[#86868b] mt-1">Holistic multi-channel performance tracking & predictions.</p>
          </div>
          <Link href="/upload" className="flex items-center space-x-2 px-4 py-2.5 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-xs font-semibold rounded-2xl shadow-sm apple-transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Data</span>
          </Link>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="apple-card p-6">
            <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Total Spend</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f]">
              ${summary.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-[#86868b]">Last 90 days baseline</p>
          </div>

          <div className="apple-card p-6">
            <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Total Revenue</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f]">
              ${summary.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-apple-green font-semibold">ROAS: {summary.roas.toFixed(2)}x</p>
          </div>

          <div className="apple-card p-6">
            <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Conversions</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f]">
              {summary.total_conversions.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-[#86868b]">CVR: {(summary.cvr * 100).toFixed(2)}%</p>
          </div>

          <div className="apple-card p-6">
            <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Avg Cost Per Acquisition</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f]">
              ${summary.cpa.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-[#86868b]">Average CPA baseline</p>
          </div>
        </div>

        {/* Content sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Table Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="apple-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">Top Performing Campaigns</h3>
                <Link href="/campaigns" className="text-xs text-apple-blue font-semibold hover:underline flex items-center">
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e8e8ed] text-[#86868b]">
                      <th className="pb-3 font-medium">Campaign</th>
                      <th className="pb-3 font-medium">Channel</th>
                      <th className="pb-3 font-medium text-right">Spend</th>
                      <th className="pb-3 font-medium text-right">Conversions</th>
                      <th className="pb-3 font-medium text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((camp, i) => (
                      <tr key={i} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/50 apple-transition">
                        <td className="py-3.5 font-medium text-[#1d1d1f] truncate max-w-[180px]">{camp.campaign_name}</td>
                        <td className="py-3.5 text-[#6e6e73]">{camp.channel}</td>
                        <td className="py-3.5 text-right font-medium">${camp.cost.toLocaleString()}</td>
                        <td className="py-3.5 text-right">{camp.conversions}</td>
                        <td className="py-3.5 text-right font-semibold text-apple-green">{camp.roas.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Insights Column */}
          <div className="space-y-8">
            {/* Recommendations Widget */}
            <div className="apple-card p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-4">Latest Insights</h3>
              <div className="space-y-4">
                {recs.map((rec) => (
                  <div key={rec.id} className="p-4 bg-[#f5f5f7] rounded-2xl flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-apple-orange flex-shrink-0">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[#1d1d1f]">{rec.title}</h4>
                      <p className="text-[11px] text-[#6e6e73] mt-0.5 truncate max-w-[200px]">{rec.campaign_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomalies Widget */}
            <div className="apple-card p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-4">System Alerts</h3>
              <div className="space-y-4">
                {anomalies.map((anom) => (
                  <div key={anom.id} className="p-4 bg-red-50 rounded-2xl flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-apple-red flex-shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-apple-red">CPC Spike Detected</h4>
                      <p className="text-[11px] text-[#6e6e73] mt-0.5">{anom.campaign_name}</p>
                    </div>
                  </div>
                ))}
                {anomalies.length === 0 && (
                  <p className="text-xs text-[#86868b]">No active anomaly alerts.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
