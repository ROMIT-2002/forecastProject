"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Check, X, ShieldAlert, Lightbulb } from "lucide-react";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      // Fallback mock
      setRecommendations([
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
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
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
      // Fallback
      setRecommendations((prev) => 
        prev.map((rec) => rec.id === id ? { ...rec, status: newStatus } : rec)
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Optimization Insights</h1>
          <p className="text-sm text-[#86868b] mt-1">Algorithmic suggestions to maximize ROAS efficiency and stop campaign spend waste.</p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-[#86868b]">Loading recommendations...</div>
        ) : recommendations.length > 0 ? (
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
                    {/* Header */}
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

                  {/* Actions */}
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
            <p className="text-xs text-[#86868b] mt-1">Verify that your data has been uploaded to generate insights.</p>
          </div>
        )}
      </main>
    </div>
  );
}
