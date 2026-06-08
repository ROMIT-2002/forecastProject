"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { TrendingUp, Calendar, ChevronRight } from "lucide-react";

export default function ForecastingPage() {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("All Campaigns");
  const [selectedMetric, setSelectedMetric] = useState("cost");
  const [horizon, setHorizon] = useState("30");
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns`);
        if (res.ok) {
          const data = await res.json();
          const uniqueNames = Array.from(new Set(data.map((c: any) => c.campaign_name))) as string[];
          setCampaigns(uniqueNames);
          if (uniqueNames.length > 0) {
            setSelectedCampaign(uniqueNames[0]);
          }
        }
      } catch (err) {
        setCampaigns(["Google Search - Brand", "Meta Ads - Retargeting", "Google - Performance Max"]);
        setSelectedCampaign("Google Search - Brand");
      }
    };
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const fetchForecasts = async () => {
      setLoading(true);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/forecast?campaign_name=${selectedCampaign}&metric=${selectedMetric}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setForecastData(data.slice(0, parseInt(horizon)));
        }
      } catch (err) {
        // Fallback mock forecast generator
        const today = new Date();
        const mockF = [];
        let baseVal = selectedMetric === "cost" ? 150.0 : selectedMetric === "conversions" ? 12.0 : 350.0;
        if (selectedMetric === "cpa") baseVal = 25.0;
        if (selectedMetric === "roas") baseVal = 2.2;
        
        for (let i = 1; i <= parseInt(horizon); i++) {
          const fDate = new Date(today);
          fDate.setDate(today.getDate() + i);
          const val = baseVal * (1.0 + (i * 0.005) + Math.sin(i) * 0.08);
          mockF.push({
            forecast_date: fDate.toISOString().split("T")[0],
            predicted_value: val,
            lower_bound: val * 0.85,
            upper_bound: val * 1.15
          });
        }
        setForecastData(mockF);
      }
      setLoading(false);
    };
    if (selectedCampaign) {
      fetchForecasts();
    }
  }, [selectedCampaign, selectedMetric, horizon]);

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Predictive Forecasting</h1>
            <p className="text-sm text-[#86868b] mt-1">Multi-horizon seasonal projections for key digital advertising metrics.</p>
          </div>

          <div className="flex space-x-3">
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-xs font-semibold text-[#1d1d1f] focus:outline-none apple-transition"
            >
              {campaigns.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-xs font-semibold text-[#1d1d1f] focus:outline-none apple-transition"
            >
              <option value="cost">Spend ($)</option>
              <option value="conversions">Conversions</option>
              <option value="revenue">Revenue ($)</option>
              <option value="cpa">CPA ($)</option>
              <option value="roas">ROAS (x)</option>
            </select>

            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-xs font-semibold text-[#1d1d1f] focus:outline-none apple-transition"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
        </div>

        {/* Visual Line Forecast Placeholder (Apple Style) */}
        <div className="apple-card p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">Actual vs. Forecasted Trend</h3>
            <span className="text-xs text-[#86868b] font-medium flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Projected to {forecastData[forecastData.length - 1]?.forecast_date}
            </span>
          </div>

          {/* Minimalist Visual Representation of Forecast Curve */}
          <div className="h-64 w-full bg-[#f5f5f7]/50 rounded-2xl flex items-end justify-between p-6 relative overflow-hidden border border-[#e8e8ed]/60">
            {/* Draw a subtle grid background */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
              <div className="border-b border-[#e8e8ed] w-full h-0"></div>
              <div className="border-b border-[#e8e8ed] w-full h-0"></div>
              <div className="border-b border-[#e8e8ed] w-full h-0"></div>
              <div className="border-b border-[#e8e8ed] w-full h-0"></div>
            </div>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-[#86868b]">
                Recalibrating forecast models...
              </div>
            ) : (
              <div className="flex w-full h-full items-end justify-between space-x-1.5 z-10 pt-8">
                {forecastData.map((data, idx) => {
                  // Scale height dynamically
                  const maxVal = Math.max(...forecastData.map(d => d.predicted_value)) || 1;
                  const heightPct = (data.predicted_value / maxVal) * 80;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-[#1d1d1f] text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 shadow-md">
                        {data.predicted_value.toFixed(2)}
                      </div>
                      {/* Interactive visual curve bar */}
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-[#e8e8ed] group-hover:bg-[#1d1d1f] rounded-t-md apple-transition"
                      ></div>
                      <span className="text-[9px] text-[#86868b] mt-2 hidden md:block">
                        {data.forecast_date.split("-")[2]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Data values table */}
        <div className="apple-card p-6">
          <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-4">Forecast Projections Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e8e8ed] text-[#86868b] font-medium">
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Lower Bound</th>
                  <th className="pb-3 text-right">Predicted Value</th>
                  <th className="pb-3 text-right">Upper Bound</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                    <td className="py-3 font-medium text-[#1d1d1f]">{row.forecast_date}</td>
                    <td className="py-3 text-right text-[#6e6e73]">${row.lower_bound.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-[#1d1d1f]">${row.predicted_value.toFixed(2)}</td>
                    <td className="py-3 text-right text-[#6e6e73]">${row.upper_bound.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
