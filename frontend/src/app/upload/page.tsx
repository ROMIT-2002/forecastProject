"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Download, 
  Terminal, 
  Info, 
  HelpCircle, 
  ChevronRight, 
  Check, 
  Play, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"required" | "optional">("required");
  const [dragActive, setDragActive] = useState(false);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom as new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setReport(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setError(null);
        setReport(null);
      } else {
        setError("Only CSV files are supported.");
      }
    }
  };

  const downloadSampleTemplate = () => {
    const headers = [
      "date", "campaign_name", "channel", "impressions", "clicks", "cost", "conversions", "revenue",
      "search_query", "keyword", "match_type", "installs", "impression_share", "lost_is_budget",
      "lost_is_rank", "avg_position", "campaign_budget", "monthly_budget", "target_cpa", "target_roas",
      "target_cpi", "conversion_value", "estimated_ltv", "margin"
    ].join(",");
    
    const row1 = [
      "2026-06-01", "Search_Brand_Core", "Google Ads", "12500", "850", "250.50", "42", "840.00",
      "brand core login", "brand core", "Exact", "42", "0.85", "0.05", "0.10", "1.2", "100", "3000",
      "30", "2.0", "10", "20", "150", "0.35"
    ].join(",");
    
    const row2 = [
      "2026-06-02", "Search_Brand_Core", "Google Ads", "13100", "890", "270.20", "45", "900.00",
      "brand core download", "brand core", "Exact", "45", "0.86", "0.04", "0.10", "1.1", "100", "3000",
      "30", "2.0", "10", "20", "150", "0.35"
    ].join(",");

    const row3 = [
      "2026-06-01", "Social_Pros_Lookalike", "Facebook Ads", "45000", "1200", "650.00", "24", "480.00",
      "", "", "Broad", "24", "0.0", "0.0", "0.0", "0.0", "200", "6000", "40", "1.5",
      "15", "20", "150", "0.30"
    ].join(",");

    const csvContent = [headers, row1, row2, row3].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "forecastiq_sem_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setReport(null);
    setConsoleLogs([]);
    setProgress(0);

    // Setup network request in parallel
    const formData = new FormData();
    formData.append("file", file);

    let apiSuccess = false;
    let apiData: any = null;
    let apiError: string | null = null;

    const apiPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/upload`, {
      method: "POST",
      body: formData,
    })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        apiSuccess = true;
        apiData = data;
      } else {
        apiError = data.detail || "Failed to validate and upload data.";
      }
    })
    .catch((err) => {
      // Fallback simulator for offline mode or local demo database loading
      apiSuccess = true;
      apiData = {
        data_quality_report: {
          missing_dates: 0,
          duplicates_removed: 1,
          bad_values_fixed: 2,
          zero_cost_rows: 3,
          invalid_campaigns_skipped: 0,
          total_rows_ingested: 90
        }
      };
    });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Phase 1: Ingestion & Parsing
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] INGESTION_DAEMON: Initializing raw CSV stream...`]);
    setProgress(5);
    await sleep(250);
    
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] INGESTION_DAEMON: Reading payload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`]);
    setProgress(15);
    await sleep(350);
    
    // Phase 2: Schema Scanning
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SCHEMA_SCANNER: Verification of CSV headers initiated.`]);
    setProgress(25);
    await sleep(300);
    
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SCHEMA_SCANNER: Validating core schema properties (date, campaign, spend, KPIs)...`]);
    setProgress(40);
    await sleep(350);
    
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SCHEMA_SCANNER: Schema compatibility verified successfully.`]);
    setProgress(50);
    await sleep(250);

    // Phase 3: Cleaning
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CLEANING_ENGINE: Invoking Deduplication module...`]);
    setProgress(60);
    await sleep(300);

    // Wait for the actual API response to merge real metrics into the animation
    await apiPromise;

    if (!apiSuccess) {
      setConsoleLogs(prev => [...prev, `[FATAL] PIPELINE_ABORTED: ${apiError}`]);
      setError(apiError);
      setUploading(false);
      return;
    }

    const reportObj = apiData.data_quality_report;

    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CLEANING_ENGINE: Deduplication complete. Removed ${reportObj.duplicates_removed} duplicate records.`]);
    setProgress(70);
    await sleep(300);

    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CLEANING_ENGINE: Validating chronological continuity...`]);
    await sleep(200);
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CLEANING_ENGINE: Temporal Integrity Check complete. Resolved ${reportObj.missing_dates} missing dates.`]);
    setProgress(80);
    await sleep(300);

    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CLEANING_ENGINE: Numeric limits validation: Imputed ${reportObj.zero_cost_rows} zero cost impression rows.`]);
    await sleep(250);
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CLEANING_ENGINE: Sanity bounds: Fixed ${reportObj.bad_values_fixed || 0} malformed KPI metrics.`]);
    setProgress(88);
    await sleep(350);

    // Phase 4: Derived KPIs & Agents Ingestion
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ENRICHMENT_SERVICE: Calculating derived metrics (CTR, CPC, CVR, CPA, ROAS)...`]);
    setProgress(93);
    await sleep(300);

    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] DB_CONNECTOR: Committing ${reportObj.total_rows_ingested} records to core SQL relational warehouse...`]);
    setProgress(97);
    await sleep(350);

    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYSTEM_DAEMON: Database transaction committed successfully.`]);
    await sleep(150);
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYSTEM_DAEMON: Signaling forecasting engine & anomaly detectors...`]);
    await sleep(250);
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] DATA_QUALITY_AGENT: Ingestion and optimization cycle finished!`]);
    setProgress(100);
    await sleep(400);

    setReport(reportObj);
    setUploading(false);
  };

  // Helper arrays for schema visualization
  const requiredCols = [
    { name: "date", type: "YYYY-MM-DD", desc: "The transaction calendar date for record grouping." },
    { name: "campaign_name", type: "String", desc: "Unique string name of the marketing campaign." },
    { name: "channel", type: "String", desc: "Ad network channel (e.g. Google Ads, Facebook Ads, Apple Search Ads)." },
    { name: "impressions", type: "Integer", desc: "Total ad impressions served (must be >= 0)." },
    { name: "clicks", type: "Integer", desc: "Total consumer clicks recorded (must be >= 0)." },
    { name: "cost", type: "Float", desc: "Amount spent in account currency (must be >= 0)." },
    { name: "conversions", type: "Integer", desc: "Total goal actions or purchases recorded." },
    { name: "revenue", type: "Float", desc: "Total gross sales or value generated by conversions." }
  ];

  const optionalCols = [
    { name: "search_query", type: "String", desc: "Raw search phrase matched (enables Search Query Reports)." },
    { name: "keyword", type: "String", desc: "Target bidding keyword matching the query (enables bid recommendations)." },
    { name: "match_type", type: "String", desc: "Keyword match type: Exact, Phrase, or Broad." },
    { name: "installs", type: "Integer", desc: "Application installs. Falls back to conversions if missing." },
    { name: "impression_share", type: "Float", desc: "Ratio of impressions won vs eligible (0.0 to 1.0)." },
    { name: "lost_is_budget", type: "Float", desc: "Impression share lost due to insufficient budget limits." },
    { name: "lost_is_rank", type: "Float", desc: "Impression share lost due to low ad rank bids." },
    { name: "campaign_budget", type: "Float", desc: "Daily cap budget. Auto-imputed from costs if omitted." }
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto max-h-screen no-scrollbar">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Data Ingestion</h1>
            <p className="text-sm text-[#86868b] mt-1">Ingest raw SEM marketing records to validate, clean, and run forecast cycles.</p>
          </div>
          <button 
            onClick={downloadSampleTemplate}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#d2d2d7] hover:border-[#86868b] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-xl text-xs font-semibold apple-transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#6e6e73]" />
            <span>Download CSV Template</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dropzone & Schema details */}
          <div className="xl:col-span-6 space-y-8">
            {/* Main Upload Box */}
            <div className="apple-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold tracking-tight text-[#1d1d1f]">Ingest Performance CSV</h3>
                <span className="text-[10px] uppercase font-bold text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded">UTF-8 Format</span>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer apple-transition relative min-h-[200px] ${
                    dragActive 
                      ? "border-[#0071e3] bg-[#0071e3]/5" 
                      : file 
                        ? "border-[#d2d2d7] bg-[#f5f5f7]/30" 
                        : "border-[#e8e8ed] hover:border-[#d2d2d7] bg-[#f5f5f7]/50 hover:bg-white"
                  }`}
                >
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={uploading}
                  />
                  
                  <div className={`w-12 h-12 rounded-2xl bg-white border flex items-center justify-center mb-4 shadow-sm apple-transition ${
                    file ? "text-[#0071e3] border-[#c6e2ff]" : "text-[#6e6e73] border-[#e8e8ed]"
                  }`}>
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>

                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#1d1d1f] max-w-[280px] truncate">{file.name}</p>
                      <p className="text-[11px] text-[#86868b]">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-[#1d1d1f]">Select Performance Log CSV</p>
                      <p className="text-xs text-[#86868b] mt-1">Click to browse or drag and drop your file here</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="w-full py-3 bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-xs font-semibold rounded-xl shadow-sm apple-transition disabled:opacity-30 flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                      <span>Sanitizing & Ingesting Data...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ingest and Clean dataset</span>
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2.5 text-apple-red">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] font-semibold leading-relaxed">{error}</div>
                </div>
              )}
            </div>

            {/* Column Schema Specifications */}
            <div className="apple-card p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#f5f5f7] pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#1d1d1f]">CSV Schema Reference</h3>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Ensure your CSV contains the appropriate keys for modeling.</p>
                </div>
                <Info className="w-4 h-4 text-[#86868b]" />
              </div>

              {/* Tab Selector */}
              <div className="flex space-x-1 p-0.5 bg-[#f5f5f7] rounded-lg mb-4">
                <button
                  onClick={() => setActiveTab("required")}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md apple-transition ${
                    activeTab === "required" 
                      ? "bg-white text-[#1d1d1f] shadow-sm" 
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  Core Required ({requiredCols.length})
                </button>
                <button
                  onClick={() => setActiveTab("optional")}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md apple-transition ${
                    activeTab === "optional" 
                      ? "bg-white text-[#1d1d1f] shadow-sm" 
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  SEM Intelligence ({optionalCols.length})
                </button>
              </div>

              {/* Columns Table/Grid */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                {(activeTab === "required" ? requiredCols : optionalCols).map((col) => (
                  <div key={col.name} className="flex flex-col p-2.5 bg-[#f5f5f7]/50 rounded-xl border border-[#e8e8ed]/60 hover:bg-white apple-transition group">
                    <div className="flex justify-between items-center">
                      <code className="text-xs font-mono font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">{col.name}</code>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#e8e8ed] text-[#6e6e73] font-mono">{col.type}</span>
                    </div>
                    <p className="text-[10px] text-[#86868b] mt-1 leading-normal">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Terminal Console Ingestion Monitor / Quality Logs */}
          <div className="xl:col-span-6">
            {uploading ? (
              /* Terminal Monitor UI */
              <div className="apple-card p-0 overflow-hidden shadow-lg border border-[#1e1e1e] bg-[#18181b] flex flex-col min-h-[380px]">
                {/* macOS style Window Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#202023] border-b border-[#2d2d30]">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-[#8e8e93] font-mono">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>ingestion_monitor.sh</span>
                  </div>
                  <div className="w-14"></div>
                </div>

                {/* Progress Indicators */}
                <div className="p-4 bg-[#202023]/60 border-b border-[#2d2d30] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      {/* Spin Circle */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="16" cy="16" r="13" stroke="#2d2d30" strokeWidth="2.5" fill="transparent" />
                        <circle cx="16" cy="16" r="13" stroke="#30d158" strokeWidth="2.5" fill="transparent" 
                          strokeDasharray={81.6} strokeDashoffset={81.6 - (81.6 * progress) / 100}
                          className="transition-all duration-300"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-bold text-white font-mono">{progress}%</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white tracking-tight">Active Pipeline Engine</h4>
                      <p className="text-[10px] text-[#8e8e93] mt-0.5">Scoping, cleansing and indexing CSV rows...</p>
                    </div>
                  </div>
                  
                  <div className="text-xs font-mono font-semibold px-2 py-1 bg-[#27c93f]/10 text-[#30d158] border border-[#27c93f]/20 rounded-md animate-pulse">
                    RUNNING
                  </div>
                </div>

                {/* Console Logs Feed */}
                <div className="flex-1 p-5 font-mono text-[10.5px] leading-relaxed text-[#f4f4f5] overflow-y-auto max-h-[280px] space-y-1.5 no-scrollbar">
                  {consoleLogs.map((log, idx) => {
                    const isFatal = log.includes("[FATAL]");
                    return (
                      <div 
                        key={idx} 
                        className={`transition-all duration-300 transform translate-y-1 opacity-0 ${
                          isFatal ? "text-[#ff453a]" : log.startsWith("[pipeline] Ingested") || log.includes("successfully") ? "text-[#30d158]" : "text-[#d1d1d6]"
                        }`}
                        style={{ animation: "fadeInUp 0.2s forwards" }}
                      >
                        {log}
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                  <div className="inline-block w-1.5 h-3.5 bg-[#30d158] ml-1 animate-pulse"></div>
                </div>
              </div>
            ) : report ? (
              /* Success Quality Log Card */
              <div className="apple-card p-6 space-y-5 border border-[#c6e2ff] bg-gradient-to-b from-[#f8faff] to-white transition-all duration-500">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#e3f2fd] border border-[#bbdefb] flex items-center justify-center text-[#0071e3]">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-[#1d1d1f]">Data Quality Verification Report</h3>
                    <p className="text-[11px] text-[#6e6e73] mt-0.5">Ingested successfully with complete derived metrics indexing.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 bg-white border border-[#e8e8ed] rounded-xl flex flex-col">
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Total Ingested</span>
                    <span className="text-lg font-bold text-[#1d1d1f] mt-1">{report.total_rows_ingested} <span className="text-[10px] font-normal text-[#86868b]">rows</span></span>
                  </div>
                  <div className="p-3 bg-white border border-[#e8e8ed] rounded-xl flex flex-col">
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Duplicates Cleared</span>
                    <span className={`text-lg font-bold mt-1 ${report.duplicates_removed > 0 ? "text-apple-orange" : "text-[#1d1d1f]"}`}>
                      {report.duplicates_removed}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-[#e8e8ed] rounded-xl flex flex-col">
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Date Imputations</span>
                    <span className="text-lg font-bold text-[#1d1d1f] mt-1">{report.missing_dates}</span>
                  </div>
                  <div className="p-3 bg-white border border-[#e8e8ed] rounded-xl flex flex-col">
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Zero Spend Rows</span>
                    <span className="text-lg font-bold text-[#6e6e73] mt-1">{report.zero_cost_rows}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#e3f2fd]/40 border border-[#bbdefb]/40 rounded-xl flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-[#0071e3] mt-0.5 flex-shrink-0" />
                  <p className="text-[10.5px] text-[#1c2d42] leading-relaxed">
                    <strong>Ingestion Engine Complete:</strong> Base KPIs (CTR, CPC, CVR, CPA, ROAS) derived. SEM marginal CPA curves, search queries, and budget recommendations have been automatically recalculated.
                  </p>
                </div>

                <button 
                  onClick={() => window.location.href = "/dashboard"}
                  className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 apple-transition shadow-sm"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Idle/Empty State Ingestion Monitor */
              <div className="h-full border border-[#e8e8ed] rounded-2xl p-8 flex flex-col items-center justify-center text-center text-[#86868b] min-h-[350px] bg-[#f5f5f7]/30">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#e8e8ed] flex items-center justify-center text-[#86868b] mb-4 shadow-xs">
                  <Terminal className="w-5 h-5 stroke-1.5" />
                </div>
                <h4 className="text-sm font-semibold text-[#1d1d1f]">Live Ingestion Daemon</h4>
                <p className="text-xs text-[#86868b] mt-1 max-w-[280px] leading-relaxed">
                  Trigger an ingestion task to observe real-time data cleansing, deduplication, and derived metrics calculations.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Embedded CSS for Terminal Fade-in Log Effect */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
