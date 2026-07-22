import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Clock,
  ShieldAlert,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Copy,
  Check,
  Sliders,
  Bell,
  AlertCircle,
  Database,
  Cpu
} from "lucide-react";
import { api } from "../lib/api";
import { DashboardStats, Run, GuardrailEvent } from "../types";

// Import Monitoring Sub-tabs & Mock Data Generator
import { generateMonitoringData } from "./monitoring/mockData";
import TracesTab from "./monitoring/TracesTab";
import LLMCallsTab from "./monitoring/LLMCallsTab";
import CostTokensTab from "./monitoring/CostTokensTab";
import ToolsTab from "./monitoring/ToolsTab";
import RunTypesTab from "./monitoring/RunTypesTab";
import FeedbackScoresTab from "./monitoring/FeedbackScoresTab";

interface DashboardViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({
  period,
  customFrom,
  customTo,
  selectedSources,
  onNavigateToTab,
}: DashboardViewProps) {
  // Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<"monitoring" | "dashboards" | "alerts">("monitoring");
  const [activeSubTab, setActiveSubTab] = useState<string>("traces");
  
  // Environment Dropdown
  const [selectedEnv, setSelectedEnv] = useState<string>("default");
  const [isEnvOpen, setIsEnvOpen] = useState<boolean>(false);

  // Original overview dashboard state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [recentEvents, setRecentEvents] = useState<GuardrailEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDashboardStats({ from: period, source: selectedSources.join(",") }),
      api.getRuns({ page_size: 5 }),
      api.getGuardrailEvents({ page_size: 5 }),
    ])
      .then(([statsData, runsResponse, eventsResponse]) => {
        setStats(statsData);
        setRecentRuns(runsResponse.runs);
        setRecentEvents(eventsResponse.events);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar dados do dashboard:", err);
        setLoading(false);
      });
  }, [period, selectedSources]);

  // Generate Monitoring Data for Recharts
  const monitoringData = generateMonitoringData(period, selectedSources);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const secondaryTabs = [
    { id: "traces", label: "Traces" },
    { id: "llm-calls", label: "LLM Calls" },
    { id: "cost-tokens", label: "Cost & Tokens" },
    { id: "tools", label: "Tools" },
    { id: "run-types", label: "Run Types" },
    { id: "feedback-scores", label: "Feedback Scores" },
  ];

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-[#1a1a1a]/20 border-t-[#1a1a1a] rounded-full animate-spin"></div>
        <p className="text-xs text-[#6e6d68] font-medium">Carregando dados do monitoramento...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#faf9f6] p-6 space-y-6 text-[#1a1a1a]">
      
      {/* 1. Primary Header & Tabs (LangSmith style) */}
      <div className="flex flex-col gap-4 border-b border-[#e6e4df] pb-3">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveMainTab("monitoring")}
            className={`text-xs font-bold tracking-wider uppercase transition-colors relative pb-3 -mb-[13px] ${
              activeMainTab === "monitoring"
                ? "text-[#1a1a1a] border-b-2 border-[#1a1a1a]"
                : "text-[#6e6d68] hover:text-[#1a1a1a]"
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => setActiveMainTab("dashboards")}
            className={`text-xs font-bold tracking-wider uppercase transition-colors relative pb-3 -mb-[13px] ${
              activeMainTab === "dashboards"
                ? "text-[#1a1a1a] border-b-2 border-[#1a1a1a]"
                : "text-[#6e6d68] hover:text-[#1a1a1a]"
            }`}
          >
            Dashboards
          </button>
          <button
            onClick={() => setActiveMainTab("alerts")}
            className={`text-xs font-bold tracking-wider uppercase transition-colors relative pb-3 -mb-[13px] ${
              activeMainTab === "alerts"
                ? "text-[#1a1a1a] border-b-2 border-[#1a1a1a]"
                : "text-[#6e6d68] hover:text-[#1a1a1a]"
            }`}
          >
            Alerts
          </button>
        </div>
      </div>

      {/* ==================== MONITORING MAIN TAB ==================== */}
      {activeMainTab === "monitoring" && (
        <div className="space-y-6">
          {/* Sub-header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-[#e6e4df]">
            {/* Dropdown Environment Selector */}
            <div className="relative">
              <button
                onClick={() => setIsEnvOpen(!isEnvOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffff] border border-[#e6e4df] rounded-md text-xs font-mono text-[#1a1a1a] hover:bg-[#f5f4f0] transition-colors shadow-xs"
              >
                <Sliders size={12} className="text-[#6e6d68]" />
                <span>{selectedEnv}</span>
                <span className="text-[10px] text-[#6e6d68]">▼</span>
              </button>
              {isEnvOpen && (
                <div className="absolute left-0 mt-1 w-36 rounded-md border border-[#e6e4df] bg-[#ffffff] shadow-lg z-50 p-1 space-y-0.5">
                  {["default", "production", "staging", "development"].map((env) => (
                    <button
                      key={env}
                      onClick={() => {
                        setSelectedEnv(env);
                        setIsEnvOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-2 py-1.5 rounded text-[11px] hover:bg-[#f5f4f0] text-left text-[#1a1a1a] transition-colors font-mono"
                    >
                      <span>{env}</span>
                      {selectedEnv === env && <Check size={10} className="text-emerald-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Secondary Tabs */}
            <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 border border-[#e6e4df] rounded-lg overflow-x-auto scrollbar-none">
              {secondaryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap ${
                    activeSubTab === tab.id
                      ? "bg-[#1a1a1a] text-white shadow-xs"
                      : "text-[#6e6d68] hover:text-[#1a1a1a]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Subtab Panel Content */}
          {activeSubTab === "traces" && <TracesTab chartData={monitoringData} />}
          {activeSubTab === "llm-calls" && <LLMCallsTab chartData={monitoringData} />}
          {activeSubTab === "cost-tokens" && <CostTokensTab chartData={monitoringData} />}
          {activeSubTab === "tools" && <ToolsTab chartData={monitoringData} />}
          {activeSubTab === "run-types" && <RunTypesTab chartData={monitoringData} />}
          {activeSubTab === "feedback-scores" && <FeedbackScoresTab onNavigateToTab={onNavigateToTab} />}
        </div>
      )}

      {/* ==================== DASHBOARDS MAIN TAB ==================== */}
      {activeMainTab === "dashboards" && stats && (
        <div className="space-y-6">
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-[#6e6d68] uppercase tracking-wider">Total Runs</span>
              <div className="text-lg font-bold text-[#1a1a1a]">{stats.totalRuns.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-[#6e6d68] uppercase tracking-wider">Custo Total</span>
              <div className="text-lg font-bold text-[#1a1a1a]">${stats.totalCost.toFixed(4)}</div>
            </div>
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-[#6e6d68] uppercase tracking-wider">Latência Média</span>
              <div className="text-lg font-bold text-[#1a1a1a]">{stats.avgLatencyMs.toFixed(0)}ms</div>
            </div>
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-[#6e6d68] uppercase tracking-wider">Erros</span>
              <div className="text-lg font-bold text-red-600">{stats.totalErrors}</div>
            </div>
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-[#6e6d68] uppercase tracking-wider">Bloqueios</span>
              <div className="text-lg font-bold text-rose-600">{stats.totalBlocked}</div>
            </div>
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-[#6e6d68] uppercase tracking-wider">Flagged</span>
              <div className="text-lg font-bold text-amber-600">{stats.totalFlagged}</div>
            </div>
          </div>

          {/* Original KPI Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traces vs Success */}
            <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
              <div>
                <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Taxa de Sucesso de Execuções</h3>
                <p className="text-[11px] text-[#6e6d68]">Histórico detalhado de runs completadas com sucesso vs erros</p>
              </div>
              <TracesTab chartData={monitoringData} />
            </div>

            {/* Tokens vs Cost */}
            <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-4">
              <div>
                <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Análise de Custo &amp; Invocação</h3>
                <p className="text-[11px] text-[#6e6d68]">Insumos de computação agregados ao longo do tempo</p>
              </div>
              <CostTokensTab chartData={monitoringData} />
            </div>
          </div>

          {/* Recent Runs Table */}
          <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6e4df] bg-[#f5f4f0] flex items-center justify-between">
              <div>
                <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Últimas Execuções</h3>
                <p className="text-[11px] text-[#6e6d68]">Monitore as transações e execuções de RAG em tempo real</p>
              </div>
              <button
                onClick={() => onNavigateToTab("runs")}
                className="text-[11px] font-semibold text-[#1a1a1a] hover:underline flex items-center gap-1 hover:translate-x-0.5 transition-all"
              >
                <span>Ver todos os Runs</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e6e4df] bg-[#f5f4f0] text-[#6e6d68] font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-5">ID / Nome</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Latência</th>
                    <th className="py-3 px-5">Tokens (E/S)</th>
                    <th className="py-3 px-5 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e4df]">
                  {recentRuns.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => onNavigateToTab("runs")}
                      className="hover:bg-[#f5f4f0]/60 cursor-pointer text-[#1a1a1a] transition-colors"
                    >
                      <td className="py-3 px-5 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#1a1a1a]">{run.name}</span>
                          <span className="px-1.5 bg-[#f5f4f0] text-[#575652] text-[9px] font-mono rounded border border-[#e6e4df]">
                            {run.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#6e6d68] font-mono">
                          <span>{run.id.slice(0, 8)}...</span>
                          <button
                            onClick={(e) => handleCopyId(run.id, e)}
                            className="text-[#8e8d87] hover:text-[#1a1a1a] focus:outline-none"
                          >
                            {copiedId === run.id ? <Check size={10} className="text-emerald-700" /> : <Copy size={10} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            run.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${run.status === "SUCCESS" ? "bg-emerald-600" : "bg-red-600"}`} />
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-[#575652]">{run.latency_ms}ms</td>
                      <td className="py-3 px-5 font-mono text-[#575652]">
                        {run.prompt_tokens}/{run.completion_tokens}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-[#6e6d68] text-[10px]">
                        {new Date(run.created_at).toLocaleTimeString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ALERTS MAIN TAB ==================== */}
      {activeMainTab === "alerts" && (
        <div className="space-y-6">
          {/* Active Alerts Alert banner */}
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 flex gap-3 text-red-900">
            <AlertOctagon className="text-red-600 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <h4 className="font-serif italic text-xs font-bold text-red-900">Violações de Segurança Críticas Ativas</h4>
              <p className="text-[11px] text-red-800 leading-relaxed">
                Detectamos vazamento de informações confidenciais (PII) e injeções de prompt ativas nas últimas 24 horas. Certifique-se de auditar as regras do seu Guardrail.
              </p>
            </div>
          </div>

          {/* Quick Alert Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif italic text-xs font-bold text-[#1a1a1a]">PII Leakage Policy</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded font-semibold uppercase">Block</span>
              </div>
              <p className="text-[10px] text-[#6e6d68] leading-relaxed">Filtra CPFs, Cartões de Crédito e e-mails confidenciais em todas as respostas geradas.</p>
              <div className="flex items-center justify-between text-[10px] text-[#6e6d68]">
                <span>Disparos (24h)</span>
                <span className="font-semibold text-red-700 font-mono">14 vezes</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif italic text-xs font-bold text-[#1a1a1a]">Prompt Injection</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded font-semibold uppercase">Block</span>
              </div>
              <p className="text-[10px] text-[#6e6d68] leading-relaxed">Identifica comandos suspeitos e tentativas de bypass nas diretrizes primárias de prompt.</p>
              <div className="flex items-center justify-between text-[10px] text-[#6e6d68]">
                <span>Disparos (24h)</span>
                <span className="font-semibold text-red-700 font-mono">8 vezes</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif italic text-xs font-bold text-[#1a1a1a]">Toxic Content</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold uppercase">Flag Only</span>
              </div>
              <p className="text-[10px] text-[#6e6d68] leading-relaxed">Monitora linguagem ofensiva, agressiva ou inadequada tanto em inputs quanto em outputs.</p>
              <div className="flex items-center justify-between text-[10px] text-[#6e6d68]">
                <span>Disparos (24h)</span>
                <span className="font-semibold text-amber-700 font-mono">3 vezes</span>
              </div>
            </div>
          </div>

          {/* Guardrail Violations List */}
          <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6e4df] bg-[#f5f4f0] flex items-center justify-between">
              <div>
                <h3 className="font-serif italic text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Últimos Eventos de Alerta</h3>
                <p className="text-[11px] text-[#6e6d68]">Ações tomadas pelas regras de Guardrail ativas</p>
              </div>
              <button
                onClick={() => onNavigateToTab("guardrails-events")}
                className="text-[11px] font-semibold text-[#1a1a1a] hover:underline flex items-center gap-1 hover:translate-x-0.5 transition-all"
              >
                <span>Ver todos os Eventos</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e6e4df] bg-[#f5f4f0] text-[#6e6d68] font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-5">Regra Violada</th>
                    <th className="py-3 px-5">Ação Aplicada</th>
                    <th className="py-3 px-5">Score da Métrica</th>
                    <th className="py-3 px-5 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e4df]">
                  {recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-[#f5f4f0]/60 text-[#1a1a1a] transition-colors cursor-pointer"
                      onClick={() => onNavigateToTab("guardrails-events")}
                    >
                      <td className="py-3 px-5">
                        <div className="font-semibold text-[#1a1a1a]">{event.rule_name}</div>
                        <div className="text-[10px] text-[#6e6d68] font-mono">{event.rule_type}</div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            event.action === "BLOCK"
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${event.action === "BLOCK" ? "bg-red-600" : "bg-amber-600"}`} />
                          {event.action}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-[#575652]">
                        {event.score?.toFixed(2) ?? "1.00"} (Limiar: {event.threshold?.toFixed(2) ?? "0.80"})
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-[#6e6d68] text-[10px]">
                        {new Date(event.created_at).toLocaleTimeString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
