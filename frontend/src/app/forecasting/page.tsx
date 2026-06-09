"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { TrendingUp, Calendar, AlertTriangle, HelpCircle } from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ReferenceLine, Area
} from "recharts";

export default function ForecastingPage() {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("All Campaigns");
  const [selectedMetric, setSelectedMetric] = useState("cost");
  const [horizon, setHorizon] = useState("30");
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [dimReturns, setDimReturns] = useState<any | null>(null);
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
        setCampaigns(["Google Search - Brand", "Google Search - NonBrand", "Meta Ads - Retargeting", "Meta Ads - Prospecting", "YouTube - Brand Awareness"]);
        setSelectedCampaign("Google Search - Brand");
      }
    };
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const fetchForecastsAndHistory = async () => {
      setLoading(true);
      
      // Fetch History
      let history = [];
      try {
        const resHist = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns/${selectedCampaign}`);
        if (resHist.ok) {
          const dataHist = await resHist.json();
          history = dataHist.map((r: any) => {
            const cost = r.cost;
            const conversions = r.conversions;
            const installs = r.installs !== undefined ? r.installs : conversions;
            const cpi = installs > 0 ? cost / installs : (conversions > 0 ? cost / conversions : 0);
            
            const ltv = r.estimated_ltv !== undefined ? r.estimated_ltv : (r.conversion_value !== undefined ? r.conversion_value : 150.0);
            const estVal = conversions * ltv;
            
            let val = r[selectedMetric];
            if (selectedMetric === "cpi") val = cpi;
            if (selectedMetric === "estimated_value") val = estVal;
            
            return {
              date: r.date,
              actual: val,
              forecast: null,
              lower: null,
              upper: null
            };
          });
          setHistoryData(history);
        }
      } catch (err) {
        // Fallback history
        const today = new Date();
        const fallbackHist = [];
        let baseVal = selectedMetric === "cost" ? 150.0 : selectedMetric === "conversions" ? 12.0 : 350.0;
        if (selectedMetric === "cpa") baseVal = 25.0;
        if (selectedMetric === "roas") baseVal = 2.2;
        if (selectedMetric === "cpi") baseVal = 8.5;
        if (selectedMetric === "estimated_value") baseVal = 1800.0;

        for (let i = 30; i >= 0; i--) {
          const hDate = new Date(today);
          hDate.setDate(today.getDate() - i);
          const val = baseVal * (1.0 + Math.sin(i * 0.1) * 0.15 + (randomNoise(i) * 0.05));
          fallbackHist.push({
            date: hDate.toISOString().split("T")[0],
            actual: val,
            forecast: null,
            lower: null,
            upper: null
          });
        }
        setHistoryData(fallbackHist);
      }

      // Fetch Forecast
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/forecast?campaign_name=${selectedCampaign}&metric=${selectedMetric}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const sliced = data.slice(0, parseInt(horizon)).map((r: any) => ({
            date: r.forecast_date,
            actual: null,
            forecast: r.predicted_value,
            lower: r.lower_bound,
            upper: r.upper_bound
          }));
          setForecastData(sliced);
        }
      } catch (err) {
        // Fallback mock forecast generator
        const today = new Date();
        const mockF = [];
        let baseVal = selectedMetric === "cost" ? 150.0 : selectedMetric === "conversions" ? 12.0 : 350.0;
        if (selectedMetric === "cpa") baseVal = 25.0;
        if (selectedMetric === "roas") baseVal = 2.2;
        if (selectedMetric === "cpi") baseVal = 8.5;
        if (selectedMetric === "estimated_value") baseVal = 1800.0;
        
        for (let i = 1; i <= parseInt(horizon); i++) {
          const fDate = new Date(today);
          fDate.setDate(today.getDate() + i);
          const val = baseVal * (1.0 + (i * 0.005) + Math.sin(i * 0.2) * 0.08);
          mockF.push({
            date: fDate.toISOString().split("T")[0],
            actual: null,
            forecast: val,
            lower: val * 0.85,
            upper: val * 1.15
          });
        }
        setForecastData(mockF);
      }

      // Fetch Diminishing Returns parameters
      try {
        const resDim = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/diminishing-returns`);
        if (resDim.ok) {
          const dataDim = await resDim.json();
          const campDim = dataDim.find((c: any) => c.campaign_name === selectedCampaign);
          if (campDim) {
            setDimReturns(campDim);
          } else {
            setDimReturns(createFallbackDimReturns());
          }
        }
      } catch (err) {
        setDimReturns(createFallbackDimReturns());
      }

      setLoading(false);
    };

    if (selectedCampaign) {
      fetchForecastsAndHistory();
    }
  }, [selectedCampaign, selectedMetric, horizon]);

  const randomNoise = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const createFallbackDimReturns = () => {
    let baseSpend = 150.0;
    let b = 0.75;
    let a = 12.0 / Math.pow(baseSpend, b);
    let ltv = 150.0;
    let dimPoint = 200.0;

    if (selectedCampaign.includes("NonBrand")) {
      baseSpend = 300.0;
      dimPoint = 220.0;
    } else if (selectedCampaign.includes("Retargeting")) {
      baseSpend = 50.0;
      dimPoint = 80.0;
    } else if (selectedCampaign.includes("YouTube")) {
      baseSpend = 150.0;
      dimPoint = 100.0;
    }

    return {
      campaign_name: selectedCampaign,
      current_spend: baseSpend,
      recommended_spend: dimPoint * 0.95,
      diminishing_return_point: dimPoint,
      marginal_cpa: 35.0,
      incremental_roas: 1.5,
      saturation_score: (baseSpend / dimPoint) * 100,
      status: baseSpend > dimPoint ? "Diminishing returns" : "Efficient",
      explanation: "Fallback curve model fitted based on target SEM templates.",
      a: a,
      b: b,
      ltv: ltv
    };
  };

  const generateCurveData = () => {
    if (!dimReturns) return [];
    const a = dimReturns.a || 2.0;
    const b = dimReturns.b || 0.75;
    const ltv = dimReturns.ltv || 150.0;
    const currentSpend = dimReturns.current_spend || 150.0;
    
    // Generate 35 points from 0 to 2.5 * currentSpend
    const maxSpend = Math.round(Math.max(currentSpend * 2.5, dimReturns.diminishing_return_point * 1.5, 500));
    const step = maxSpend / 35;
    const points = [];
    
    for (let s = 1; s <= maxSpend; s += step) {
      const conversions = a * Math.pow(s, b);
      const value = conversions * ltv;
      // Incremental ROAS = ltv * a * b * s^(b-1)
      const incrementalRoas = ltv * a * b * Math.pow(s, b - 1);
      
      points.push({
        spend: Math.round(s),
        conversions: parseFloat(conversions.toFixed(1)),
        value: parseFloat(value.toFixed(2)),
        incrementalRoas: parseFloat(incrementalRoas.toFixed(2))
      });
    }
    return points;
  };

  // Merge history and forecast chronologically for the timeline chart
  const mergedChartData = [...historyData.slice(-15), ...forecastData];
  const curveData = generateCurveData();

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
              className="px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-xs font-semibold text-[#1d1d1f] focus:outline-none apple-transition shadow-sm"
            >
              {campaigns.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-xs font-semibold text-[#1d1d1f] focus:outline-none apple-transition shadow-sm"
            >
              <option value="cost">Spend ($)</option>
              <option value="conversions">Conversions</option>
              <option value="revenue">Revenue ($)</option>
              <option value="cpa">CPA ($)</option>
              <option value="roas">ROAS (x)</option>
              <option value="cpi">CPI ($)</option>
              <option value="estimated_value">Estimated Value ($)</option>
            </select>

            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#e8e8ed] rounded-2xl text-xs font-semibold text-[#1d1d1f] focus:outline-none apple-transition shadow-sm"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
        </div>

        {/* Visual Line Forecast Recharts Chart */}
        <div className="apple-card p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] capitalize">
              Actual vs. Forecasted {selectedMetric.replace("_", " ")} Trend
            </h3>
            <span className="text-xs text-[#86868b] font-medium flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Projected to {forecastData[forecastData.length - 1]?.date}
            </span>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-[#86868b]">
                Recalibrating forecast models...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" />
                  <XAxis dataKey="date" stroke="#86868b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#86868b" fontSize={10} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "#1d1d1f", borderRadius: "12px", border: "none" }}
                    labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: "#fff", fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line 
                    type="monotone" 
                    name="Actual" 
                    dataKey="actual" 
                    stroke="#0071e3" 
                    strokeWidth={2.5} 
                    dot={{ r: 3 }} 
                    activeDot={{ r: 5 }} 
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    name="Forecast" 
                    dataKey="forecast" 
                    stroke="#862e9c" 
                    strokeWidth={2.5} 
                    strokeDasharray="4 4" 
                    dot={{ r: 3 }} 
                    connectNulls 
                  />
                  <Line 
                    type="monotone" 
                    name="Upper Bound (95%)" 
                    dataKey="upper" 
                    stroke="#ced4da" 
                    strokeWidth={1} 
                    strokeDasharray="3 3" 
                    dot={false} 
                    connectNulls 
                  />
                  <Line 
                    type="monotone" 
                    name="Lower Bound (95%)" 
                    dataKey="lower" 
                    stroke="#ced4da" 
                    strokeWidth={1} 
                    strokeDasharray="3 3" 
                    dot={false} 
                    connectNulls 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Diminishing Returns Curves Dashboard */}
        {dimReturns && (
          <div className="space-y-8 mb-8">
            <div className="apple-card p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">
                    Diminishing Return Curves — {dimReturns.campaign_name}
                  </h3>
                  <p className="text-xs text-[#86868b] mt-1">{dimReturns.explanation}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5 text-xs text-[#6e6e73]">
                    <span className="w-2.5 h-2.5 rounded-full bg-apple-blue inline-block"></span>
                    <span>Current Spend (${dimReturns.current_spend})</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-[#6e6e73]">
                    <span className="w-2.5 h-2.5 rounded-full bg-apple-red inline-block"></span>
                    <span>Diminishing Point (${dimReturns.diminishing_return_point})</span>
                  </div>
                </div>
              </div>

              {/* Grid of 3 diminishing return charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spend vs Conversions */}
                <div className="bg-[#f5f5f7]/50 rounded-2xl p-4 border border-[#e8e8ed]">
                  <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider block mb-3">Spend vs. Conversions</span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" />
                        <XAxis dataKey="spend" stroke="#86868b" fontSize={9} />
                        <YAxis stroke="#86868b" fontSize={9} />
                        <RechartsTooltip formatter={(val) => [`${val} convs`, 'Conversions']} />
                        <Line type="monotone" dataKey="conversions" stroke="#0071e3" strokeWidth={2} dot={false} />
                        <ReferenceLine x={dimReturns.current_spend} stroke="#0071e3" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Current', fill: '#0071e3', fontSize: 9 }} />
                        <ReferenceLine x={dimReturns.diminishing_return_point} stroke="#ff3b30" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Saturation', fill: '#ff3b30', fontSize: 9 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Spend vs Estimated Value */}
                <div className="bg-[#f5f5f7]/50 rounded-2xl p-4 border border-[#e8e8ed]">
                  <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider block mb-3">Spend vs. Estimated Value ($)</span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" />
                        <XAxis dataKey="spend" stroke="#86868b" fontSize={9} />
                        <YAxis stroke="#86868b" fontSize={9} />
                        <RechartsTooltip formatter={(val) => [`$${val}`, 'Est. Value']} />
                        <Line type="monotone" dataKey="value" stroke="#34c759" strokeWidth={2} dot={false} />
                        <ReferenceLine x={dimReturns.current_spend} stroke="#0071e3" strokeDasharray="3 3" strokeWidth={1.5} />
                        <ReferenceLine x={dimReturns.diminishing_return_point} stroke="#ff3b30" strokeDasharray="3 3" strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Spend vs Incremental ROAS */}
                <div className="bg-[#f5f5f7]/50 rounded-2xl p-4 border border-[#e8e8ed]">
                  <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider block mb-3">Spend vs. Incremental ROAS (x)</span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" />
                        <XAxis dataKey="spend" stroke="#86868b" fontSize={9} />
                        <YAxis stroke="#86868b" fontSize={9} />
                        <RechartsTooltip formatter={(val) => [`${val}x`, 'Incr. ROAS']} />
                        <Line type="monotone" dataKey="incrementalRoas" stroke="#af52de" strokeWidth={2} dot={false} />
                        <ReferenceLine x={dimReturns.current_spend} stroke="#0071e3" strokeDasharray="3 3" strokeWidth={1.5} />
                        <ReferenceLine x={dimReturns.diminishing_return_point} stroke="#ff3b30" strokeDasharray="3 3" strokeWidth={1.5} />
                        <ReferenceLine y={1.5} stroke="#86868b" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Target 1.5x', fill: '#6e6e73', fontSize: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    <td className="py-3 font-medium text-[#1d1d1f]">{row.date}</td>
                    <td className="py-3 text-right text-[#6e6e73]">${row.lower.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-[#1d1d1f]">${row.forecast.toFixed(2)}</td>
                    <td className="py-3 text-right text-[#6e6e73]">${row.upper.toFixed(2)}</td>
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
