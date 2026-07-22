import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  ShieldAlert,
  Info,
  Clock,
  MessageSquare,
  Network,
  Braces,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
} from "lucide-react";
import { api } from "../lib/api";
import { Run, Span, GuardrailEvent, EvalScore } from "../types";

interface RunDetailViewProps {
  runId: string;
  onNavigateToTab: (tab: string) => void;
  onBack: () => void;
}

export default function RunDetailView({ runId, onNavigateToTab, onBack }: RunDetailViewProps) {
  const [run, setRun] = useState<(Run & { guardrail_events: GuardrailEvent[]; eval_scores: EvalScore[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"prompt" | "spans" | "guardrails" | "evals" | "metadata">("prompt");
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .getRun(runId)
      .then((data) => {
        setRun(data);
        if (data.spans && data.spans.length > 0) {
          setSelectedSpan(data.spans[0]); // Select first span by default
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading run detail:", err);
        setError(true);
        setLoading(false);
      });
  }, [runId]);

  const handleCopyId = () => {
    if (!run) return;
    navigator.clipboard.writeText(run.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="h-40 rounded-xl bg-zinc-900 border border-zinc-800" />
        <div className="h-10 bg-zinc-900 border border-zinc-800 rounded-lg w-full" />
        <div className="h-96 rounded-xl bg-zinc-900 border border-zinc-800" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-zinc-800 rounded-xl bg-zinc-900/50">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h3 className="text-lg font-medium text-zinc-100">Execução não encontrada</h3>
        <p className="text-sm text-zinc-400 mt-1">O ID do run {runId} pode estar incorreto ou indisponível.</p>
        <button
          onClick={onBack}
          className="mt-5 px-4 py-2 text-xs font-medium bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Voltar para a lista
        </button>
      </div>
    );
  }

  // Calculate coordinates for waterfall chart
  const runStartMs = run.timestamp_ms;
  const runTotalDuration = run.latency_ms;

  const getSpanTypeColor = (type: Span["type"]) => {
    switch (type) {
      case "llm_call":
        return "bg-blue-500 border-blue-600 text-blue-400";
      case "tool_call":
        return "bg-purple-500 border-purple-600 text-purple-400";
      case "retrieval":
        return "bg-emerald-500 border-emerald-600 text-emerald-400";
      default:
        return "bg-zinc-500 border-zinc-600 text-zinc-400";
    }
  };

  const getSpanTypeBadge = (type: Span["type"]) => {
    switch (type) {
      case "llm_call":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "tool_call":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "retrieval":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
    }
  };

  const sourceColors: Record<string, string> = {
    proxy: "bg-blue-50 text-blue-800 border-blue-200",
    "uRag-go": "bg-emerald-50 text-emerald-800 border-emerald-200",
    "uRag-agent-go": "bg-purple-50 text-purple-800 border-purple-200",
    "uRag-workflow-go": "bg-amber-50 text-amber-800 border-amber-200",
    "uRag-gateway-go": "bg-[#f5f4f0] text-[#575652] border-[#e6e4df]",
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#1a1a1a] hover:bg-[#f5f4f0] transition-colors bg-[#ffffff] border border-[#e6e4df] px-3 py-1.5 rounded-lg shadow-xs"
      >
        <ChevronLeft size={14} />
        <span>Voltar para Runs</span>
      </button>

      {/* Header Info Card */}
      <div className="p-6 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] border font-mono ${sourceColors[run.source] || "border-[#e6e4df] bg-[#f5f4f0]"}`}>
                {run.source}
              </span>
              <h2 className="text-base font-serif italic font-bold text-[#1a1a1a]">{run.name}</h2>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium font-mono border ${
                  run.status === "ok"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {run.status === "ok" ? "OK" : "Erro"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6e6d68] font-mono">
              <span>ID: {run.id}</span>
              <button
                onClick={handleCopyId}
                className="hover:text-[#1a1a1a] p-0.5 rounded transition-colors"
                title="Copiar ID"
              >
                {copied ? <Check size={10} className="text-emerald-700" /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="px-3 py-1.5 bg-[#f5f4f0] border border-[#e6e4df] rounded-lg">
              <p className="text-[#6e6d68] text-[10px]">Latência</p>
              <p className="font-semibold text-[#1a1a1a] font-mono mt-0.5">{run.latency_ms} ms</p>
            </div>
            <div className="px-3 py-1.5 bg-[#f5f4f0] border border-[#e6e4df] rounded-lg">
              <p className="text-[#6e6d68] text-[10px]">Tokens (E/S)</p>
              <p className="font-semibold text-[#1a1a1a] font-mono mt-0.5">
                {run.tokens_in} / {run.tokens_out}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-[#f5f4f0] border border-[#e6e4df] rounded-lg">
              <p className="text-[#6e6d68] text-[10px]">Custo total</p>
              <p className="font-semibold text-emerald-700 font-mono mt-0.5">${run.cost.toFixed(5)}</p>
            </div>
            {run.session_id && (
              <button
                onClick={() => onNavigateToTab(`session-detail-${run.session_id}`)}
                className="px-3 py-1.5 bg-[#f5f4f0] hover:bg-[#e6e4df] border border-[#e6e4df] rounded-lg text-left text-[#1a1a1a] transition-colors"
              >
                <p className="text-[#6e6d68] text-[10px]">Sessão</p>
                <p className="font-mono mt-0.5 truncate max-w-[80px]">{run.session_id}</p>
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-[#e6e4df]" />

        {/* Metadata grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs text-[#575652]">
          <div>
            <span className="text-[#6e6d68] mr-1.5">Iniciado:</span>
            <span className="text-[#1a1a1a] font-mono">{formatDate(run.timestamp)}</span>
          </div>
          <div>
            <span className="text-[#6e6d68] mr-1.5">Modelo:</span>
            <span className="text-[#1a1a1a] font-mono">{run.model}</span>
          </div>
          <div>
            <span className="text-[#6e6d68] mr-1.5">Provedor:</span>
            <span className="text-[#1a1a1a] font-mono">{run.provider}</span>
          </div>
          <div className="col-span-full flex flex-wrap gap-1.5 pt-1">
            {run.tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-[#f5f4f0] text-[10px] text-[#575652] border border-[#e6e4df]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e6e4df] flex items-center gap-1">
        {[
          { id: "prompt", label: "Prompt / Resposta", icon: MessageSquare },
          { id: "spans", label: "Spans (Timeline)", icon: Network },
          { id: "guardrails", label: "Guardrails", icon: ShieldAlert },
          { id: "evals", label: "Evals", icon: Sparkles },
          { id: "metadata", label: "Metadata", icon: Braces },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all ${
                active
                  ? "border-[#1a1a1a] text-[#1a1a1a] font-semibold bg-[#f5f4f0]"
                  : "border-transparent text-[#6e6d68] hover:text-[#1a1a1a]"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.id === "guardrails" && run.guardrail_events.length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-100 border border-red-200 text-red-800 text-[9px] rounded-full font-bold">
                  {run.guardrail_events.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[300px]">
        {/* 1. Prompt / Answer Tab */}
        {activeTab === "prompt" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input / Prompt */}
            <div className="p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#e6e4df] pb-2.5">
                <span className="text-xs font-semibold text-[#1a1a1a]">Prompt / Input</span>
                <span className="text-[10px] font-mono text-[#6e6d68]">{run.tokens_in} tokens</span>
              </div>
              <div className="text-xs font-mono whitespace-pre-wrap text-[#1a1a1a] leading-relaxed max-h-[400px] overflow-y-auto bg-[#faf9f6] p-3.5 rounded-lg border border-[#e6e4df]">
                {typeof run.input === "string" ? run.input : JSON.stringify(run.input, null, 2)}
              </div>
            </div>

            {/* Output / Response */}
            <div className="p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#e6e4df] pb-2.5">
                <span className="text-xs font-semibold text-[#1a1a1a]">Resposta / Output</span>
                <span className="text-[10px] font-mono text-[#6e6d68]">{run.tokens_out} tokens</span>
              </div>
              <div className="text-xs whitespace-pre-wrap text-[#1a1a1a] leading-relaxed max-h-[400px] overflow-y-auto bg-[#faf9f6] p-3.5 rounded-lg border border-[#e6e4df]">
                {typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2)}
              </div>
            </div>
          </div>
        )}

        {/* 2. Spans timeline (Waterfall Gantt Chart) */}
        {activeTab === "spans" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Waterfall chart panel */}
              <div className="xl:col-span-2 p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#e6e4df] pb-2.5">
                  <span className="text-xs font-semibold text-[#1a1a1a]">Estrutura de Trace (Waterfall)</span>
                  <span className="text-[10px] font-mono text-[#6e6d68]">Duração total: {runTotalDuration} ms</span>
                </div>

                <div className="space-y-1.5">
                  {/* Timeline Ruler */}
                  <div className="flex justify-between text-[9px] font-mono text-[#8e8d87] border-b border-[#e6e4df] pb-1.5 px-2">
                    <span>0 ms</span>
                    <span>{(runTotalDuration * 0.25).toFixed(0)} ms</span>
                    <span>{(runTotalDuration * 0.5).toFixed(0)} ms</span>
                    <span>{(runTotalDuration * 0.75).toFixed(0)} ms</span>
                    <span>{runTotalDuration} ms</span>
                  </div>

                  {/* Span bars */}
                  <div className="space-y-2 pt-2">
                    {run.spans && run.spans.map((span) => {
                      const spanStartMs = new Date(span.start_time).getTime();
                      const relativeOffsetMs = spanStartMs - runStartMs;
                      const offsetPercent = Math.max(0, Math.min(99, (relativeOffsetMs / runTotalDuration) * 100));
                      const widthPercent = Math.max(1, Math.min(100 - offsetPercent, (span.latency_ms / runTotalDuration) * 100));

                      const indentClass = span.parent_span_id ? "pl-5" : "pl-0";
                      const isSelected = selectedSpan?.id === span.id;

                      return (
                        <div
                          key={span.id}
                          onClick={() => setSelectedSpan(span)}
                          className={`flex items-center group cursor-pointer py-1.5 rounded-lg transition-colors ${
                            isSelected ? "bg-[#f5f4f0]" : "hover:bg-[#faf9f6]"
                          }`}
                        >
                          {/* Left label part */}
                          <div className={`w-1/3 text-xs font-medium truncate shrink-0 ${indentClass} pr-2`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${span.type === "llm_call" ? "bg-blue-600" : span.type === "retrieval" ? "bg-emerald-600" : "bg-purple-600"}`} />
                              <span className="truncate text-[#1a1a1a]" title={span.name}>
                                {span.name}
                              </span>
                            </div>
                          </div>

                          {/* Right bar part */}
                          <div className="flex-1 relative h-6 rounded px-1 flex items-center">
                            <div
                              style={{ left: `${offsetPercent}%`, width: `${widthPercent}%` }}
                              className="absolute h-4 rounded border opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              <div className={`w-full h-full rounded-[3px] ${getSpanTypeColor(span.type)} opacity-60`} />
                            </div>
                            <span
                              style={{ left: `${offsetPercent + 0.5}%` }}
                              className="absolute text-[9px] font-mono text-[#575652] whitespace-nowrap pointer-events-none"
                            >
                              {span.latency_ms} ms
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Span Inspector Panel */}
              <div className="p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#e6e4df] pb-2.5">
                  <Info size={14} className="text-[#6e6d68]" />
                  <span className="text-xs font-semibold text-[#1a1a1a]">Inspetor de Span</span>
                </div>

                {selectedSpan ? (
                  <div className="space-y-4 text-xs">
                    {/* Header Details */}
                    <div>
                      <h5 className="font-semibold text-[#1a1a1a] text-sm truncate">{selectedSpan.name}</h5>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${getSpanTypeBadge(selectedSpan.type)}`}>
                          {selectedSpan.type}
                        </span>
                        <span className="text-[#6e6d68] font-mono text-[10px]">{selectedSpan.latency_ms} ms</span>
                      </div>
                    </div>

                    <div className="h-px bg-[#e6e4df]" />

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-[#575652] bg-[#f5f4f0] p-2.5 rounded border border-[#e6e4df]">
                      <div>
                        <p className="text-[#6e6d68]">Início</p>
                        <p className="text-[#1a1a1a] truncate mt-0.5">
                          {new Date(selectedSpan.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#6e6d68]">Fim</p>
                        <p className="text-[#1a1a1a] truncate mt-0.5">
                          {new Date(selectedSpan.end_time).toLocaleTimeString()}
                        </p>
                      </div>
                      {selectedSpan.tokens_in !== undefined && (
                        <div>
                          <p className="text-[#6e6d68]">Tokens E/S</p>
                          <p className="text-[#1a1a1a] mt-0.5">
                            {selectedSpan.tokens_in} / {selectedSpan.tokens_out}
                          </p>
                        </div>
                      )}
                      {selectedSpan.cost !== undefined && (
                        <div>
                          <p className="text-[#6e6d68]">Custo</p>
                          <p className="text-emerald-700 mt-0.5">${selectedSpan.cost.toFixed(5)}</p>
                        </div>
                      )}
                    </div>

                    {/* Inputs & Outputs inside span */}
                    {selectedSpan.input && (
                      <div className="space-y-1.5">
                        <p className="text-[#6e6d68] font-medium">Span Input</p>
                        <pre className="text-[10px] bg-[#faf9f6] p-2.5 rounded border border-[#e6e4df] overflow-x-auto text-[#1a1a1a] max-h-40 leading-relaxed font-mono">
                          {JSON.stringify(selectedSpan.input, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedSpan.output && (
                      <div className="space-y-1.5">
                        <p className="text-[#6e6d68] font-medium">Span Output</p>
                        <pre className="text-[10px] bg-[#faf9f6] p-2.5 rounded border border-[#e6e4df] overflow-x-auto text-[#1a1a1a] max-h-40 leading-relaxed font-mono">
                          {JSON.stringify(selectedSpan.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#6e6d68] py-10 text-center">Selecione um span na timeline para exibir detalhes.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Guardrails Tab */}
        {activeTab === "guardrails" && (
          <div className="space-y-4">
            {run.guardrail_events && run.guardrail_events.length > 0 ? (
              <div className="space-y-4">
                {run.guardrail_events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-3.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className={evt.verdict === "block" ? "text-red-600" : "text-amber-600"} />
                        <h4 className="font-semibold text-[#1a1a1a] text-sm">{evt.rule_name}</h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#f5f4f0] text-[#575652] border border-[#e6e4df]">
                          ID: {evt.rule_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#f5f4f0] text-[#575652] border border-[#e6e4df]">
                          Fase: {evt.stage.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            evt.verdict === "block"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {evt.verdict.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Snippet display */}
                    <div className="bg-[#faf9f6] border border-red-200 p-4 rounded-lg space-y-2 text-xs">
                      <p className="text-[#6e6d68] font-medium">Trecho Violado Detectado</p>
                      <p className="font-mono text-red-700 leading-relaxed bg-red-50 px-2.5 py-1.5 rounded border border-red-200 whitespace-pre-wrap">
                        "{evt.snippet}"
                      </p>
                    </div>

                    {evt.details && (
                      <p className="text-xs text-[#575652] leading-relaxed">
                        <span className="text-[#6e6d68] font-medium block mb-0.5">Diagnóstico Adicional:</span>
                        {evt.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Check size={18} className="text-emerald-700" />
                </div>
                <h4 className="font-medium text-[#1a1a1a] text-sm">Nenhuma violação de Guardrail</h4>
                <p className="text-xs text-[#6e6d68] max-w-xs">
                  Esta execução passou com sucesso em todas as regras ativas de proteção e integridade de conteúdo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. Evals Tab */}
        {activeTab === "evals" && (
          <div className="space-y-4">
            {run.eval_scores && run.eval_scores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {run.eval_scores.map((score) => {
                  const pct = Math.round(score.value * 100);

                  let barColor = "bg-emerald-600";
                  let badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  if (score.verdict === "fail") {
                    barColor = "bg-red-600";
                    badgeClass = "bg-red-50 text-red-800 border-red-200";
                  } else if (score.verdict === "warn") {
                    barColor = "bg-amber-600";
                    badgeClass = "bg-amber-50 text-amber-800 border-amber-200";
                  }

                  return (
                    <div
                      key={score.id}
                      className="p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1a1a1a] capitalize">
                          {score.metric.replace("_", " ")}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                          {score.verdict.toUpperCase()}
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#6e6d68]">Score</span>
                          <span className="font-semibold text-[#1a1a1a]">{score.value.toFixed(2)} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-[#f5f4f0] rounded-full overflow-hidden border border-[#e6e4df]">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {score.comment && (
                        <p className="text-[11px] text-[#575652] leading-relaxed bg-[#faf9f6] p-2.5 rounded border border-[#e6e4df] font-mono">
                          {score.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs text-center space-y-2">
                <Sparkles size={24} className="text-[#6e6d68]" />
                <h4 className="font-medium text-[#1a1a1a] text-sm">Nenhuma pontuação registrada</h4>
                <p className="text-xs text-[#6e6d68] max-w-xs">
                  Esta execução não passou pelo motor de avaliação automática offline ou a taxa de amostragem a desconsiderou.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. Raw Metadata Tab */}
        {activeTab === "metadata" && (
          <div className="p-5 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#e6e4df] pb-2.5">
              <span className="text-xs font-semibold text-[#1a1a1a]">Estrutura JSON Completa</span>
              <span className="text-[10px] font-mono text-[#6e6d68]">Formato uRag Event Standard</span>
            </div>
            <pre className="text-xs text-[#1a1a1a] bg-[#faf9f6] p-4 rounded-lg border border-[#e6e4df] overflow-x-auto font-mono max-h-[500px] leading-relaxed">
              {JSON.stringify(run, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
