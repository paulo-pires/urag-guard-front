import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PlayCircle,
  MessageSquare,
  ListFilter,
  AlertTriangle,
  Settings,
  BarChart3,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Default to slim sidebar as requested
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    fetch("/v1/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "online") setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  const navItems = [
    { id: "dashboard", label: "Monitoramento", icon: LayoutDashboard },
    { id: "runs", label: "Runs", icon: PlayCircle },
    { id: "sessions", label: "Sessions", icon: MessageSquare },
    { id: "divider-1", isDivider: true },
    { id: "guardrails-rules", label: "Regras Guardrail", icon: ListFilter },
    { id: "guardrails-events", label: "Eventos Guardrail", icon: AlertTriangle },
    { id: "divider-2", isDivider: true },
    { id: "evals-configs", label: "Configs Evals", icon: Settings },
    { id: "evals-scores", label: "Scores Evals", icon: BarChart3 },
    { id: "divider-3", isDivider: true },
    { id: "usage", label: "Consumo", icon: Cpu },
    { id: "divider-admin", isDivider: true },
    { id: "projects", label: "Projetos & Keys", icon: KeyRound },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
  };

  const isTabActive = (itemId: string) => {
    if (currentTab === itemId) return true;
    if (itemId === "runs" && currentTab.startsWith("run-detail-")) return true;
    if (itemId === "sessions" && currentTab.startsWith("session-detail-")) return true;
    return false;
  };

  return (
    <aside
      className={`flex flex-col h-screen border-r border-[#e6e4df] bg-[#f5f4f0] text-[#1a1a1a] transition-all duration-200 select-none ${
        isExpanded ? "w-52" : "w-14"
      }`}
    >
      {/* Brand Logo / Slim Header */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-[#e6e4df]">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#1a1a1a] text-white border border-[#1a1a1a] shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          {isExpanded && (
            <span className="font-serif italic font-semibold text-sm tracking-tight text-[#1a1a1a] whitespace-nowrap">
              uRag Guard
            </span>
          )}
        </div>
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-[#e8e6e1] text-[#6e6d68] hover:text-[#1a1a1a] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute left-11 z-50 flex items-center justify-center w-4 h-8 rounded-r bg-[#f5f4f0] hover:bg-[#e8e6e1] text-[#6e6d68] hover:text-[#1a1a1a] border-y border-r border-[#e6e4df] opacity-0 hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Flat Navigation List */}
      <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          if (item.isDivider) {
            return (
              <div
                key={item.id}
                className="my-2 border-t border-[#e6e4df] mx-2"
              />
            );
          }

          const active = isTabActive(item.id!);
          const Icon = item.icon!;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id!)}
              className={`flex items-center w-full rounded transition-colors group relative ${
                isExpanded ? "px-2.5 py-1.5 gap-2.5" : "p-2.5 justify-center"
              } ${
                active
                  ? "bg-[#1a1a1a] text-white font-medium"
                  : "text-[#575652] hover:bg-[#e8e6e1] hover:text-[#1a1a1a]"
              }`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {isExpanded && (
                <span className="text-xs truncate">{item.label}</span>
              )}
              
              {/* Minimal Tooltip for Slim Mode */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#1a1a1a] text-white text-[11px] font-normal rounded border border-[#1a1a1a] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Compact Backend Status Footer */}
      <div className="p-2 border-t border-[#e6e4df] text-[10px] text-[#6e6d68] flex items-center justify-center">
        {isExpanded ? (
          <div className="flex items-center justify-between w-full px-1">
            <span className="truncate max-w-[80px] font-serif italic text-[#1a1a1a]">uRag Guard</span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOnline ? "bg-emerald-600" : "bg-rose-600"
                }`}
              />
              <span className={backendOnline ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                {backendOnline ? "online" : "offline"}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              backendOnline ? "bg-emerald-600" : "bg-rose-600"
            }`}
            title={backendOnline ? "API Online" : "API Offline"}
          />
        )}
      </div>
    </aside>
  );
}
