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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/campaigns`);
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data);
          
          // Extract unique channels
          const uniqueChannels: string[] = Array.from(new Set(data.map((c: any) => c.channel)));
          setChannels(uniqueChannels);
        }
      } catch (err) {
        // Fallback mock data
        const mockData = [
          { campaign_name: "Google Search - Brand", channel: "Google Search", cost: 12000, conversions: 480, roas: 2.5, cpa: 25.00, cpc: 1.20, clicks: 10000, ctr: 0.08, impressions: 125000 },
          { campaign_name: "Google Search - NonBrand", channel: "Google Search", cost: 8500, conversions: 190, roas: 1.4, cpa: 44.74, cpc: 2.30, clicks: 3700, ctr: 0.02, impressions: 185000 },
          { campaign_name: "Meta Ads - Prospecting", channel: "Meta", cost: 4800, conversions: 155, roas: 1.8, cpa: 30.97, cpc: 1.50, clicks: 3200, ctr: 0.015, impressions: 213000 },
          { campaign_name: "Meta Ads - Retargeting", channel: "Meta", cost: 3200, conversions: 210, roas: 3.2, cpa: 15.24, cpc: 0.90, clicks: 3550, ctr: 0.028, impressions: 126000 },
          { campaign_name: "YouTube - Brand Awareness", channel: "YouTube", cost: 6500, conversions: 10, roas: 0.35, cpa: 650.00, cpc: 0.85, clicks: 7600, ctr: 0.004, impressions: 1900000 },
          { campaign_name: "Bing Search - Brand", channel: "Bing", cost: 2200, conversions: 90, roas: 2.1, cpa: 24.44, cpc: 0.95, clicks: 2300, ctr: 0.058, impressions: 39600 }
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
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]/50 text-[#86868b]">
                  <th className="p-4 font-semibold">Campaign</th>
                  <th className="p-4 font-semibold">Channel</th>
                  <th className="p-4 font-semibold text-right">Spend</th>
                  <th className="p-4 font-semibold text-right">Impressions</th>
                  <th className="p-4 font-semibold text-right">Clicks</th>
                  <th className="p-4 font-semibold text-right">CPC</th>
                  <th className="p-4 font-semibold text-right">Conversions</th>
                  <th className="p-4 font-semibold text-right">CPA</th>
                  <th className="p-4 font-semibold text-right">ROAS</th>
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
                      <td className="p-4 font-semibold text-[#1d1d1f] max-w-[200px] truncate">{camp.campaign_name}</td>
                      <td className="p-4 text-[#6e6e73]">{camp.channel}</td>
                      <td className="p-4 text-right font-medium">${camp.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 text-right text-[#6e6e73]">{camp.impressions.toLocaleString()}</td>
                      <td className="p-4 text-right text-[#6e6e73]">{camp.clicks.toLocaleString()}</td>
                      <td className="p-4 text-right text-[#6e6e73]">${camp.cpc.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium">{camp.conversions.toLocaleString()}</td>
                      <td className="p-4 text-right text-[#6e6e73]">${camp.cpa.toFixed(2)}</td>
                      <td className={`p-4 text-right font-bold ${camp.roas >= 2.0 ? "text-apple-green" : camp.roas < 1.0 ? "text-apple-red" : "text-[#1d1d1f]"}`}>
                        {camp.roas.toFixed(2)}x
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
