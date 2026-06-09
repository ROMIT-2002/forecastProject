"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, SlidersHorizontal } from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState("All");
  const [channels, setChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const resCore = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns`);
        const resEff = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sem/campaign-efficiency`);
        
        if (resCore.ok && resEff.ok) {
          const dataCore = await resCore.json();
          const dataEff = await resEff.json();
          
          // Merge core performance metrics and SEM efficiency metrics
          const merged = dataCore.map((c: any) => {
            const eff = dataEff.find((e: any) => e.campaign_name === c.campaign_name);
            return {
              ...c,
              cpi: eff ? eff.cpi : c.cost / (c.installs || c.conversions || 1),
              estimated_value: eff ? eff.estimated_value : c.conversions * 150.0,
              marginal_cpa: eff ? eff.marginal_cpa : c.cpa,
              incremental_roas: eff ? eff.incremental_roas : c.roas,
              efficiency_label: eff ? eff.efficiency_label : "Efficient"
            };
          });
          
          setCampaigns(merged);
          const uniqueChannels: string[] = Array.from(new Set(dataCore.map((c: any) => c.channel)));
          setChannels(uniqueChannels);
        }
      } catch (err) {
        // Fallback mock data
        const mockData = [
          { campaign_name: "Google Search - Brand", channel: "Google Search", cost: 12000, conversions: 480, roas: 2.5, cpa: 25.00, cpc: 1.20, clicks: 10000, ctr: 0.08, impressions: 125000, cpi: 8.50, estimated_value: 144000, marginal_cpa: 25.0, incremental_roas: 2.50, efficiency_label: "Efficient" },
          { campaign_name: "Google Search - NonBrand", channel: "Google Search", cost: 8500, conversions: 190, roas: 1.4, cpa: 44.74, cpc: 2.30, clicks: 3700, ctr: 0.02, impressions: 185000, cpi: 12.00, estimated_value: 28500, marginal_cpa: 45.0, incremental_roas: 1.10, efficiency_label: "Diminishing returns" },
          { campaign_name: "Meta Ads - Prospecting", channel: "Meta", cost: 4800, conversions: 155, roas: 1.8, cpa: 30.97, cpc: 1.50, clicks: 3200, ctr: 0.015, impressions: 213000, cpi: 9.50, estimated_value: 31000, marginal_cpa: 30.0, incremental_roas: 1.80, efficiency_label: "Efficient" },
          { campaign_name: "Meta Ads - Retargeting", channel: "Meta", cost: 3200, conversions: 210, roas: 3.2, cpa: 15.24, cpc: 0.90, clicks: 3550, ctr: 0.028, impressions: 126000, cpi: 6.20, estimated_value: 84000, marginal_cpa: 12.0, incremental_roas: 3.20, efficiency_label: "Efficient" },
          { campaign_name: "YouTube - Brand Awareness", channel: "YouTube", cost: 6500, conversions: 10, roas: 0.35, cpa: 650.00, cpc: 0.85, clicks: 7600, ctr: 0.004, impressions: 1900000, cpi: 22.00, estimated_value: 1500, marginal_cpa: 650.0, incremental_roas: 0.15, efficiency_label: "Wasteful" },
          { campaign_name: "Bing Search - Brand", channel: "Bing", cost: 2200, conversions: 90, roas: 2.1, cpa: 24.44, cpc: 0.95, clicks: 2300, ctr: 0.058, impressions: 39600, cpi: 7.20, estimated_value: 13500, marginal_cpa: 24.0, incremental_roas: 2.10, efficiency_label: "Efficient" }
        ];
        setCampaigns(mockData);
        setChannels(["Google Search", "Meta", "YouTube", "Bing"]);
      }
      setLoading(false);
    };

    fetchCampaigns();
  }, []);

  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesSearch = camp.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = filterChannel === "All" || camp.channel === filterChannel;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Campaign Performance</h1>
          <p className="text-sm text-[#86868b] mt-1">Granular breakdown of channel metrics, cost efficiencies, and conversion ROAS.</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e8e8ed] rounded-2xl text-sm focus:outline-none focus:border-[#d2d2d7] apple-transition"
            />
          </div>
          
          <div className="flex items-center space-x-3 bg-white border border-[#e8e8ed] rounded-2xl px-4 py-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#6e6e73]" />
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="bg-transparent text-sm focus:outline-none text-[#1d1d1f] font-medium"
            >
              <option value="All">All Channels</option>
              {channels.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="apple-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 text-[#86868b]">
                  <th className="p-4 font-semibold">Campaign</th>
                  <th className="p-4 font-semibold">Channel</th>
                  <th className="p-4 font-semibold text-right">Spend</th>
                  <th className="p-4 font-semibold text-right">CPI</th>
                  <th className="p-4 font-semibold text-right">Est. Value</th>
                  <th className="p-4 font-semibold text-right">Conversions</th>
                  <th className="p-4 font-semibold text-right">Marginal CPA</th>
                  <th className="p-4 font-semibold text-right">Incremental ROAS</th>
                  <th className="p-4 font-semibold">Spend Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#86868b]">
                      Loading performance records...
                    </td>
                  </tr>
                ) : filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((camp, i) => (
                    <tr key={i} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7]/30 apple-transition">
                      <td className="p-4 font-semibold text-[#1d1d1f] max-w-[150px] truncate">{camp.campaign_name}</td>
                      <td className="p-4 text-[#6e6e73]">{camp.channel}</td>
                      <td className="p-4 text-right font-medium">${camp.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 text-right text-[#6e6e73]">${camp.cpi.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium text-apple-green">${camp.estimated_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-4 text-right font-medium">{camp.conversions.toLocaleString()}</td>
                      <td className="p-4 text-right text-[#6e6e73]">${camp.marginal_cpa.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold">{camp.incremental_roas.toFixed(2)}x</td>
                      <td className="p-4 text-xs font-bold">
                        <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] ${
                          camp.efficiency_label === "Efficient" 
                            ? "bg-green-100 text-apple-green" 
                            : camp.efficiency_label === "Near saturation" 
                            ? "bg-amber-100 text-apple-orange" 
                            : camp.efficiency_label === "Diminishing returns"
                            ? "bg-orange-100 text-apple-orange animate-pulse"
                            : "bg-red-100 text-apple-red animate-pulse"
                        }`}>
                          {camp.efficiency_label}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#86868b]">
                      No campaign records match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
