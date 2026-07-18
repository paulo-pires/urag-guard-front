import React, { useState, useEffect } from "react";
import {
  Search,
  FilterX,
  Copy,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Link2,
} from "lucide-react";
import { api } from "../lib/api";
import { Run } from "../types";

interface RunsViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
  onNavigateToTab: (tab: string) => void;
}

export default function RunsView({
  period,
  customFrom,
  customTo,
  selectedSources,
  onNavigateToTab,
}: RunsViewProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter states
  const [status, setStatus] = useState("todos");
  const [model, setModel] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyViolations, setOnlyViolations] = useState(false);
  const [scoreMin, setScoreMin] = useState<number | "">("");
  const [scoreMax, setScoreMax] = useState<number | "">("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  const fetchRuns = () => {
    setLoading(true);
    setError(false);
    api
      .getRuns({
        from: period === "custom" ? customFrom : period,
        to: period === "custom" ? customTo : undefined,
        source: selectedSources.join(","),
        status,
        model,
        query,
        only_violations: onlyViolations,
        score_min: scoreMin !== "" ? scoreMin : undefined,
        score_max: scoreMax !== "" ? scoreMax : undefined,
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setRuns(data.runs);
        setTotalPages(data.total_pages);
        setTotalItems(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching runs:", err);
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRuns();
  }, [period, customFrom, customTo, selectedSources, status, model, onlyViolations, scoreMin, scoreMax, page]);

  // Handle Search input change with short delay (to prevent aggressive refetching)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchRuns();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearFilters = () => {
    setStatus("todos");
    setModel("all");
    setQuery("");
    setOnlyViolations(false);
    setScoreMin("");
    setScoreMax("");
    setPage(1);
  };

  const isFilterActive =
    status !== "todos" ||
    model !== "all" ||
    query !== "" ||
    onlyViolations ||
    scoreMin !== "" ||
    scoreMax !== "";

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
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return isoStr;
    }
  };

  const renderScoreProgress = (score?: number) => {
    if (score === undefined) return <span className="text-zinc-500">—</span>;
    const pct = Math.round(score * 100);

    // Color ranges
    let barColor = "bg-emerald-500";
    let textColor = "text-emerald-400";
    if (score < 0.6) {
      barColor = "bg-rose-500";
      textColor = "text-rose-400";
    } else if (score < 0.8) {
      barColor = "bg-amber-500";
      textColor = "text-amber-400";
    }

    return (
      <div className="flex items-center gap-2 max-w-[100px]">
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-[10px] font-semibold font-mono ${textColor}`}>{pct}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-3 p-3 rounded-lg border border-zinc-900 bg-zinc-900/20 shadow-sm justify-between items-stretch lg:items-center">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Query Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar ID, input, output..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-zinc-700 rounded pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="ok">Ok</option>
            <option value="erro">Erro</option>
          </select>

          {/* Model selection */}
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Modelos</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="llama-3.1-70b">Llama 3.1 70b</option>
          </select>

          {/* Score Min / Max */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 rounded px-2 py-1 text-xs">
            <span className="text-zinc-500 text-[11px]">Score:</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              placeholder="Min"
              value={scoreMin}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                setScoreMin(val);
                setPage(1);
              }}
              className="w-8 bg-transparent text-zinc-100 focus:outline-none border-b border-zinc-900 text-center py-0"
            />
            <span className="text-zinc-700">-</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              placeholder="Max"
              value={scoreMax}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                setScoreMax(val);
                setPage(1);
              }}
              className="w-8 bg-transparent text-zinc-100 focus:outline-none border-b border-zinc-900 text-center py-0"
            />
          </div>

          {/* Guardrail Violation Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
            <input
              type="checkbox"
              checked={onlyViolations}
              onChange={(e) => {
                setOnlyViolations(e.target.checked);
                setPage(1);
              }}
              className="rounded bg-zinc-950 border-zinc-900 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 accent-emerald-500"
            />
            <span>Apenas Violações 🚩</span>
          </label>
        </div>

        {/* Clear Filters Button */}
        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors bg-rose-950/20 border border-rose-900/30 px-2.5 py-1 rounded"
          >
            <FilterX size={12} />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Runs Table Card */}
      <div className="border border-zinc-900/50 rounded-lg bg-zinc-950/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900/60 text-zinc-500 bg-zinc-950/20">
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Iniciado em</th>
                <th className="px-4 py-2 font-medium">Fonte</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Latência</th>
                <th className="px-4 py-2 font-medium text-right">Tokens</th>
                <th className="px-4 py-2 font-medium text-right">Custo</th>
                <th className="px-4 py-2 font-medium text-center">Guardrail</th>
                <th className="px-4 py-2 font-medium">Score Eval</th>
                <th className="px-4 py-2 font-medium text-center">Sessão</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-zinc-900/30 animate-pulse">
                    <td colSpan={12} className="px-4 py-3">
                      <div className="h-3 bg-zinc-900/50 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : runs.length > 0 ? (
                runs.map((run, i) => (
                  <tr
                    key={run.id}
                    onClick={() => onNavigateToTab(`run-detail-${run.id}`)}
                    className="border-b border-zinc-900/30 even:bg-zinc-900/10 odd:bg-transparent hover:bg-zinc-900/40 cursor-pointer text-zinc-300 transition-colors"
                  >
                    {/* Copyable ID */}
                    <td className="px-4 py-1.5 font-mono text-[10px] group flex items-center gap-1">
                      <span className="truncate max-w-[50px] text-zinc-500">{run.id}</span>
                      <button
                        onClick={(e) => handleCopy(run.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-zinc-300 rounded transition-opacity"
                        title="Copy ID"
                      >
                        {copiedId === run.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-1.5 text-zinc-500 text-[11px] whitespace-nowrap">
                      {formatDate(run.timestamp)}
                    </td>

                    {/* Source badge */}
                    <td className="px-4 py-1.5">
                      <span className={`px-1 py-0.5 rounded-[3px] text-[9px] font-mono border ${sourceColors[run.source] || "border-zinc-800 bg-zinc-900 text-zinc-400"}`}>
                        {run.source}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-1.5 truncate max-w-[140px] font-medium text-zinc-300 text-[11px]" title={run.name}>
                      {run.name}
                    </td>

                    {/* Model */}
                    <td className="px-4 py-1.5 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                      {run.model}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium border ${
                          run.status === "ok"
                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                            : "bg-rose-950/20 text-rose-400 border-rose-900/30"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${run.status === "ok" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {run.status === "ok" ? "OK" : "ERRO"}
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="px-4 py-1.5 text-right font-mono text-zinc-400 text-[11px]">
                      {run.latency_ms.toLocaleString()} ms
                    </td>

                    {/* Tokens */}
                    <td className="px-4 py-1.5 text-right font-mono text-[10px] text-zinc-500">
                      {run.tokens_in}/{run.tokens_out}
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-1.5 text-right font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                      ${run.cost.toFixed(4)}
                    </td>

                    {/* Guardrail status */}
                    <td className="px-4 py-1.5 text-center">
                      {run.has_violation ? (
                        <span
                          className={`inline-flex items-center justify-center px-1 rounded-[3px] text-[9px] font-mono ${
                            run.max_violation_verdict === "block"
                              ? "bg-rose-950/20 text-rose-400 border border-rose-900/30"
                              : "bg-amber-950/20 text-amber-400 border border-amber-900/30"
                          }`}
                          title={`Violação detectada: ${run.max_violation_verdict}`}
                        >
                          {run.max_violation_verdict === "block" ? "BLOCK" : "FLAG"}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">✔</span>
                      )}
                    </td>

                    {/* Evaluation Score */}
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      {renderScoreProgress(run.average_eval_score)}
                    </td>

                    {/* Session link */}
                    <td className="px-4 py-1.5 text-center">
                      {run.session_id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTab(`session-detail-${run.session_id}`);
                          }}
                          className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900 rounded transition-colors inline-block"
                          title={`Ver Sessão ${run.session_id}`}
                        >
                          <Link2 size={12} />
                        </button>
                      ) : (
                        <span className="text-zinc-700 font-mono text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <FilterX size={20} className="text-zinc-400" />
                      </div>
                      <h4 className="font-medium text-zinc-300">Nenhuma execução encontrada</h4>
                      <p className="text-xs text-zinc-500 leading-normal">
                        Nenhum registro de run coincide com os filtros ativos. Remova ou limpe os filtros para visualizar a lista completa.
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={handleClearFilters}
                          className="px-3.5 py-1.5 bg-emerald-500 text-zinc-950 font-medium text-xs rounded-lg hover:bg-emerald-400 transition-colors"
                        >
                          Limpar todos os filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && runs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 text-xs">
            <span className="text-zinc-400">
              Mostrando <span className="font-semibold text-zinc-200">{runs.length}</span> de{" "}
              <span className="font-semibold text-zinc-200">{totalItems}</span> runs
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-zinc-400 px-2 font-mono">
                Página <span className="text-zinc-200">{page}</span> de <span className="text-zinc-200">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
