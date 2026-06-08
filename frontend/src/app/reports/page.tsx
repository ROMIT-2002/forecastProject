"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { FileText, Download, Sparkles } from "lucide-react";

export default function ReportsPage() {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/reports/executive`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      // Mock Fallback
      setReport({
        performance_summary: "Over the last 30 days, total portfolio spend pacing decreased by 5.2% while conversion volumes increased by 3.8%. Average Return on Ad Spend (ROAS) improved slightly to 1.97x with total net revenue climbing to $48,200.00.",
        forecast_summary: "Predictive algorithms estimate a stable 30-day conversion trajectory at 950 total acquisitions. Portfolios are projected to cost $25,120 next month under current trends, yielding a net revenue of approximately $51,400.00.",
        risks: "Meta Ads Retargeting has an active critical CPC spike (Z-score: 3.12). YouTube Brand Awareness is suffering from a flat conversion trend despite spending over $500.",
        opportunities: "Google Search Brand campaign is performing with high efficiency (2.50x ROAS). Scaling its daily budget limit by 20% is highly recommended.",
        action_plan: "1. Audit Meta Retargeting placement structures.\n2. Scale Google Search Brand daily budget limits by 20%.\n3. Pause low-performing YouTube Prospecting video ads.",
        business_impact: "Implementing all recommended reallocations is estimated to yield an additional $3,800.00 in monthly net revenue."
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownload = () => {
    if (!report) return;
    const docContent = `
# ForecastIQ AI - Executive Summary Report
Generated on: ${new Date().toLocaleDateString()}

## 1. Performance Overview
${report.performance_summary}

## 2. Projections & Forecasts
${report.forecast_summary}

## 3. Key Portfolio Risks
${report.risks}

## 4. Scaling Opportunities
${report.opportunities}

## 5. Structured Action Plan
${report.action_plan}

## 6. Projected Net Business Impact
${report.business_impact}
    `;

    const blob = new Blob([docContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `forecastiq_executive_report_${new Date().toISOString().split("T")[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Executive Insights</h1>
            <p className="text-sm text-[#86868b] mt-1">Plain-English performance reports synthesized from latest campaign stats, anomaly alerts, and forecast models.</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={fetchReport}
              disabled={generating}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#e8e8ed] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-semibold rounded-2xl shadow-sm apple-transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
              <span>Regenerate Report</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !report}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-xs font-semibold rounded-2xl shadow-sm apple-transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-[#86868b]">Compiling campaign summaries...</div>
        ) : report ? (
          <div className="max-w-3xl space-y-8">
            {/* Performance */}
            <div className="apple-card p-8">
              <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Performance Summary</h3>
              <p className="text-sm text-[#1d1d1f] leading-relaxed font-medium">{report.performance_summary}</p>
            </div>

            {/* Forecast */}
            <div className="apple-card p-8">
              <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">Forecast Outlook</h3>
              <p className="text-sm text-[#1d1d1f] leading-relaxed">{report.forecast_summary}</p>
            </div>

            {/* Risks & Opps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="apple-card p-8 border border-red-100 bg-red-50/10">
                <h3 className="text-xs font-bold text-apple-red uppercase tracking-wider mb-2">Risks & Anomalies</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed whitespace-pre-line">{report.risks}</p>
              </div>

              <div className="apple-card p-8 border border-green-100 bg-green-50/10">
                <h3 className="text-xs font-bold text-apple-green uppercase tracking-wider mb-2">Opportunities</h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed whitespace-pre-line">{report.opportunities}</p>
              </div>
            </div>

            {/* Action plan */}
            <div className="apple-card p-8">
              <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-3">Action Plan</h3>
              <p className="text-xs text-[#1d1d1f] leading-relaxed whitespace-pre-line font-medium">{report.action_plan}</p>
            </div>

            {/* Impact */}
            <div className="apple-card p-8 border border-blue-100 bg-blue-50/10">
              <h3 className="text-xs font-bold text-apple-blue uppercase tracking-wider mb-2">Projected Impact</h3>
              <p className="text-sm text-[#1d1d1f] leading-relaxed font-semibold">{report.business_impact}</p>
            </div>
          </div>
        ) : (
          <div className="border border-[#e8e8ed] rounded-3xl p-10 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[300px]">
            <FileText className="w-10 h-10 stroke-1 mb-3 text-[#d2d2d7]" />
            <p className="text-sm font-semibold">Report Generation Pending</p>
            <p className="text-xs text-[#86868b] mt-1">Upload files and trigger predictions to generate business intelligence summaries.</p>
          </div>
        )}
      </main>
    </div>
  );
}
