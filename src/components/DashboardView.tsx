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
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-xs text-zinc-500 font-medium">Carregando dados do monitoramento...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 space-y-6">
      
      {/* 1. Primary Header & Tabs (LangSmith style) */}
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveMainTab("monitoring")}
            className={`text-xs font-bold tracking-wider uppercase transition-colors relative pb-3 -mb-[13px] ${
              activeMainTab === "monitoring"
                ? "text-zinc-100 border-b-2 border-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => setActiveMainTab("dashboards")}
            className={`text-xs font-bold tracking-wider uppercase transition-colors relative pb-3 -mb-[13px] ${
              activeMainTab === "dashboards"
                ? "text-zinc-100 border-b-2 border-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Dashboards
          </button>
          <button
            onClick={() => setActiveMainTab("alerts")}
            className={`text-xs font-bold tracking-wider uppercase transition-colors relative pb-3 -mb-[13px] ${
              activeMainTab === "alerts"
                ? "text-zinc-100 border-b-2 border-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-zinc-900/40">
            {/* Dropdown Environment Selector */}
            <div className="relative">
              <button
                onClick={() => setIsEnvOpen(!isEnvOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-900 rounded-[4px] text-xs font-mono text-zinc-300 hover:bg-zinc-900 transition-colors"
              >
                <Sliders size={12} className="text-zinc-500" />
                <span>{selectedEnv}</span>
                <span className="text-[10px] text-zinc-600">▼</span>
              </button>
              {isEnvOpen && (
                <div className="absolute left-0 mt-1 w-36 rounded border border-zinc-900 bg-zinc-950 shadow-xl z-50 p-1 space-y-0.5">
                  {["default", "production", "staging", "development"].map((env) => (
                    <button
                      key={env}
                      onClick={() => {
                        setSelectedEnv(env);
                        setIsEnvOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-2 py-1.5 rounded text-[11px] hover:bg-zinc-900 text-left text-zinc-300 transition-colors font-mono"
                    >
                      <span>{env}</span>
                      {selectedEnv === env && <Check size={10} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Secondary Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-900 rounded-lg overflow-x-auto scrollbar-none">
              {secondaryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-[4px] transition-all duration-150 whitespace-nowrap ${
                    activeSubTab === tab.id
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-300"
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
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Runs</span>
              <div className="text-lg font-bold text-zinc-100">{stats.totalRuns.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Custo Total</span>
              <div className="text-lg font-bold text-zinc-100">${stats.totalCost.toFixed(4)}</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Latência Médiga</span>
              <div className="text-lg font-bold text-zinc-100">{stats.avgLatencyMs.toFixed(0)}ms</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Erros</span>
              <div className="text-lg font-bold text-red-400">{stats.totalErrors}</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Bloqueios</span>
              <div className="text-lg font-bold text-rose-500">{stats.totalBlocked}</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Flagged</span>
              <div className="text-lg font-bold text-amber-500">{stats.totalFlagged}</div>
            </div>
          </div>

          {/* Original KPI Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traces vs Success */}
            <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Taxa de Sucesso de Execuções</h3>
                <p className="text-[11px] text-zinc-500">Histórico detalhado de runs completadas com sucesso vs erros</p>
              </div>
              <TracesTab chartData={monitoringData} />
            </div>

            {/* Tokens vs Cost */}
            <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Análise de Custo & Invocação</h3>
                <p className="text-[11px] text-zinc-500">Insumos de computação agregados ao longo do tempo</p>
              </div>
              <CostTokensTab chartData={monitoringData} />
            </div>
          </div>

          {/* Recent Runs Table */}
          <div className="border border-zinc-900 rounded-lg bg-zinc-950/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-900/60 bg-zinc-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Últimas Execuções</h3>
                <p className="text-[11px] text-zinc-500">Monitore as transações e execuções de RAG em tempo real</p>
              </div>
              <button
                onClick={() => onNavigateToTab("runs")}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:translate-x-0.5 transition-all"
              >
                <span>Ver todos os Runs</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-5">ID / Nome</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Latência</th>
                    <th className="py-3 px-5">Tokens (E/S)</th>
                    <th className="py-3 px-5 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {recentRuns.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => onNavigateToTab("runs")}
                      className="hover:bg-zinc-900/30 cursor-pointer text-zinc-300 transition-colors"
                    >
                      <td className="py-3 px-5 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-100">{run.name}</span>
                          <span className="px-1 bg-zinc-900 text-zinc-500 text-[9px] font-mono rounded">
                            {run.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                          <span>{run.id.slice(0, 8)}...</span>
                          <button
                            onClick={(e) => handleCopyId(run.id, e)}
                            className="text-zinc-600 hover:text-zinc-400 focus:outline-none"
                          >
                            {copiedId === run.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            run.status === "SUCCESS"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/50"
                              : "bg-red-950/60 text-red-400 border border-red-900/50"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${run.status === "SUCCESS" ? "bg-emerald-400" : "bg-red-400"}`} />
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-zinc-400">{run.latency_ms}ms</td>
                      <td className="py-3 px-5 font-mono text-zinc-400">
                        {run.prompt_tokens}/{run.completion_tokens}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-zinc-500 text-[10px]">
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
          <div className="p-4 rounded-lg border border-red-900/40 bg-red-950/20 flex gap-3 text-zinc-200">
            <AlertOctagon className="text-red-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-300">Violações de Segurança Críticas Ativas</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Detectamos vazamento de informações confidenciais (PII) e injeções de prompt ativas nas últimas 24 horas. Certifique-se de auditar as regras do seu Guardrail.
              </p>
            </div>
          </div>

          {/* Quick Alert Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">PII Leakage Policy</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-950/60 text-red-400 border border-red-900/40 rounded font-semibold uppercase">Block</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">Filtra CPFs, Cartões de Crédito e e-mails confidenciais em todas as respostas geradas.</p>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Disparos (24h)</span>
                <span className="font-semibold text-red-400 font-mono">14 vezes</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Prompt Injection</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-950/60 text-red-400 border border-red-900/40 rounded font-semibold uppercase">Block</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">Identifica comandos suspeitos e tentativas de bypass nas diretrizes primárias de prompt.</p>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Disparos (24h)</span>
                <span className="font-semibold text-red-400 font-mono">8 vezes</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Toxic Content</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-950/60 text-amber-400 border border-amber-900/40 rounded font-semibold uppercase">Flag Only</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">Monitora linguagem ofensiva, agressiva ou inadequada tanto em inputs quanto em outputs.</p>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Disparos (24h)</span>
                <span className="font-semibold text-amber-400 font-mono">3 vezes</span>
              </div>
            </div>
          </div>

          {/* Guardrail Violations List */}
          <div className="border border-zinc-900 rounded-lg bg-zinc-950/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-900/60 bg-zinc-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Últimos Eventos de Alerta</h3>
                <p className="text-[11px] text-zinc-500">Ações tomadas pelas regras de Guardrail ativas</p>
              </div>
              <button
                onClick={() => onNavigateToTab("guardrails-events")}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:translate-x-0.5 transition-all"
              >
                <span>Ver todos os Eventos</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-5">Regra Violada</th>
                    <th className="py-3 px-5">Ação Aplicada</th>
                    <th className="py-3 px-5">Score da Métrica</th>
                    <th className="py-3 px-5 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-zinc-900/30 text-zinc-300 transition-colors cursor-pointer"
                      onClick={() => onNavigateToTab("guardrails-events")}
                    >
                      <td className="py-3 px-5">
                        <div className="font-semibold text-zinc-100">{event.rule_name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{event.rule_type}</div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            event.action === "BLOCK"
                              ? "bg-red-950/60 text-red-400 border border-red-900/50"
                              : "bg-amber-950/60 text-amber-400 border border-amber-900/50"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${event.action === "BLOCK" ? "bg-red-400" : "bg-amber-400"}`} />
                          {event.action}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-zinc-400">
                        {event.score?.toFixed(2) ?? "1.00"} (Limiar: {event.threshold?.toFixed(2) ?? "0.80"})
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-zinc-500 text-[10px]">
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
