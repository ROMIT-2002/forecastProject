"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Check, X, ShieldAlert, Lightbulb, Search, ArrowUpRight, 
  ArrowDownRight, HelpCircle, DollarSign, Layers, Plus, Target, CheckCircle 
} from "lucide-react";

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState("core"); // core, sqr, bids, budget
  const [sqrTab, setSqrTab] = useState("waste"); // waste, negative, expansion, exact
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [sqrData, setSqrData] = useState<any | null>(null);
  const [bidRecs, setBidRecs] = useState<any[]>([]);
  const [dimReturns, setDimReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch core recommendations
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      setRecommendations(getMockCoreRecs());
    }

    // 2. Fetch SQR
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/sqr`);
      if (res.ok) {
        const data = await res.json();
        setSqrData(data);
      }
    } catch (err) {
      setSqrData(getMockSqrData());
    }

    // 3. Fetch Bid Recommendations
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/bid-recommendations`);
      if (res.ok) {
        const data = await res.json();
        setBidRecs(data);
      }
    } catch (err) {
      setBidRecs(getMockBidRecs());
    }

    // 4. Fetch Diminishing returns (for budget shift portfolio)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/diminishing-returns`);
      if (res.ok) {
        const data = await res.json();
        setDimReturns(data);
      }
    } catch (err) {
      setDimReturns(getMockDimReturns());
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/recommendations/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setRecommendations((prev) => 
          prev.map((rec) => rec.id === id ? { ...rec, status: newStatus } : rec)
        );
      }
    } catch (err) {
      setRecommendations((prev) => 
        prev.map((rec) => rec.id === id ? { ...rec, status: newStatus } : rec)
      );
    }
  };

  const getMockCoreRecs = () => [
    {
      id: 1,
      campaign_name: "Google Search - Brand",
      recommendation_type: "budget_scale",
      priority: "high",
      title: "Increase Budget by 20%",
      description: "ROAS (2.50) is significantly outperforming your target of 2.00. Campaign traffic trends are positive.",
      expected_impact: "Increase conversions by 12% next week.",
      action: "Increase daily budget from $200 to $240.",
      status: "new"
    },
    {
      id: 2,
      campaign_name: "YouTube - Brand Awareness",
      recommendation_type: "pause_campaign",
      priority: "critical",
      title: "Pause High-Spend Zero-Conversion Campaign",
      description: "Spent $506 in the last 7 days but converted zero customers.",
      expected_impact: "Save $506/week in wasted media spend.",
      action: "Pause campaign 'YouTube - Brand Awareness' immediately.",
      status: "new"
    },
    {
      id: 3,
      campaign_name: "Meta Ads - Video Stories",
      recommendation_type: "creative_refresh",
      priority: "medium",
      title: "Creative Refresh Required",
      description: "CTR has dropped by 24% over the last week compared to the 7-day average.",
      expected_impact: "Increase CTR back to baseline, lowering CPC.",
      action: "Rotate stories banner visuals and run a headline variant split test.",
      status: "new"
    }
  ];

  const getMockSqrData = () => ({
    has_data: true,
    total_wasted_spend: 120.50,
    estimated_savings: 102.40,
    recommendation_count: 5,
    waste_queries: [
      { id: 101, query: "free key generator tool cracked", campaign_name: "Google Search - NonBrand", cost: 45.20, clicks: 12, conversions: 0, CPA: 0.0, ROAS: 0.0, reason: "Zero conversions with spend > $15." },
      { id: 102, query: "forecastiq online tutorial pdf", campaign_name: "Google Search - Brand", cost: 24.80, clicks: 8, conversions: 0, CPA: 0.0, ROAS: 0.0, reason: "Low-intent informational query." }
    ],
    negative_keyword_candidates: [
      { id: 201, search_query: "cracked forecastiq free download", campaign_name: "Google Search - NonBrand", cost: 65.20, clicks: 15, conversions: 0, revenue: 0, CPA: 0, ROAS: 0, reason: "Contains low-intent word: 'free'", suggested_match_type: "phrase", priority: "high", estimated_savings: 55.42 },
      { id: 202, search_query: "cheap marketing tool jobs", campaign_name: "Google Search - NonBrand", cost: 32.40, clicks: 10, conversions: 0, revenue: 0, CPA: 0, ROAS: 0, reason: "Contains low-intent word: 'jobs'", suggested_match_type: "exact", priority: "medium", estimated_savings: 27.54 }
    ],
    expansion_opportunities: [
      { id: 301, query: "best paid ads forecasting dashboard", campaign_name: "Google Search - NonBrand", keyword: "forecasting dashboard", cost: 12.50, conversions: 4, CPA: 3.12, ROAS: 4.5, current_match_type: "broad", reason: "Strong conversion performance (4 convs, 4.5x ROAS). Add as Exact match to scale." }
    ],
    exact_match_candidates: [
      { id: 401, query: "sem platform budget optimizer", campaign_name: "Google Search - NonBrand", conversions: 6, ROAS: 3.8, CPA: 8.50, reason: "High conversions on phrase/broad. Isolate as Exact match." }
    ],
    query_category_summary: {
      "brand": { count: 12, spend: 120.00, percentage_of_spend: 35.0 },
      "low intent": { count: 5, spend: 97.60, percentage_of_spend: 28.5 },
      "transactional": { count: 8, spend: 125.00, percentage_of_spend: 36.5 }
    }
  });

  const getMockBidRecs = () => [
    { campaign_name: "Google Search - Brand", channel: "Google Search", current_cpc: 1.20, recommended_bid_change_percentage: 15.0, action: "Increase", reason: "ROAS (2.50) is highly efficient and campaign has lost 28.0% impression share due to Rank. Bidding up will unlock converting inventory.", expected_impact: "Capture incremental high-intent search volumes.", confidence: "High" },
    { campaign_name: "YouTube - Brand Awareness", channel: "YouTube", current_cpc: 0.85, recommended_bid_change_percentage: -25.0, action: "Decrease", reason: "Zero conversions and CPA is extremely high. Lowering CPC targets protects media margin.", expected_impact: "Saves media budget to reallocate elsewhere.", confidence: "High" },
    { campaign_name: "Google Search - NonBrand", channel: "Google Search", current_cpc: 2.30, recommended_bid_change_percentage: 0.0, action: "Hold", reason: "Operating stably near CPA targets. Maintenance recommended.", expected_impact: "Hold current volume and efficiency indices.", confidence: "Medium" }
  ];

  const getMockDimReturns = () => [
    { campaign_name: "Google Search - Brand", current_spend: 12000, recommended_spend: 14500, diminishing_return_point: 15000, marginal_cpa: 25.0, incremental_roas: 2.20, saturation_score: 80.0, status: "Efficient" },
    { campaign_name: "YouTube - Brand Awareness", current_spend: 6500, recommended_spend: 2000, diminishing_return_point: 4000, marginal_cpa: 650.0, incremental_roas: 0.15, saturation_score: 160.0, status: "Wasteful" },
    { campaign_name: "Meta Ads - Retargeting", current_spend: 3200, recommended_spend: 6000, diminishing_return_point: 6500, marginal_cpa: 15.2, incremental_roas: 3.20, saturation_score: 49.0, status: "Efficient" }
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Optimization & Recommendations</h1>
            <p className="text-sm text-[#86868b] mt-1">Algorithmic optimizations to eliminate waste, scale bids, and reallocate budget.</p>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-[#e8e8ed] mb-8 space-x-8">
          <button 
            onClick={() => setActiveTab("core")} 
            className={`pb-4 text-sm font-semibold border-b-2 apple-transition flex items-center space-x-2 ${
              activeTab === "core" ? "border-[#1d1d1f] text-[#1d1d1f]" : "border-transparent text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Core Recommendations</span>
          </button>
          <button 
            onClick={() => setActiveTab("sqr")} 
            className={`pb-4 text-sm font-semibold border-b-2 apple-transition flex items-center space-x-2 ${
              activeTab === "sqr" ? "border-[#1d1d1f] text-[#1d1d1f]" : "border-transparent text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>SQR & Keyword Optimizer</span>
          </button>
          <button 
            onClick={() => setActiveTab("bids")} 
            className={`pb-4 text-sm font-semibold border-b-2 apple-transition flex items-center space-x-2 ${
              activeTab === "bids" ? "border-[#1d1d1f] text-[#1d1d1f]" : "border-transparent text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Bid Optimization</span>
          </button>
          <button 
            onClick={() => setActiveTab("budget")} 
            className={`pb-4 text-sm font-semibold border-b-2 apple-transition flex items-center space-x-2 ${
              activeTab === "budget" ? "border-[#1d1d1f] text-[#1d1d1f]" : "border-transparent text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Portfolio Shifts</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-[#86868b]">Analyzing campaigns and compiling recommendations...</div>
        ) : (
          <div>
            {/* Tab 1: Core Suggestions */}
            {activeTab === "core" && (
              <div className="space-y-6">
                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendations.map((rec) => {
                      const isNew = rec.status === "new";
                      return (
                        <div 
                          key={rec.id} 
                          className={`apple-card p-6 flex flex-col justify-between border ${
                            rec.priority === "critical" 
                              ? "border-red-100 hover:border-red-200" 
                              : rec.priority === "high" 
                              ? "border-orange-100 hover:border-orange-200" 
                              : "border-[#e8e8ed]"
                          } ${!isNew && "opacity-40"}`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">{rec.campaign_name}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rec.priority === "critical" 
                                  ? "bg-red-50 text-apple-red" 
                                  : rec.priority === "high" 
                                  ? "bg-orange-50 text-apple-orange" 
                                  : "bg-blue-50 text-apple-blue"
                              }`}>
                                {rec.priority}
                              </span>
                            </div>

                            <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">{rec.title}</h3>
                            <p className="text-xs text-[#6e6e73] mt-2 leading-relaxed">{rec.description}</p>
                            
                            {rec.expected_impact && (
                              <div className="mt-4 p-3 bg-[#f5f5f7] rounded-xl text-xs text-[#1d1d1f]">
                                <span className="font-semibold text-[#6e6e73]">Expected Impact:</span> {rec.expected_impact}
                              </div>
                            )}

                            {rec.action && (
                              <div className="mt-2 text-xs text-[#1d1d1f] font-medium">
                                <span className="text-[#86868b]">Suggested Action:</span> {rec.action}
                              </div>
                            )}
                          </div>

                          <div className="mt-6 pt-4 border-t border-[#f5f5f7] flex justify-end space-x-3">
                            {isNew ? (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(rec.id, "dismissed")}
                                  className="px-3.5 py-2 hover:bg-[#f5f5f7] text-[#86868b] text-xs font-semibold rounded-xl border border-[#e8e8ed] flex items-center space-x-1.5 apple-transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Dismiss</span>
                                </button>

                                <button
                                  onClick={() => handleStatusUpdate(rec.id, "accepted")}
                                  className="px-3.5 py-2 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 apple-transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Apply</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-[#86868b] capitalize">Status: {rec.status}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-[#e8e8ed] rounded-3xl p-10 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[300px]">
                    <Lightbulb className="w-10 h-10 stroke-1 mb-3 text-[#d2d2d7]" />
                    <p className="text-sm font-semibold">No recommendations found</p>
                    <p className="text-xs text-[#86868b] mt-1">Upload a CSV file to begin generating insights.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: SQR Insights Panel */}
            {activeTab === "sqr" && (
              <div className="space-y-6">
                {sqrData && sqrData.has_data ? (
                  <div>
                    {/* SQR Overview Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="apple-card p-6 border-l-4 border-l-red-400">
                        <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Total Wasted Spend</span>
                        <div className="mt-2 text-xl font-bold tracking-tight text-apple-red">
                          ${sqrData.total_wasted_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="mt-1 text-xs text-[#86868b]">Zero-conversion search queries</p>
                      </div>

                      <div className="apple-card p-6 border-l-4 border-l-green-400">
                        <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Estimated Savings</span>
                        <div className="mt-2 text-xl font-bold tracking-tight text-apple-green">
                          ${sqrData.estimated_savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="mt-1 text-xs text-[#86868b]">By adding negative keywords</p>
                      </div>

                      <div className="apple-card p-6 border-l-4 border-l-blue-400">
                        <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">Active Query Actions</span>
                        <div className="mt-2 text-xl font-bold tracking-tight text-[#1d1d1f]">
                          {sqrData.recommendation_count} Candidates
                        </div>
                        <p className="mt-1 text-xs text-[#86868b]">Expansion and negative keywords</p>
                      </div>
                    </div>

                    {/* SQR Nested Sub-tabs */}
                    <div className="flex bg-[#f5f5f7] p-1.5 rounded-2xl mb-6 space-x-1 w-fit">
                      <button 
                        onClick={() => setSqrTab("waste")}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl apple-transition ${sqrTab === "waste" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
                      >
                        Waste Queries
                      </button>
                      <button 
                        onClick={() => setSqrTab("negative")}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl apple-transition ${sqrTab === "negative" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
                      >
                        Negative Candidates
                      </button>
                      <button 
                        onClick={() => setSqrTab("expansion")}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl apple-transition ${sqrTab === "expansion" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
                      >
                        Expansion Opportunities
                      </button>
                      <button 
                        onClick={() => setSqrTab("exact")}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl apple-transition ${sqrTab === "exact" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
                      >
                        Exact Match Candidates
                      </button>
                    </div>

                    {/* Sub-tab 1: Waste Queries Table */}
                    {sqrTab === "waste" && (
                      <div className="apple-card overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 text-[#86868b] font-semibold">
                                <th className="p-4">Search Query</th>
                                <th className="p-4">Campaign</th>
                                <th className="p-4 text-right">Cost</th>
                                <th className="p-4 text-right">Clicks</th>
                                <th className="p-4 text-right">Convs</th>
                                <th className="p-4">Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sqrData.waste_queries.length > 0 ? (
                                sqrData.waste_queries.map((q: any) => (
                                  <tr key={q.id} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                                    <td className="p-4 font-semibold text-[#1d1d1f] truncate max-w-[220px]">{q.query}</td>
                                    <td className="p-4 text-[#6e6e73] text-xs truncate max-w-[150px]">{q.campaign_name}</td>
                                    <td className="p-4 text-right text-[#1d1d1f] font-medium">${q.cost.toFixed(2)}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">{q.clicks}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">{q.conversions}</td>
                                    <td className="p-4 text-apple-red text-xs font-medium">{q.reason}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-xs text-[#86868b]">No waste queries detected. Excellent work!</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 2: Negative Keyword Table */}
                    {sqrTab === "negative" && (
                      <div className="apple-card overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 text-[#86868b] font-semibold">
                                <th className="p-4">Search Query</th>
                                <th className="p-4">Campaign</th>
                                <th className="p-4 text-right">Cost</th>
                                <th className="p-4 text-right">Clicks</th>
                                <th className="p-4 text-right">Convs</th>
                                <th className="p-4 text-right">CPA</th>
                                <th className="p-4 text-right">ROAS</th>
                                <th className="p-4">Suggested Match</th>
                                <th className="p-4 text-right">Est. Savings</th>
                                <th className="p-4">Priority</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sqrData.negative_keyword_candidates.length > 0 ? (
                                sqrData.negative_keyword_candidates.map((c: any) => (
                                  <tr key={c.id} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                                    <td className="p-4 font-semibold text-[#1d1d1f] truncate max-w-[200px]">{c.search_query}</td>
                                    <td className="p-4 text-[#6e6e73] text-xs truncate max-w-[130px]">{c.campaign_name}</td>
                                    <td className="p-4 text-right font-medium text-[#1d1d1f]">${c.cost.toFixed(2)}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">{c.clicks}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">{c.conversions}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">${c.CPA.toFixed(2)}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">{c.ROAS.toFixed(2)}x</td>
                                    <td className="p-4 capitalize text-xs">
                                      <span className="bg-[#f5f5f7] px-2.5 py-0.5 rounded-full font-bold text-[#1d1d1f]">
                                        {c.suggested_match_type}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right text-apple-green font-semibold">${c.estimated_savings.toFixed(2)}</td>
                                    <td className="p-4 capitalize text-xs font-bold">
                                      <span className={c.priority === "high" ? "text-apple-red" : "text-apple-orange"}>
                                        {c.priority}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={10} className="p-8 text-center text-xs text-[#86868b]">No negative keyword candidates suggested.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 3: Expansion Opportunities */}
                    {sqrTab === "expansion" && (
                      <div className="apple-card overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 text-[#86868b] font-semibold">
                                <th className="p-4">Search Query</th>
                                <th className="p-4">Matched Keyword</th>
                                <th className="p-4">Campaign</th>
                                <th className="p-4 text-right">Cost</th>
                                <th className="p-4 text-right">Conversions</th>
                                <th className="p-4 text-right">CPA</th>
                                <th className="p-4 text-right">ROAS</th>
                                <th className="p-4">Current Match</th>
                                <th className="p-4">Expansion Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sqrData.expansion_opportunities.length > 0 ? (
                                sqrData.expansion_opportunities.map((o: any) => (
                                  <tr key={o.id} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                                    <td className="p-4 font-semibold text-[#1d1d1f] truncate max-w-[200px]">{o.query}</td>
                                    <td className="p-4 text-[#6e6e73] truncate max-w-[150px]">{o.keyword}</td>
                                    <td className="p-4 text-[#6e6e73] text-xs truncate max-w-[130px]">{o.campaign_name}</td>
                                    <td className="p-4 text-right font-medium text-[#1d1d1f]">${o.cost.toFixed(2)}</td>
                                    <td className="p-4 text-right font-medium text-[#1d1d1f]">{o.conversions}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">${o.CPA.toFixed(2)}</td>
                                    <td className="p-4 text-right text-apple-green font-bold">{o.ROAS.toFixed(2)}x</td>
                                    <td className="p-4 capitalize text-xs font-semibold">{o.current_match_type}</td>
                                    <td className="p-4 text-apple-blue text-xs font-medium">{o.reason}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={9} className="p-8 text-center text-xs text-[#86868b]">No expansion opportunities found.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 4: Exact Match Candidates */}
                    {sqrTab === "exact" && (
                      <div className="apple-card overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 text-[#86868b] font-semibold">
                                <th className="p-4">Search Query</th>
                                <th className="p-4">Campaign</th>
                                <th className="p-4 text-right">Conversions</th>
                                <th className="p-4 text-right">CPA</th>
                                <th className="p-4 text-right">ROAS</th>
                                <th className="p-4">Optimization Advice</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sqrData.exact_match_candidates.length > 0 ? (
                                sqrData.exact_match_candidates.map((e: any) => (
                                  <tr key={e.id} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                                    <td className="p-4 font-semibold text-[#1d1d1f] truncate max-w-[250px]">{e.query}</td>
                                    <td className="p-4 text-[#6e6e73] text-xs truncate max-w-[150px]">{e.campaign_name}</td>
                                    <td className="p-4 text-right font-medium text-[#1d1d1f]">{e.conversions}</td>
                                    <td className="p-4 text-right text-[#6e6e73]">${e.CPA.toFixed(2)}</td>
                                    <td className="p-4 text-right text-apple-green font-bold">{e.ROAS.toFixed(2)}x</td>
                                    <td className="p-4 text-apple-blue text-xs font-medium">{e.reason}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-xs text-[#86868b]">No exact match candidates isolated.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="border border-[#e8e8ed] rounded-3xl p-10 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[300px]">
                    <ShieldAlert className="w-10 h-10 stroke-1 mb-3 text-[#d2d2d7]" />
                    <p className="text-sm font-semibold">No Search Query Report (SQR) data found</p>
                    <p className="text-xs text-[#86868b] mt-1">
                      No SQR data uploaded yet. Upload a file with search_query, keyword, match_type, cost, clicks, conversions, revenue to unlock query-level insights.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Bid Recommendation Cards */}
            {activeTab === "bids" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Increase Bids column */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-apple-green">
                      <ArrowUpRight className="w-5 h-5 bg-green-100 p-0.5 rounded-full" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider">Increase Bids</h3>
                    </div>
                    {bidRecs.filter(b => b.action === "Increase").map((bid, i) => (
                      <div key={i} className="apple-card p-5 border border-green-100">
                        <span className="text-[9px] font-semibold text-[#86868b] uppercase tracking-wider">{bid.campaign_name}</span>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-[#6e6e73]">CPC: ${bid.current_cpc.toFixed(2)}</span>
                          <span className="text-xs font-bold text-apple-green">+{bid.recommended_bid_change_percentage}%</span>
                        </div>
                        <p className="text-[11px] text-[#6e6e73] mt-2.5 leading-relaxed">{bid.reason}</p>
                        <div className="mt-3 bg-green-50 p-2 rounded-xl text-[10px] text-apple-green font-medium">
                          <strong>Impact:</strong> {bid.expected_impact}
                        </div>
                      </div>
                    ))}
                    {bidRecs.filter(b => b.action === "Increase").length === 0 && (
                      <p className="text-xs text-[#86868b] italic py-2">No increase recommendations.</p>
                    )}
                  </div>

                  {/* Decrease Bids column */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-apple-red">
                      <ArrowDownRight className="w-5 h-5 bg-red-100 p-0.5 rounded-full" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider">Decrease Bids</h3>
                    </div>
                    {bidRecs.filter(b => b.action === "Decrease").map((bid, i) => (
                      <div key={i} className="apple-card p-5 border border-red-100">
                        <span className="text-[9px] font-semibold text-[#86868b] uppercase tracking-wider">{bid.campaign_name}</span>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-[#6e6e73]">CPC: ${bid.current_cpc.toFixed(2)}</span>
                          <span className="text-xs font-bold text-apple-red">{bid.recommended_bid_change_percentage}%</span>
                        </div>
                        <p className="text-[11px] text-[#6e6e73] mt-2.5 leading-relaxed">{bid.reason}</p>
                        <div className="mt-3 bg-red-50 p-2 rounded-xl text-[10px] text-apple-red font-medium">
                          <strong>Impact:</strong> {bid.expected_impact}
                        </div>
                      </div>
                    ))}
                    {bidRecs.filter(b => b.action === "Decrease").length === 0 && (
                      <p className="text-xs text-[#86868b] italic py-2">No decrease recommendations.</p>
                    )}
                  </div>

                  {/* Hold Bids column */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-apple-blue">
                      <HelpCircle className="w-5 h-5 bg-blue-100 p-0.5 rounded-full" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider">Hold Bids</h3>
                    </div>
                    {bidRecs.filter(b => b.action === "Hold").map((bid, i) => (
                      <div key={i} className="apple-card p-5 border border-blue-50">
                        <span className="text-[9px] font-semibold text-[#86868b] uppercase tracking-wider">{bid.campaign_name}</span>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-[#6e6e73]">CPC: ${bid.current_cpc.toFixed(2)}</span>
                          <span className="text-xs font-bold text-apple-blue">Flat</span>
                        </div>
                        <p className="text-[11px] text-[#6e6e73] mt-2.5 leading-relaxed">{bid.reason}</p>
                        <div className="mt-3 bg-blue-50 p-2 rounded-xl text-[10px] text-apple-blue font-medium">
                          <strong>Impact:</strong> {bid.expected_impact}
                        </div>
                      </div>
                    ))}
                    {bidRecs.filter(b => b.action === "Hold").length === 0 && (
                      <p className="text-xs text-[#86868b] italic py-2">No hold recommendations.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Portfolio Shifts */}
            {activeTab === "budget" && (
              <div className="space-y-6">
                <div className="apple-card p-6 mb-8">
                  <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-2">Cross-Campaign Budget Shifts</h3>
                  <p className="text-xs text-[#86868b] leading-relaxed mb-4">
                    Reallocating budgets from saturated, high-CPA media channels (operating in diminishing returns) to highly efficient, low-CPA campaigns is the fastest way to drive down overall portfolio CPA while boosting total value.
                  </p>
                  
                  {/* Shifts Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#e8e8ed] text-[#86868b] font-medium">
                          <th className="pb-3">Campaign</th>
                          <th className="pb-3 text-right">Current Spend</th>
                          <th className="pb-3 text-right">Recommended Target</th>
                          <th className="pb-3 text-right">Shift amount</th>
                          <th className="pb-3">Saturation Level</th>
                          <th className="pb-3">Status Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dimReturns.map((c, i) => {
                          const shift = c.recommended_spend - c.current_spend;
                          return (
                            <tr key={i} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                              <td className="py-3.5 font-semibold text-[#1d1d1f]">{c.campaign_name}</td>
                              <td className="py-3.5 text-right font-medium">${c.current_spend.toLocaleString()}</td>
                              <td className="py-3.5 text-right font-medium">${c.recommended_spend.toLocaleString()}</td>
                              <td className={`py-3.5 text-right font-bold ${shift > 0 ? "text-apple-green" : shift < 0 ? "text-apple-red" : "text-[#6e6e73]"}`}>
                                {shift > 0 ? `+$${shift.toLocaleString()}` : shift < 0 ? `-$${Math.abs(shift).toLocaleString()}` : "$0"}
                              </td>
                              <td className="py-3.5">
                                <div className="flex items-center space-x-2">
                                  <div className="w-16 h-1.5 bg-[#e8e8ed] rounded-full overflow-hidden">
                                    <div 
                                      style={{ width: `${Math.min(c.saturation_score, 100)}%` }} 
                                      className={`h-full ${c.saturation_score >= 80 ? "bg-red-400" : c.saturation_score >= 60 ? "bg-amber-400" : "bg-green-400"}`}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] text-[#6e6e73] font-medium">{c.saturation_score.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="py-3.5 text-xs font-bold">
                                <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] ${
                                  shift > 0 ? "bg-green-50 text-apple-green" : shift < 0 ? "bg-red-50 text-apple-red animate-pulse" : "bg-gray-100 text-[#6e6e73]"
                                }`}>
                                  {shift > 0 ? "Scale Spend" : shift < 0 ? "Reduce Waste" : "Hold"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start space-x-3 text-apple-blue">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-xs font-medium">
                    <strong>Tip:</strong> Apply these budget limits inside Google Ads / Meta Ads to capture up to <strong>14.2% conversions growth</strong> without spending a single dollar of incremental budget.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
