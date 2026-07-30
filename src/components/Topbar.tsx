import React, { useState, useRef, useEffect } from "react";
import { Calendar, Layers, ChevronDown, Check } from "lucide-react";

interface TopbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  period: string;
  setPeriod: (p: string) => void;
  customFrom: string;
  setCustomFrom: (d: string) => void;
  customTo: string;
  setCustomTo: (d: string) => void;
  selectedSources: string[];
  setSelectedSources: (sources: string[]) => void;
}

const sourceOptions = [
  { id: "proxy", label: "proxy", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "uRag-go", label: "uRag-go", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "uRag-agent-go", label: "uRag-agent-go", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "uRag-workflow-go", label: "uRag-workflow-go", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "uRag-gateway-go", label: "uRag-gateway-go", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
];

export default function Topbar({
  currentTab,
  setCurrentTab,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  selectedSources,
  setSelectedSources,
}: TopbarProps) {
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSourceToggle = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter((s) => s !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };

  const handleAllSourcesToggle = () => {
    if (selectedSources.length === sourceOptions.length) {
      setSelectedSources([]);
    } else {
      setSelectedSources(sourceOptions.map((s) => s.id));
    }
  };

  const isAllSourcesSelected = selectedSources.length === sourceOptions.length || selectedSources.length === 0;

  // Normalized tab identifier to support run/session details highlight beautifully
  const getBaseTab = () => {
    if (currentTab.startsWith("run-detail-")) return "runs";
    if (currentTab.startsWith("session-detail-")) return "sessions";
    return currentTab;
  };

  const activeBaseTab = getBaseTab();

  const tabs = [
    { id: "dashboard", label: "Monitoramento" },
    { id: "runs", label: "Runs" },
    { id: "sessions", label: "Sessions" },
    { id: "guardrails-rules", label: "Guardrail Rules" },
    { id: "guardrails-events", label: "Guardrail Events" },
    { id: "evals-configs", label: "Eval Configs" },
    { id: "evals-scores", label: "Eval Scores" },
    { id: "usage", label: "Consumo" },
    { id: "projects", label: "Projetos & Keys" },
  ];

  return (
    <header className="flex flex-col bg-[#F4F1EE] border-b border-[#D3D1CE] shrink-0 select-none">
      {/* Top Row: Breadcrumb, Project Name & Filters */}
      <div className="flex flex-row items-center justify-between px-6 pt-1 pb-0.5">
        {/* Breadcrumb & Project Label */}
        <div className="flex flex-col">
          <div className="text-[10px] text-[#71706F] font-mono tracking-wider uppercase">
            {currentTab === "dashboard" ? "Personal / Monitoring" : "Personal / Tracing / uRag"}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-serif italic text-base font-semibold text-[#1A1A1A] tracking-tight">
              uRag Guard
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#EBE7E2] text-[#575652] border border-[#D3D1CE] font-mono">
              prod-us-east
            </span>
          </div>
        </div>

        {/* Right Aligned Global Filters with High Density */}
        <div className="flex items-center gap-2">
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#D3D1CE] rounded px-2 py-1 text-xs text-[#1A1A1A] shadow-xs">
            <Calendar size={12} className="text-[#71706F]" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent focus:outline-none text-[#1A1A1A] cursor-pointer pr-1 text-[11px] font-medium"
            >
              <option value="24h" className="bg-[#FAF8F5] text-[#1A1A1A]">Últimas 24h</option>
              <option value="7d" className="bg-[#FAF8F5] text-[#1A1A1A]">Últimos 7 dias</option>
              <option value="30d" className="bg-[#FAF8F5] text-[#1A1A1A]">Últimos 30 dias</option>
              <option value="custom" className="bg-[#FAF8F5] text-[#1A1A1A]">Personalizado</option>
            </select>
          </div>

          {/* Custom Date Picker */}
          {period === "custom" && (
            <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#D3D1CE] rounded px-1.5 py-0.5 text-[10px] shadow-xs">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-[#1A1A1A] focus:outline-none border-none py-0.5 font-mono"
              />
              <span className="text-[#71706F] text-[9px]">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-[#1A1A1A] focus:outline-none border-none py-0.5 font-mono"
              />
            </div>
          )}

          {/* Source Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
              className="flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-[#EBE7E2] border border-[#D3D1CE] rounded px-2.5 py-1 text-xs text-[#1A1A1A] transition-colors shadow-xs"
            >
              <Layers size={12} className="text-[#71706F]" />
              <span className="text-[#1A1A1A] text-[11px] font-medium truncate max-w-[120px]">
                Fonte: {isAllSourcesSelected ? "Todas" : selectedSources.join(", ")}
              </span>
              <ChevronDown size={10} className="text-[#71706F] shrink-0" />
            </button>

            {isSourceDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded border border-[#D3D1CE] bg-[#FAF8F5] shadow-lg z-50 p-1 space-y-0.5">
                <button
                  onClick={handleAllSourcesToggle}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded text-[11px] hover:bg-[#EBE7E2] text-left text-[#1A1A1A] font-medium"
                >
                  <span>Todas as fontes</span>
                  {isAllSourcesSelected && <Check size={10} className="text-emerald-700 shrink-0" />}
                </button>
                <div className="h-px bg-[#e6e4df] my-1" />
                {sourceOptions.map((opt) => {
                  const checked = selectedSources.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSourceToggle(opt.id)}
                      className="flex items-center justify-between w-full px-2 py-1 rounded text-[11px] hover:bg-[#EBE7E2] text-left text-[#1A1A1A] transition-colors"
                    >
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#EBE7E2] text-[#1A1A1A] border border-[#D3D1CE]">
                        {opt.label}
                      </span>
                      {checked && !isAllSourcesSelected && (
                        <Check size={10} className="text-emerald-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Project Navigation Tabs */}
      <div className="flex items-center px-6 border-t border-[#D3D1CE] min-h-[28px]">
        <div className="flex gap-4 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const active = activeBaseTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`py-1 text-[11px] uppercase tracking-wider font-mono border-b-2 transition-all duration-150 ${
                  active
                    ? "border-[#1A1A1A] text-[#1A1A1A] font-semibold"
                    : "border-transparent text-[#71706F] hover:text-[#1A1A1A]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
