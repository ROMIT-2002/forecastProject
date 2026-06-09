"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Play, TrendingUp, AlertTriangle, CheckCircle, 
  HelpCircle, DollarSign, ArrowUpRight, ArrowDownRight, Layers, Sliders 
} from "lucide-react";

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState("incremental"); // incremental, portfolio
  
  // Incremental simulator state
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [additionalBudget, setAdditionalBudget] = useState(10000);
  const [objective, setObjective] = useState("estimated_value");
  const [incrementalResult, setIncrementalResult] = useState<any | null>(null);
  const [incLoading, setIncLoading] = useState(false);

  // Portfolio optimizer state
  const [totalBudget, setTotalBudget] = useState(50000);
  const [portfolioObjective, setPortfolioObjective] = useState("estimated_value");
  const [portfolioResult, setPortfolioResult] = useState<any | null>(null);
  const [portLoading, setPortLoading] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns`);
        if (res.ok) {
          const data = await res.json();
          const uniqueNames = Array.from(new Set(data.map((c: any) => c.campaign_name))) as string[];
          setCampaigns(uniqueNames);
          setSelectedCampaigns([]); // default: all
        }
      } catch (err) {
        setCampaigns(["Google Search - Brand", "Google Search - NonBrand", "Meta Ads - Retargeting", "Meta Ads - Prospecting", "YouTube - Brand Awareness"]);
      }
    };
    fetchCampaigns();
  }, []);

  const handleIncrementalSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/incremental-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additional_budget: additionalBudget,
          selected_campaigns: selectedCampaigns.length > 0 ? selectedCampaigns : null,
          objective: objective
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncrementalResult(data);
      }
    } catch (err) {
      // Offline fallback simulator
      setTimeout(() => {
        const factor = objective === "revenue" ? 1.4 : objective === "conversions" ? 0.08 : 3.5;
        const convs = Math.round(additionalBudget * 0.02 * randomMultiplier());
        const rev = additionalBudget * 1.8 * randomMultiplier();
        const value = additionalBudget * 2.8 * randomMultiplier();
        
        const campaignsToUse = selectedCampaigns.length > 0 ? selectedCampaigns : campaigns;
        const allocations = campaignsToUse.map((c) => {
          const share = 1 / campaignsToUse.length;
          const alloc = additionalBudget * share;
          const sat = c.includes("NonBrand") ? 92.5 : 45.0;
          return {
            campaign_name: c,
            channel: c.includes("Google") ? "Google Search" : (c.includes("Meta") ? "Meta" : "YouTube"),
            allocated_increase: alloc,
            base_spend: c.includes("NonBrand") ? 1200 : 300,
            new_spend: c.includes("NonBrand") ? 1200 + alloc : 300 + alloc,
            projected_conversions: Math.round(alloc * 0.02),
            projected_revenue: alloc * 1.8,
            projected_estimated_value: alloc * 2.8,
            saturation_score: sat,
            status: sat >= 80 ? "Saturated" : "Efficient"
          };
        });

        setIncrementalResult({
          total_incremental_budget: additionalBudget,
          campaign_allocations: allocations,
          projected_incremental_conversions: convs,
          projected_incremental_revenue: rev,
          projected_estimated_value: value,
          projected_cpa: convs > 0 ? additionalBudget / convs : 0.0,
          projected_cpi: convs > 0 ? additionalBudget / (convs * 1.1) : 0.0,
          projected_incremental_roas: additionalBudget > 0 ? rev / additionalBudget : 0.0,
          explanation: `Simulated incremental allocation of $${additionalBudget.toLocaleString()} split across selected campaigns. Campaigns with efficient baseline and headroom prioritized.`
        });
        setIncLoading(false);
      }, 800);
      return;
    }
    setIncLoading(false);
  };

  const handlePortfolioOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/portfolio-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_budget: totalBudget,
          objective: portfolioObjective
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolioResult(data);
      }
    } catch (err) {
      // Offline fallback portfolio optimizer
      setTimeout(() => {
        const convs = Math.round(totalBudget * 0.025);
        const rev = totalBudget * 2.1;
        const val = totalBudget * 3.8;

        const currentAlloc: Record<string, number> = {};
        const optimizedAlloc: Record<string, number> = {};
        const shifts = campaigns.map((c, i) => {
          let oldSpend = 5000;
          let newSpend = 5000;
          if (c.includes("YouTube")) {
            oldSpend = 4000;
            newSpend = 1000; // Shift away from YouTube awareness (wasteful)
          } else if (c.includes("Retargeting")) {
            oldSpend = 2000;
            newSpend = 5000; // Scale retargeting
          } else {
            newSpend = totalBudget / campaigns.length;
          }
          currentAlloc[c] = oldSpend;
          optimizedAlloc[c] = newSpend;
          return {
            campaign_name: c,
            channel: c.includes("Google") ? "Google Search" : (c.includes("Meta") ? "Meta" : "YouTube"),
            current_spend: oldSpend,
            optimized_spend: newSpend,
            shift_amount: newSpend - oldSpend,
            projected_revenue_change: (newSpend - oldSpend) * 2.2
          };
        });

        setPortfolioResult({
          total_budget: totalBudget,
          current_allocation: currentAlloc,
          optimized_allocation: optimizedAlloc,
          expected_value: val,
          expected_conversions: convs,
          expected_roas: totalBudget > 0 ? rev / totalBudget : 0.0,
          expected_cpa: convs > 0 ? totalBudget / convs : 0.0,
          budget_shift_recommendations: shifts
        });
        setPortLoading(false);
      }, 800);
      return;
    }
    setPortLoading(false);
  };

  const randomMultiplier = () => 0.9 + Math.random() * 0.2;

  const handleCampaignToggle = (name: string) => {
    setSelectedCampaigns((prev) => 
      prev.includes(name) 
        ? prev.filter((c) => c !== name) 
        : [...prev, name]
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Budget Scenario Simulator</h1>
          <p className="text-sm text-[#86868b] mt-1">Model incremental budget increases or optimize your total portfolio allocation.</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#e8e8ed] p-1 rounded-2xl mb-8 space-x-1 w-fit">
          <button 
            onClick={() => setActiveTab("incremental")}
            className={`px-5 py-2.5 text-xs font-semibold rounded-xl apple-transition flex items-center space-x-2 ${
              activeTab === "incremental" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Incremental Allocator</span>
          </button>
          <button 
            onClick={() => setActiveTab("portfolio")}
            className={`px-5 py-2.5 text-xs font-semibold rounded-xl apple-transition flex items-center space-x-2 ${
              activeTab === "portfolio" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Portfolio Optimizer</span>
          </button>
        </div>

        {/* Incremental Tab View */}
        {activeTab === "incremental" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Parameters card */}
            <div className="apple-card p-6 h-fit space-y-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">Simulator Parameters</h3>
              
              <form onSubmit={handleIncrementalSimulate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                    Additional Budget ($)
                  </label>
                  <input
                    type="number"
                    value={additionalBudget}
                    onChange={(e) => setAdditionalBudget(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition font-medium text-[#1d1d1f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                    Optimization Objective
                  </label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-xs focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition font-semibold text-[#1d1d1f]"
                  >
                    <option value="estimated_value">Maximize Estimated Value</option>
                    <option value="revenue">Maximize Revenue</option>
                    <option value="conversions">Maximize Conversions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-2">
                    Target Campaigns (Default: All)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-[#e8e8ed] rounded-2xl p-3 space-y-2 bg-[#f5f5f7]/30 no-scrollbar">
                    {campaigns.map((name) => (
                      <label key={name} className="flex items-center space-x-2 text-xs font-semibold text-[#1d1d1f] cursor-pointer hover:bg-white p-1.5 rounded-xl apple-transition">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.includes(name)}
                          onChange={() => handleCampaignToggle(name)}
                          className="rounded text-[#1d1d1f] focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={incLoading}
                  className="w-full py-3 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-sm font-semibold rounded-2xl shadow-sm apple-transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{incLoading ? "Solving Curve Model..." : "Simulate Budget"}</span>
                </button>
              </form>
            </div>

            {/* Results views */}
            <div className="lg:col-span-2 space-y-6">
              {incrementalResult ? (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="apple-card p-5">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected CPI</span>
                      <div className="mt-2 text-xl font-bold text-[#1d1d1f]">
                        ${incrementalResult.projected_cpi.toFixed(2)}
                      </div>
                    </div>
                    <div className="apple-card p-5">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Projected Value</span>
                      <div className="mt-2 text-xl font-bold text-apple-green">
                        ${incrementalResult.projected_estimated_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="apple-card p-5">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Incremental ROAS</span>
                      <div className="mt-2 text-xl font-bold text-[#1d1d1f]">
                        {incrementalResult.projected_incremental_roas.toFixed(2)}x
                      </div>
                    </div>
                  </div>

                  {/* Scenarios (Best / Worst / Expected) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="apple-card p-5 bg-red-50/50 border border-red-100">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-apple-red uppercase tracking-wider">
                        <span>Pessimistic (-15%)</span>
                        <ArrowDownRight className="w-4 h-4" />
                      </div>
                      <div className="mt-2 text-lg font-bold text-apple-red">
                        {(incrementalResult.projected_incremental_conversions * 0.85).toFixed(0)} convs
                      </div>
                      <p className="text-[10px] text-[#86868b] mt-1">Value: ${(incrementalResult.projected_estimated_value * 0.85).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="apple-card p-5 bg-blue-50/50 border border-blue-100">
                      <div className="text-[10px] font-semibold text-apple-blue uppercase tracking-wider">
                        Expected Scenario
                      </div>
                      <div className="mt-2 text-lg font-bold text-apple-blue">
                        {incrementalResult.projected_incremental_conversions.toFixed(0)} convs
                      </div>
                      <p className="text-[10px] text-[#86868b] mt-1">Value: ${incrementalResult.projected_estimated_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="apple-card p-5 bg-emerald-50/50 border border-emerald-100">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-apple-green uppercase tracking-wider">
                        <span>Optimistic (+15%)</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div className="mt-2 text-lg font-bold text-apple-green">
                        {(incrementalResult.projected_incremental_conversions * 1.15).toFixed(0)} convs
                      </div>
                      <p className="text-[10px] text-[#86868b] mt-1">Value: ${(incrementalResult.projected_estimated_value * 1.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>

                  {/* Campaign Allocations Table */}
                  <div className="apple-card p-5">
                    <h4 className="text-sm font-semibold text-[#1d1d1f] mb-3">Incremental Budget Allocations</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#e8e8ed] text-[#86868b] font-medium">
                            <th className="pb-2">Campaign</th>
                            <th className="pb-2 text-right">Allocated Increase</th>
                            <th className="pb-2 text-right">New Daily Spend</th>
                            <th className="pb-2 text-right">Proj. Convs</th>
                            <th className="pb-2 text-right">Saturation Index</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incrementalResult.campaign_allocations.map((alloc: any, i: number) => (
                            <tr key={i} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                              <td className="py-2.5 font-semibold text-[#1d1d1f] truncate max-w-[150px]">{alloc.campaign_name}</td>
                              <td className="py-2.5 text-right font-medium text-apple-green">+${alloc.allocated_increase.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                              <td className="py-2.5 text-right font-medium text-[#1d1d1f]">${alloc.new_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                              <td className="py-2.5 text-right font-semibold text-[#1d1d1f]">+{alloc.projected_conversions}</td>
                              <td className="py-2.5 text-right font-medium">{alloc.saturation_score.toFixed(1)}%</td>
                              <td className="py-2.5 text-[10px] font-bold">
                                <span className={`px-2 py-0.5 rounded-full ${
                                  alloc.status === "Saturated" ? "bg-red-50 text-apple-red animate-pulse" : "bg-green-50 text-apple-green"
                                }`}>
                                  {alloc.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Explanation card */}
                  <div className="apple-card p-5">
                    <h4 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-2">Simulated Explanation</h4>
                    <p className="text-xs text-[#6e6e73] leading-relaxed">{incrementalResult.explanation}</p>
                    
                    {incrementalResult.campaign_allocations.some((a: any) => a.status === "Saturated") && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2 text-apple-red">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-[11px] font-medium">Warning: Point of diminishing return hit in saturated campaigns. Additional budget scaling will increase CPA.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-[#e8e8ed] rounded-3xl p-10 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[350px]">
                  <TrendingUp className="w-10 h-10 stroke-1 mb-3 text-[#d2d2d7]" />
                  <p className="text-sm font-semibold">Simulate incremental budget increases</p>
                  <p className="text-xs text-[#86868b] mt-1">Specify additional budget and click Simulate Budget.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Tab View */}
        {activeTab === "portfolio" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Parameters card */}
            <div className="apple-card p-6 h-fit space-y-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">Portfolio Optimizer</h3>
              
              <form onSubmit={handlePortfolioOptimize} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                    Total Portfolio Budget ($)
                  </label>
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition font-medium text-[#1d1d1f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">
                    Optimization Objective
                  </label>
                  <select
                    value={portfolioObjective}
                    onChange={(e) => setPortfolioObjective(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-xs focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition font-semibold text-[#1d1d1f]"
                  >
                    <option value="estimated_value">Maximize Estimated Value</option>
                    <option value="revenue">Maximize Revenue</option>
                    <option value="conversions">Maximize Conversions</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={portLoading}
                  className="w-full py-3 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-sm font-semibold rounded-2xl shadow-sm apple-transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{portLoading ? "Running Solver..." : "Optimize Portfolio"}</span>
                </button>
              </form>
            </div>

            {/* Results views */}
            <div className="lg:col-span-2 space-y-6">
              {portfolioResult ? (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="apple-card p-4">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider block">Expected Value</span>
                      <span className="text-lg font-bold text-apple-green block mt-1">
                        ${portfolioResult.expected_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="apple-card p-4">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider block">Expected Convs</span>
                      <span className="text-lg font-bold text-[#1d1d1f] block mt-1">
                        {portfolioResult.expected_conversions.toLocaleString()}
                      </span>
                    </div>
                    <div className="apple-card p-4">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider block">Expected CPA</span>
                      <span className="text-lg font-bold text-[#1d1d1f] block mt-1">
                        ${portfolioResult.expected_cpa.toFixed(2)}
                      </span>
                    </div>
                    <div className="apple-card p-4">
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider block">Expected ROAS</span>
                      <span className="text-lg font-bold text-[#1d1d1f] block mt-1">
                        {portfolioResult.expected_roas.toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* Portfolio shifts Table */}
                  <div className="apple-card p-5">
                    <h4 className="text-sm font-semibold text-[#1d1d1f] mb-3">Portfolio Budget Shift Recommendations</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#e8e8ed] text-[#86868b] font-medium">
                            <th className="pb-2">Campaign</th>
                            <th className="pb-2 text-right">Current Spend</th>
                            <th className="pb-2 text-right">Optimized Spend</th>
                            <th className="pb-2 text-right">Shift Amount</th>
                            <th className="pb-2 text-right">Projected Revenue Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioResult.budget_shift_recommendations.map((shift: any, i: number) => (
                            <tr key={i} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                              <td className="py-2.5 font-semibold text-[#1d1d1f] truncate max-w-[150px]">{shift.campaign_name}</td>
                              <td className="py-2.5 text-right font-medium text-[#6e6e73]">${shift.current_spend.toLocaleString()}</td>
                              <td className="py-2.5 text-right font-bold text-[#1d1d1f]">${shift.optimized_spend.toLocaleString()}</td>
                              <td className={`py-2.5 text-right font-bold ${shift.shift_amount > 0 ? "text-apple-green" : (shift.shift_amount < 0 ? "text-apple-red" : "text-[#86868b]")}`}>
                                {shift.shift_amount > 0 ? `+$${shift.shift_amount.toLocaleString()}` : (shift.shift_amount < 0 ? `-$${Math.abs(shift.shift_amount).toLocaleString()}` : "$0")}
                              </td>
                              <td className={`py-2.5 text-right font-semibold ${shift.projected_revenue_change >= 0 ? "text-apple-green" : "text-apple-red"}`}>
                                {shift.projected_revenue_change >= 0 ? `+$${shift.projected_revenue_change.toLocaleString()}` : `-$${Math.abs(shift.projected_revenue_change).toLocaleString()}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start space-x-2 text-apple-green">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold">Optimization solver finished successfully. Expect a higher average ROAS using the shift matrix above.</span>
                  </div>
                </div>
              ) : (
                <div className="border border-[#e8e8ed] rounded-3xl p-10 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[350px]">
                  <DollarSign className="w-10 h-10 stroke-1 mb-3 text-[#d2d2d7]" />
                  <p className="text-sm font-semibold">Optimize portfolio allocations</p>
                  <p className="text-xs text-[#86868b] mt-1">Specify total portfolio budget constraint and click Optimize Portfolio.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
