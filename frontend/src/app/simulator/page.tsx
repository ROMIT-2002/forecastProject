"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Play, TrendingUp, AlertTriangle } from "lucide-react";

export default function SimulatorPage() {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("All Campaigns");
  const [budgetChange, setBudgetChange] = useState(10);
  const [projected, setProjected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns`);
        if (res.ok) {
          const data = await res.json();
          const uniqueNames = Array.from(new Set(data.map((c: any) => c.campaign_name))) as string[];
          setCampaigns(uniqueNames);
        }
      } catch (err) {
        setCampaigns(["Google Search - Brand", "Meta Ads - Retargeting", "Google - Performance Max"]);
      }
    };
    fetchCampaigns();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/simulations/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget_change_percentage: budgetChange,
          campaign_name: selectedCampaign
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjected(data);
      }
    } catch (err) {
      // Mock fallback simulation
      setTimeout(() => {
        const f = 1 + budgetChange / 100;
        const decay = budgetChange > 0 ? 0.90 : 0.96;
        const baseCost = 24500.50;
        const baseConvs = 950;
        const baseRev = 48200.00;
        
        const cost = baseCost * f;
        const convs = baseConvs * (f ** decay);
        const rev = baseRev * (f ** (decay - 0.05));

        setProjected({
          projected_spend: cost,
          projected_conversions: convs,
          projected_revenue: rev,
          projected_cpa: cost / convs,
          projected_roas: rev / cost,
          diminishing_returns_impact_applied: budgetChange > 0,
          explanation: `Simulated a budget change of ${budgetChange > 0 ? '+' : ''}${budgetChange.toFixed(1)}%. Diminishing returns calculations applied for positive scaling.`
        });
        setLoading(false);
      }, 1000);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Scenario Simulator</h1>
          <p className="text-sm text-[#86868b] mt-1">Simulate budget reallocations and calculate marginal efficiency curves under diminishing returns.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form parameters */}
          <div className="apple-card p-8 h-fit">
            <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-6">Simulation Settings</h3>
            
            <form onSubmit={handleSimulate} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">Target Campaign</label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition"
                >
                  <option value="All Campaigns">All Campaigns</option>
                  {campaigns.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-2">
                  <span>Budget Adjustment</span>
                  <span className="text-[#1d1d1f] font-bold">{budgetChange > 0 ? `+${budgetChange}` : budgetChange}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={budgetChange}
                  onChange={(e) => setBudgetChange(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#e8e8ed] rounded-lg appearance-none cursor-pointer accent-[#1d1d1f]"
                />
                <div className="flex justify-between text-[10px] text-[#86868b] mt-2 font-medium">
                  <span>Scale Down -50%</span>
                  <span>Baseline 0%</span>
                  <span>Scale Up +50%</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-sm font-semibold rounded-2xl shadow-sm apple-transition flex items-center justify-center space-x-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? "Modeling curves..." : "Run Simulation"}</span>
              </button>
            </form>
          </div>

          {/* Results dashboard */}
          <div className="lg:col-span-2">
            {projected ? (
              <div className="space-y-6">
                {/* Result KPI grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="apple-card p-6">
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected Spend</span>
                    <div className="mt-2 text-xl font-bold tracking-tight text-[#1d1d1f]">
                      ${projected.projected_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="apple-card p-6">
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected Conversions</span>
                    <div className="mt-2 text-xl font-bold tracking-tight text-[#1d1d1f]">
                      {projected.projected_conversions.toLocaleString()}
                    </div>
                  </div>

                  <div className="apple-card p-6">
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected Revenue</span>
                    <div className="mt-2 text-xl font-bold tracking-tight text-apple-green">
                      ${projected.projected_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="apple-card p-6">
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected CPA</span>
                    <div className="mt-2 text-xl font-bold tracking-tight text-[#1d1d1f]">
                      ${projected.projected_cpa.toFixed(2)}
                    </div>
                  </div>

                  <div className="apple-card p-6">
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected ROAS</span>
                    <div className="mt-2 text-xl font-bold tracking-tight text-[#1d1d1f]">
                      {projected.projected_roas.toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Explanation text */}
                <div className="apple-card p-6">
                  <h4 className="text-sm font-semibold text-[#1d1d1f] mb-2">Pacing Explanation</h4>
                  <p className="text-xs text-[#6e6e73] leading-relaxed">{projected.explanation}</p>
                  
                  {projected.diminishing_returns_impact_applied && (
                    <div className="mt-4 p-3.5 bg-orange-50 border border-orange-100 rounded-xl flex items-start space-x-2.5 text-apple-orange">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <p className="text-[11px] font-medium">Marginal conversion yield will decay. Consider multi-channel split reallocations rather than heavy scaling in a single campaign.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full border border-[#e8e8ed] rounded-3xl p-10 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[350px]">
                <TrendingUp className="w-10 h-10 stroke-1 mb-3 text-[#d2d2d7]" />
                <p className="text-sm font-semibold">Ready to model budget scenarios</p>
                <p className="text-xs text-[#86868b] mt-1">Select parameters in the settings panel and click Run Simulation.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
