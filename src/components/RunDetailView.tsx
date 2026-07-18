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
    proxy: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "uRag-go": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "uRag-agent-go": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "uRag-workflow-go": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "uRag-gateway-go": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
      >
        <ChevronLeft size={14} />
        <span>Voltar para Runs</span>
      </button>

      {/* Header Info Card */}
      <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] border font-mono ${sourceColors[run.source] || "border-zinc-800"}`}>
                {run.source}
              </span>
              <h2 className="text-base font-semibold text-zinc-100">{run.name}</h2>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  run.status === "ok"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {run.status === "ok" ? "OK" : "Erro"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              <span>ID: {run.id}</span>
              <button
                onClick={handleCopyId}
                className="hover:text-zinc-300 p-0.5 rounded transition-colors"
                title="Copiar ID"
              >
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <p className="text-zinc-500 text-[10px]">Latência</p>
              <p className="font-semibold text-zinc-200 font-mono mt-0.5">{run.latency_ms} ms</p>
            </div>
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <p className="text-zinc-500 text-[10px]">Tokens (E/S)</p>
              <p className="font-semibold text-zinc-200 font-mono mt-0.5">
                {run.tokens_in} / {run.tokens_out}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <p className="text-zinc-500 text-[10px]">Custo total</p>
              <p className="font-semibold text-emerald-400 font-mono mt-0.5">${run.cost.toFixed(5)}</p>
            </div>
            {run.session_id && (
              <button
                onClick={() => onNavigateToTab(`session-detail-${run.session_id}`)}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <p className="text-zinc-500 text-[10px]">Sessão</p>
                <p className="font-mono mt-0.5 truncate max-w-[80px]">{run.session_id}</p>
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Metadata grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs text-zinc-400">
          <div>
            <span className="text-zinc-500 mr-1.5">Iniciado:</span>
            <span className="text-zinc-300 font-mono">{formatDate(run.timestamp)}</span>
          </div>
          <div>
            <span className="text-zinc-500 mr-1.5">Modelo:</span>
            <span className="text-zinc-300 font-mono">{run.model}</span>
          </div>
          <div>
            <span className="text-zinc-500 mr-1.5">Provedor:</span>
            <span className="text-zinc-300 font-mono">{run.provider}</span>
          </div>
          <div className="col-span-full flex flex-wrap gap-1.5 pt-1">
            {run.tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700/50">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex items-center gap-1">
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
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.id === "guardrails" && run.guardrail_events.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] rounded-full font-bold">
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
            <div className="p-5 border border-zinc-800 rounded-xl bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <span className="text-xs font-semibold text-zinc-300">Prompt / Input</span>
                <span className="text-[10px] font-mono text-zinc-500">{run.tokens_in} tokens</span>
              </div>
              <div className="text-xs font-mono whitespace-pre-wrap text-zinc-300 leading-relaxed max-h-[400px] overflow-y-auto bg-zinc-950/40 p-3.5 rounded-lg border border-zinc-800/60">
                {typeof run.input === "string" ? run.input : JSON.stringify(run.input, null, 2)}
              </div>
            </div>

            {/* Output / Response */}
            <div className="p-5 border border-zinc-800 rounded-xl bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <span className="text-xs font-semibold text-zinc-300">Resposta / Output</span>
                <span className="text-[10px] font-mono text-zinc-500">{run.tokens_out} tokens</span>
              </div>
              <div className="text-xs whitespace-pre-wrap text-zinc-300 leading-relaxed max-h-[400px] overflow-y-auto bg-zinc-950/40 p-3.5 rounded-lg border border-zinc-800/60">
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
              <div className="xl:col-span-2 p-5 border border-zinc-800 rounded-xl bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-semibold text-zinc-300">Estrutura de Trace (Waterfall)</span>
                  <span className="text-[10px] font-mono text-zinc-500">Duração total: {runTotalDuration} ms</span>
                </div>

                <div className="space-y-1.5">
                  {/* Timeline Ruler */}
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600 border-b border-zinc-800 pb-1.5 px-2">
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
                            isSelected ? "bg-zinc-800/40" : "hover:bg-zinc-800/20"
                          }`}
                        >
                          {/* Left label part */}
                          <div className={`w-1/3 text-xs font-medium truncate shrink-0 ${indentClass} pr-2`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${span.type === "llm_call" ? "bg-blue-500" : span.type === "retrieval" ? "bg-emerald-500" : "bg-purple-500"}`} />
                              <span className="truncate text-zinc-200" title={span.name}>
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
                              <div className={`w-full h-full rounded-[3px] ${getSpanTypeColor(span.type)} opacity-40`} />
                            </div>
                            <span
                              style={{ left: `${offsetPercent + 0.5}%` }}
                              className="absolute text-[9px] font-mono text-zinc-400 whitespace-nowrap pointer-events-none"
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
              <div className="p-5 border border-zinc-800 rounded-xl bg-zinc-900 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                  <Info size={14} className="text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-300">Inspetor de Span</span>
                </div>

                {selectedSpan ? (
                  <div className="space-y-4 text-xs">
                    {/* Header Details */}
                    <div>
                      <h5 className="font-semibold text-zinc-100 text-sm truncate">{selectedSpan.name}</h5>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${getSpanTypeBadge(selectedSpan.type)}`}>
                          {selectedSpan.type}
                        </span>
                        <span className="text-zinc-500 font-mono text-[10px]">{selectedSpan.latency_ms} ms</span>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-800" />

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-zinc-400 bg-zinc-950/40 p-2.5 rounded border border-zinc-800/50">
                      <div>
                        <p className="text-zinc-500">Início</p>
                        <p className="text-zinc-300 truncate mt-0.5">
                          {new Date(selectedSpan.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Fim</p>
                        <p className="text-zinc-300 truncate mt-0.5">
                          {new Date(selectedSpan.end_time).toLocaleTimeString()}
                        </p>
                      </div>
                      {selectedSpan.tokens_in !== undefined && (
                        <div>
                          <p className="text-zinc-500">Tokens E/S</p>
                          <p className="text-zinc-300 mt-0.5">
                            {selectedSpan.tokens_in} / {selectedSpan.tokens_out}
                          </p>
                        </div>
                      )}
                      {selectedSpan.cost !== undefined && (
                        <div>
                          <p className="text-zinc-500">Custo</p>
                          <p className="text-emerald-400 mt-0.5">${selectedSpan.cost.toFixed(5)}</p>
                        </div>
                      )}
                    </div>

                    {/* Inputs & Outputs inside span */}
                    {selectedSpan.input && (
                      <div className="space-y-1.5">
                        <p className="text-zinc-500 font-medium">Span Input</p>
                        <pre className="text-[10px] bg-zinc-950/60 p-2.5 rounded border border-zinc-850 overflow-x-auto text-zinc-300 max-h-40 leading-relaxed font-mono">
                          {JSON.stringify(selectedSpan.input, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedSpan.output && (
                      <div className="space-y-1.5">
                        <p className="text-zinc-500 font-medium">Span Output</p>
                        <pre className="text-[10px] bg-zinc-950/60 p-2.5 rounded border border-zinc-850 overflow-x-auto text-zinc-300 max-h-40 leading-relaxed font-mono">
                          {JSON.stringify(selectedSpan.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 py-10 text-center">Selecione um span na timeline para exibir detalhes.</p>
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
                    className="p-5 border border-zinc-800 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 transition-colors space-y-3.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className={evt.verdict === "block" ? "text-rose-500" : "text-amber-500"} />
                        <h4 className="font-semibold text-zinc-100 text-sm">{evt.rule_name}</h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          ID: {evt.rule_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-950 text-zinc-500 border border-zinc-850">
                          Fase: {evt.stage.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            evt.verdict === "block"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {evt.verdict.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Snippet display */}
                    <div className="bg-zinc-950/60 border border-rose-500/10 hover:border-rose-500/20 p-4 rounded-lg space-y-2 text-xs transition-colors">
                      <p className="text-zinc-500 font-medium">Trecho Violado Detectado</p>
                      <p className="font-mono text-rose-400/90 leading-relaxed bg-rose-500/5 px-2.5 py-1.5 rounded border border-rose-500/10 whitespace-pre-wrap">
                        "{evt.snippet}"
                      </p>
                    </div>

                    {evt.details && (
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        <span className="text-zinc-500 font-medium block mb-0.5">Diagnóstico Adicional:</span>
                        {evt.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 border border-zinc-800 rounded-xl bg-zinc-900/40 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
                  <Check size={18} className="text-emerald-400" />
                </div>
                <h4 className="font-medium text-zinc-300 text-sm">Nenhuma violação de Guardrail</h4>
                <p className="text-xs text-zinc-500 max-w-xs">
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

                  let barColor = "bg-emerald-500";
                  let badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (score.verdict === "fail") {
                    barColor = "bg-rose-500";
                    badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  } else if (score.verdict === "warn") {
                    barColor = "bg-amber-500";
                    badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  }

                  return (
                    <div
                      key={score.id}
                      className="p-5 border border-zinc-800 rounded-xl bg-zinc-900 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 capitalize">
                          {score.metric.replace("_", " ")}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                          {score.verdict.toUpperCase()}
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-500">Score</span>
                          <span className="font-semibold text-zinc-300">{score.value.toFixed(2)} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {score.comment && (
                        <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950/40 p-2.5 rounded border border-zinc-850 font-mono">
                          {score.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 border border-zinc-800 rounded-xl bg-zinc-900/40 text-center space-y-2">
                <Sparkles size={24} className="text-zinc-600" />
                <h4 className="font-medium text-zinc-300 text-sm">Nenhuma pontuação registrada</h4>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Esta execução não passou pelo motor de avaliação automática offline ou a taxa de amostragem a desconsiderou.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. Raw Metadata Tab */}
        {activeTab === "metadata" && (
          <div className="p-5 border border-zinc-800 rounded-xl bg-zinc-900 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <span className="text-xs font-semibold text-zinc-300">Estrutura JSON Completa</span>
              <span className="text-[10px] font-mono text-zinc-500">Formato uRag Event Standard</span>
            </div>
            <pre className="text-xs text-zinc-300 bg-zinc-950/50 p-4 rounded-lg border border-zinc-850 overflow-x-auto font-mono max-h-[500px] leading-relaxed">
              {JSON.stringify(run, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
