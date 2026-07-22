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
    proxy: "bg-blue-50 text-blue-800 border-blue-200",
    "uRag-go": "bg-emerald-50 text-emerald-800 border-emerald-200",
    "uRag-agent-go": "bg-purple-50 text-purple-800 border-purple-200",
    "uRag-workflow-go": "bg-amber-50 text-amber-800 border-amber-200",
    "uRag-gateway-go": "bg-[#f5f4f0] text-[#575652] border-[#e6e4df]",
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
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Table Header Statistics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="text-[#6e6d68] text-[10px] uppercase font-semibold">Total de Sessões</p>
            <p className="text-lg font-bold text-[#1a1a1a] font-mono mt-0.5">{totalItems}</p>
          </div>
        </div>
        <div className="p-4 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg">
            <Zap size={16} />
          </div>
          <div>
            <p className="text-[#6e6d68] text-[10px] uppercase font-semibold">Tokens Acumulados</p>
            <p className="text-lg font-bold text-[#1a1a1a] font-mono mt-0.5">
              {sessions.reduce((sum, s) => sum + s.tokens_total, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="p-4 border border-[#e6e4df] rounded-xl bg-[#ffffff] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
            <DollarSign size={16} />
          </div>
          <div>
            <p className="text-[#6e6d68] text-[10px] uppercase font-semibold">Custo Consolidado</p>
            <p className="text-lg font-bold text-[#1a1a1a] font-mono mt-0.5">
              ${sessions.reduce((sum, s) => sum + s.cost_total, 0).toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4df] text-[#6e6d68] bg-[#f5f4f0]">
                <th className="px-4 py-2.5 font-semibold">Session ID</th>
                <th className="px-4 py-2.5 font-semibold">Fonte</th>
                <th className="px-4 py-2.5 font-semibold">Iniciado em</th>
                <th className="px-4 py-2.5 font-semibold">User ID</th>
                <th className="px-4 py-2.5 font-semibold text-right">Duração</th>
                <th className="px-4 py-2.5 font-semibold text-center">Runs</th>
                <th className="px-4 py-2.5 font-semibold text-right">Tokens Totais</th>
                <th className="px-4 py-2.5 font-semibold text-right">Custo Total</th>
                <th className="px-4 py-2.5 font-semibold">Status Geral</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-[#e6e4df] animate-pulse">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-3 bg-[#f5f4f0] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() => onNavigateToTab(`session-detail-${session.id}`)}
                    className="border-b border-[#e6e4df] even:bg-[#faf9f6] odd:bg-[#ffffff] hover:bg-[#f5f4f0] cursor-pointer text-[#1a1a1a] transition-colors"
                  >
                    {/* Session ID */}
                    <td className="px-4 py-2 font-mono text-[10px] group flex items-center gap-1">
                      <span className="truncate max-w-[80px] text-[#6e6d68] group-hover:text-[#1a1a1a]">{session.id}</span>
                      <button
                        onClick={(e) => handleCopy(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#6e6d68] hover:text-[#1a1a1a] rounded transition-opacity"
                        title="Copy ID"
                      >
                        {copiedId === session.id ? <Check size={10} className="text-emerald-700" /> : <Copy size={10} />}
                      </button>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-2">
                      <span className={`px-1 py-0.5 rounded-[3px] text-[9px] font-mono border ${sourceColors[session.source] || "border-[#e6e4df] bg-[#f5f4f0] text-[#575652]"}`}>
                        {session.source}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td className="px-4 py-2 text-[#575652] text-[11px] whitespace-nowrap">
                      {formatDate(session.start_time)}
                    </td>

                    {/* User ID */}
                    <td className="px-4 py-2 text-[#6e6d68] font-mono text-[10px]">
                      {session.user_id || <span className="text-[#8e8d87]">—</span>}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-2 text-right font-mono text-[#575652] text-[11px] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Clock size={10} className="text-[#6e6d68]" />
                        <span>{formatDuration(session.duration_ms)}</span>
                      </div>
                    </td>

                    {/* Runs count */}
                    <td className="px-4 py-2 text-center">
                      <span className="px-1.5 py-0.2 bg-[#f5f4f0] text-[#575652] border border-[#e6e4df] rounded-[3px] font-mono text-[10px]">
                        {session.run_count}
                      </span>
                    </td>

                    {/* Total Tokens */}
                    <td className="px-4 py-2 text-right font-mono text-[#575652] text-[11px]">
                      {session.tokens_total.toLocaleString()}
                    </td>

                    {/* Total Cost */}
                    <td className="px-4 py-2 text-right font-mono text-[#575652] text-[11px] whitespace-nowrap">
                      ${session.cost_total.toFixed(4)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium font-mono border ${
                          session.status === "ok"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${session.status === "ok" ? "bg-emerald-600" : "bg-red-600"}`} />
                        {session.status === "ok" ? "OK" : "FALHAS"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[#6e6d68]">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-8 h-8 rounded-full bg-[#f5f4f0] border border-[#e6e4df] flex items-center justify-center">
                        <FilterX size={16} className="text-[#6e6d68]" />
                      </div>
                      <h4 className="font-medium text-[#1a1a1a]">Nenhuma sessão encontrada</h4>
                      <p className="text-xs text-[#6e6d68] leading-normal">
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
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e6e4df] bg-[#faf9f6] text-[11px]">
            <span className="text-[#6e6d68]">
              Mostrando <span className="font-semibold text-[#1a1a1a]">{sessions.length}</span> de{" "}
              <span className="font-semibold text-[#1a1a1a]">{totalItems}</span> sessões
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded border border-[#e6e4df] bg-[#ffffff] text-[#1a1a1a] hover:bg-[#f5f4f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[#6e6d68] font-mono">
                Página <span className="text-[#1a1a1a] font-semibold">{page}</span> de <span className="text-[#1a1a1a] font-semibold">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded border border-[#e6e4df] bg-[#ffffff] text-[#1a1a1a] hover:bg-[#f5f4f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
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
