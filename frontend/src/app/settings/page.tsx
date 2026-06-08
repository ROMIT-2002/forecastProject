"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Play, Settings as SettingsIcon, ShieldAlert, Cpu } from "lucide-react";

export default function SettingsPage() {
  const [targetRoas, setTargetRoas] = useState(2.0);
  const [targetCpa, setTargetCpa] = useState(30.0);
  const [agents, setAgents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      // Fallback registry matching BaseAgent list
      setAgents([
        { name: "Daily Pacing Agent", description: "Checks whether campaigns are underpacing or overspending.", status: "idle" },
        { name: "Forecast Refresh Agent", description: "Refreshes 7, 14, and 30 day forecasts.", status: "idle" },
        { name: "Budget Optimization Agent", description: "Recommends budget shifts across campaigns.", status: "idle" },
        { name: "Bid Optimization Agent", description: "Recommends bid increases/decreases based on efficiency.", status: "idle" },
        { name: "Search Query Waste Agent", description: "Flags campaigns with rising cost and weak conversions.", status: "idle" },
        { name: "Creative Fatigue Agent", description: "Flags CTR decline and recommends creative refresh.", status: "idle" },
        { name: "Anomaly Watch Agent", description: "Detects CPC spikes, CPA spikes, ROAS drops, and spend spikes.", status: "idle" },
        { name: "Executive Summary Agent", description: "Creates a leadership-ready report.", status: "idle" },
        { name: "Data Quality Agent", description: "Checks missing dates, duplicate rows, bad values on upload.", status: "idle" },
        { name: "Scenario Planning Agent", description: "Compares budget scenarios and recommends best allocation.", status: "idle" }
      ]);
    }
    setLoadingAgents(false);
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      setLogs([
        { id: 1, agent_name: "Daily Pacing Agent", status: "success", started_at: "2026-06-08T09:00:00Z", summary: "Pacing check completed. No anomalies flagged." },
        { id: 2, agent_name: "Data Quality Agent", status: "success", started_at: "2026-06-08T08:45:00Z", summary: "Validation checks complete. Ingested 90 campaign performance rows." }
      ]);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchLogs();
  }, []);

  const handleRunAgent = async (agentName: string) => {
    setRunningAgent(agentName);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/agents/run/${agentName}`, {
        method: "POST"
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      // Mock run
      setTimeout(() => {
        setLogs((prev) => [
          {
            id: Date.now(),
            agent_name: agentName,
            status: "success",
            started_at: new Date().toISOString(),
            summary: `Ran agent '${agentName}' successfully in demo mode.`
          },
          ...prev
        ]);
        setRunningAgent(null);
      }, 1200);
      return;
    }
    setRunningAgent(null);
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Settings & Automations</h1>
          <p className="text-sm text-[#86868b] mt-1">Configure target ROI benchmarks and inspect background automation agents.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Settings panel */}
          <div className="space-y-8 lg:col-span-1">
            <div className="apple-card p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-4 flex items-center">
                <SettingsIcon className="w-4 h-4 mr-2" />
                <span>Optimization Targets</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">Target ROAS (x)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetRoas}
                    onChange={(e) => setTargetRoas(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86868b] mb-1.5">Target CPA ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={targetCpa}
                    onChange={(e) => setTargetCpa(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#d2d2d7] apple-transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Agents control center */}
          <div className="lg:col-span-2 space-y-8">
            <div className="apple-card p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-6 flex items-center">
                <Cpu className="w-4.5 h-4.5 mr-2 text-apple-blue" />
                <span>In-App Automation Agents</span>
              </h3>

              <div className="space-y-4">
                {loadingAgents ? (
                  <div className="text-sm text-[#86868b]">Loading agents registry...</div>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.name} className="p-4 bg-[#f5f5f7] rounded-2xl flex items-center justify-between border border-[#e8e8ed]/60">
                      <div>
                        <h4 className="text-xs font-bold text-[#1d1d1f]">{agent.name}</h4>
                        <p className="text-[11px] text-[#6e6e73] mt-1">{agent.description}</p>
                      </div>
                      <button
                        onClick={() => handleRunAgent(agent.name)}
                        disabled={runningAgent !== null}
                        className="px-3 py-1.5 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-[10px] font-semibold rounded-xl flex items-center space-x-1 apple-transition disabled:opacity-40"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{runningAgent === agent.name ? "Running..." : "Run Agent"}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit log runs */}
            <div className="apple-card p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f] mb-4">Automation Audit Logs</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-[#f5f5f7]/60 rounded-xl text-xs space-y-1.5 border border-[#e8e8ed]/30">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1d1d1f]">{log.agent_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[8px] font-bold uppercase">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[#6e6e73]">{log.summary}</p>
                    <p className="text-[9px] text-[#86868b]">{new Date(log.started_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
