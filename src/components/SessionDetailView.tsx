import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  User,
  Activity,
  ArrowRight,
  Copy,
  Check,
  DollarSign,
  AlertOctagon,
} from "lucide-react";
import { api } from "../lib/api";
import { Session, Run } from "../types";

interface SessionDetailViewProps {
  sessionId: string;
  onNavigateToTab: (tab: string) => void;
  onBack: () => void;
}

export default function SessionDetailView({ sessionId, onNavigateToTab, onBack }: SessionDetailViewProps) {
  const [session, setSession] = useState<(Session & { runs: Run[]; total_violations: number; average_eval_score?: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .getSession(sessionId)
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching session detail:", err);
        setError(true);
        setLoading(false);
      });
  }, [sessionId]);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="h-40 rounded-xl bg-zinc-900 border border-zinc-800" />
        <div className="h-96 rounded-xl bg-zinc-900 border border-zinc-800" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-zinc-800 rounded-xl bg-zinc-900/50">
        <AlertOctagon size={48} className="text-rose-500 mb-4" />
        <h3 className="text-lg font-medium text-zinc-100">Sessão não encontrada</h3>
        <p className="text-sm text-zinc-400 mt-1">O ID de sessão {sessionId} pode estar inválido.</p>
        <button
          onClick={onBack}
          className="mt-5 px-4 py-2 text-xs font-medium bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Voltar para a lista
        </button>
      </div>
    );
  }

  const sourceColors: Record<string, string> = {
    proxy: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "uRag-go": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "uRag-agent-go": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "uRag-workflow-go": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "uRag-gateway-go": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  const renderScoreProgress = (score?: number) => {
    if (score === undefined) return <span className="text-zinc-500">—</span>;
    const pct = Math.round(score * 100);

    let textColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score < 0.6) {
      textColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    } else if (score < 0.8) {
      textColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }

    return (
      <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] border ${textColor}`}>
        {pct}%
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back to Sessions */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
      >
        <ChevronLeft size={14} />
        <span>Voltar para as Sessões</span>
      </button>

      {/* Header Panel Card */}
      <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] border font-mono ${sourceColors[session.source] || "border-zinc-800"}`}>
                {session.source}
              </span>
              <h2 className="text-base font-semibold text-zinc-100">Sessão {session.id.toUpperCase()}</h2>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  session.status === "ok"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {session.status === "ok" ? "OK" : "Com erros"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              <span>Session ID: {session.id}</span>
              <button
                onClick={(e) => handleCopy(session.id, e)}
                className="hover:text-zinc-300 p-0.5 rounded transition-colors"
                title="Copiar ID"
              >
                {copiedId === session.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-mono">
            {session.user_id && (
              <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center gap-1.5 text-zinc-300">
                <User size={13} className="text-zinc-500" />
                <div>
                  <p className="text-zinc-500 text-[9px] font-sans">User ID</p>
                  <p className="font-semibold">{session.user_id}</p>
                </div>
              </div>
            )}
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <p className="text-zinc-500 text-[9px] font-sans">Início</p>
              <p className="font-semibold text-zinc-300 mt-0.5">{formatDate(session.start_time)}</p>
            </div>
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <p className="text-zinc-500 text-[9px] font-sans">Duração</p>
              <p className="font-semibold text-zinc-300 mt-0.5">{formatDuration(session.duration_ms)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Aggregated Summary widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Runs */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Runs da Sessão</span>
            <Activity size={14} className="text-zinc-500" />
          </div>
          <p className="text-xl font-bold font-mono mt-2 text-zinc-100">{session.run_count}</p>
        </div>

        {/* Total Tokens */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Tokens Consumidos</span>
            <Zap size={14} className="text-zinc-500" />
          </div>
          <p className="text-xl font-bold font-mono mt-2 text-zinc-100">{session.tokens_total.toLocaleString()}</p>
        </div>

        {/* Total Cost */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Custo Acumulado</span>
            <DollarSign size={14} className="text-zinc-500" />
          </div>
          <p className="text-xl font-bold font-mono mt-2 text-emerald-400">${session.cost_total.toFixed(4)}</p>
        </div>

        {/* Guardrail and Average Evals */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Pontuação Eval / Violações</span>
            <ShieldAlert size={14} className="text-zinc-500" />
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-sm font-semibold font-mono text-zinc-100">
              {session.average_eval_score !== undefined
                ? `${(session.average_eval_score * 100).toFixed(0)}%`
                : "N/A"}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                session.total_violations > 0
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {session.total_violations > 0 ? `🚩 ${session.total_violations} Violações` : "Segura ✔"}
            </span>
          </div>
        </div>
      </div>

      {/* Runs sequence inside this session */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">Rastreamento de Execuções (Passos)</h3>

        <div className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/40">
                <th className="px-6 py-3 font-medium">Passo ID</th>
                <th className="px-6 py-3 font-medium">Horário</th>
                <th className="px-6 py-3 font-medium">Nome do Passo</th>
                <th className="px-6 py-3 font-medium">Modelo</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Latência</th>
                <th className="px-6 py-3 font-medium text-center">Guardrail</th>
                <th className="px-6 py-3 font-medium">Score Eval</th>
                <th className="px-6 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {session.runs && session.runs.length > 0 ? (
                session.runs.map((run, index) => (
                  <tr
                    key={run.id}
                    onClick={() => onNavigateToTab(`run-detail-${run.id}`)}
                    className="border-b border-zinc-800/40 hover:bg-zinc-800/25 cursor-pointer text-zinc-300 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-[10px] text-zinc-500">
                      Step {index + 1} ({run.id})
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono whitespace-nowrap">
                      {new Date(run.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-200 truncate max-w-[150px]">
                      {run.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-zinc-500">
                      {run.model}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          run.status === "ok"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {run.status === "ok" ? "OK" : "Falhou"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-400">
                      {run.latency_ms} ms
                    </td>
                    <td className="px-6 py-4 text-center">
                      {run.has_violation ? (
                        <span className="text-rose-400 font-bold" title="Violação!">🚩</span>
                      ) : (
                        <span className="text-emerald-400">✔</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {renderScoreProgress(run.average_eval_score)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold flex items-center justify-end gap-1 ml-auto">
                        <span>Detalhes</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum passo registrado nesta sessão.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
