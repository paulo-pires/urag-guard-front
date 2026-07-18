import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  FilterX,
  MessageSquare,
  Clock,
  Zap,
  DollarSign,
} from "lucide-react";
import { api } from "../lib/api";
import { Session } from "../types";

interface SessionsViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
  onNavigateToTab: (tab: string) => void;
}

export default function SessionsView({
  period,
  customFrom,
  customTo,
  selectedSources,
  onNavigateToTab,
}: SessionsViewProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  const fetchSessions = () => {
    setLoading(true);
    setError(false);
    api
      .getSessions({
        from: period === "custom" ? customFrom : period,
        to: period === "custom" ? customTo : undefined,
        source: selectedSources.join(","),
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setSessions(data.sessions);
        setTotalPages(data.total_pages);
        setTotalItems(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sessions:", err);
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();
  }, [period, customFrom, customTo, selectedSources, page]);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const sourceColors: Record<string, string> = {
    proxy: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "uRag-go": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "uRag-agent-go": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "uRag-workflow-go": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "uRag-gateway-go": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
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

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Table Header Statistics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase font-semibold">Total de Sessões</p>
            <p className="text-lg font-bold text-zinc-100 font-mono mt-0.5">{totalItems}</p>
          </div>
        </div>
        <div className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
            <Zap size={16} />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase font-semibold">Tokens Acumulados</p>
            <p className="text-lg font-bold text-zinc-100 font-mono mt-0.5">
              {sessions.reduce((sum, s) => sum + s.tokens_total, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <DollarSign size={16} />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase font-semibold">Custo Consolidado</p>
            <p className="text-lg font-bold text-zinc-100 font-mono mt-0.5">
              ${sessions.reduce((sum, s) => sum + s.cost_total, 0).toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="border border-zinc-900/50 rounded-lg bg-zinc-950/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900/60 text-zinc-500 bg-zinc-950/20">
                <th className="px-4 py-2 font-medium">Session ID</th>
                <th className="px-4 py-2 font-medium">Fonte</th>
                <th className="px-4 py-2 font-medium">Iniciado em</th>
                <th className="px-4 py-2 font-medium">User ID</th>
                <th className="px-4 py-2 font-medium text-right">Duração</th>
                <th className="px-4 py-2 font-medium text-center">Runs</th>
                <th className="px-4 py-2 font-medium text-right">Tokens Totais</th>
                <th className="px-4 py-2 font-medium text-right">Custo Total</th>
                <th className="px-4 py-2 font-medium">Status Geral</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-zinc-900/30 animate-pulse">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-3 bg-zinc-900/50 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() => onNavigateToTab(`session-detail-${session.id}`)}
                    className="border-b border-zinc-900/30 even:bg-zinc-900/10 odd:bg-transparent hover:bg-zinc-900/40 cursor-pointer text-zinc-300 transition-colors"
                  >
                    {/* Session ID */}
                    <td className="px-4 py-1.5 font-mono text-[10px] group flex items-center gap-1">
                      <span className="truncate max-w-[80px] text-zinc-500">{session.id}</span>
                      <button
                        onClick={(e) => handleCopy(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-zinc-300 rounded transition-opacity"
                        title="Copy ID"
                      >
                        {copiedId === session.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-1.5">
                      <span className={`px-1 py-0.5 rounded-[3px] text-[9px] font-mono border ${sourceColors[session.source] || "border-zinc-800 bg-zinc-900 text-zinc-400"}`}>
                        {session.source}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td className="px-4 py-1.5 text-zinc-500 text-[11px] whitespace-nowrap">
                      {formatDate(session.start_time)}
                    </td>

                    {/* User ID */}
                    <td className="px-4 py-1.5 text-zinc-500 font-mono text-[10px]">
                      {session.user_id || <span className="text-zinc-700">—</span>}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-1.5 text-right font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Clock size={10} className="text-zinc-500" />
                        <span>{formatDuration(session.duration_ms)}</span>
                      </div>
                    </td>

                    {/* Runs count */}
                    <td className="px-4 py-1.5 text-center">
                      <span className="px-1.5 py-0.2 bg-zinc-900 text-zinc-400 border border-zinc-800/80 rounded-[3px] font-mono text-[10px]">
                        {session.run_count}
                      </span>
                    </td>

                    {/* Total Tokens */}
                    <td className="px-4 py-1.5 text-right font-mono text-zinc-400 text-[11px]">
                      {session.tokens_total.toLocaleString()}
                    </td>

                    {/* Total Cost */}
                    <td className="px-4 py-1.5 text-right font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                      ${session.cost_total.toFixed(4)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium border ${
                          session.status === "ok"
                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                            : "bg-rose-950/20 text-rose-400 border-rose-900/30"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${session.status === "ok" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {session.status === "ok" ? "OK" : "FALHAS"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                        <FilterX size={16} className="text-zinc-500" />
                      </div>
                      <h4 className="font-medium text-zinc-400">Nenhuma sessão encontrada</h4>
                      <p className="text-xs text-zinc-600 leading-normal">
                        Nenhuma sessão de conversação foi registrada de acordo com as fontes selecionadas.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && sessions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-900 bg-zinc-950/40 text-[11px]">
            <span className="text-zinc-500">
              Mostrando <span className="font-semibold text-zinc-400">{sessions.length}</span> de{" "}
              <span className="font-semibold text-zinc-400">{totalItems}</span> sessões
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-zinc-500 font-mono">
                Página <span className="text-zinc-400">{page}</span> de <span className="text-zinc-400">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
