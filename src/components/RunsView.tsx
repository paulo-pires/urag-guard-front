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
    proxy: "bg-blue-50 text-blue-800 border-blue-200",
    "uRag-go": "bg-emerald-50 text-emerald-800 border-emerald-200",
    "uRag-agent-go": "bg-purple-50 text-purple-800 border-purple-200",
    "uRag-workflow-go": "bg-amber-50 text-amber-800 border-amber-200",
    "uRag-gateway-go": "bg-[#f5f4f0] text-[#575652] border-[#e6e4df]",
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
    if (score === undefined) return <span className="text-[#8e8d87]">—</span>;
    const pct = Math.round(score * 100);

    // Color ranges
    let barColor = "bg-emerald-600";
    let textColor = "text-emerald-700";
    if (score < 0.6) {
      barColor = "bg-red-600";
      textColor = "text-red-700";
    } else if (score < 0.8) {
      barColor = "bg-amber-600";
      textColor = "text-amber-700";
    }

    return (
      <div className="flex items-center gap-2 max-w-[100px]">
        <div className="w-12 h-1.5 bg-[#e6e4df] rounded-full overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-[10px] font-semibold font-mono ${textColor}`}>{pct}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-3 p-3 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs justify-between items-stretch lg:items-center">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Query Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#6e6d68]" />
            <input
              type="text"
              placeholder="Buscar ID, input, output..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#ffffff] border border-[#e6e4df] hover:border-[#1a1a1a] focus:border-[#1a1a1a] rounded pl-8 pr-3 py-1 text-xs text-[#1a1a1a] placeholder-[#8e8d87] focus:outline-none transition-colors"
            />
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-[#ffffff] border border-[#e6e4df] hover:border-[#1a1a1a] rounded px-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none cursor-pointer"
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
            className="bg-[#ffffff] border border-[#e6e4df] hover:border-[#1a1a1a] rounded px-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Modelos</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="llama-3.1-70b">Llama 3.1 70b</option>
          </select>

          {/* Score Min / Max */}
          <div className="flex items-center gap-1 bg-[#ffffff] border border-[#e6e4df] rounded px-2 py-1 text-xs">
            <span className="text-[#6e6d68] text-[11px]">Score:</span>
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
              className="w-8 bg-transparent text-[#1a1a1a] focus:outline-none border-b border-[#e6e4df] text-center py-0"
            />
            <span className="text-[#8e8d87]">-</span>
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
              className="w-8 bg-transparent text-[#1a1a1a] focus:outline-none border-b border-[#e6e4df] text-center py-0"
            />
          </div>

          {/* Guardrail Violation Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#575652] hover:text-[#1a1a1a]">
            <input
              type="checkbox"
              checked={onlyViolations}
              onChange={(e) => {
                setOnlyViolations(e.target.checked);
                setPage(1);
              }}
              className="rounded bg-[#ffffff] border-[#e6e4df] text-[#1a1a1a] focus:ring-[#1a1a1a] h-3.5 w-3.5 accent-[#1a1a1a]"
            />
            <span>Apenas Violações 🚩</span>
          </label>
        </div>

        {/* Clear Filters Button */}
        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 transition-colors bg-rose-50 border border-rose-200 px-2.5 py-1 rounded font-medium"
          >
            <FilterX size={12} />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Runs Table Card */}
      <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4df] text-[#6e6d68] bg-[#f5f4f0] font-mono text-[10px] uppercase tracking-wider">
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
                  <tr key={idx} className="border-b border-[#e6e4df] animate-pulse">
                    <td colSpan={12} className="px-4 py-3">
                      <div className="h-3 bg-[#f5f4f0] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : runs.length > 0 ? (
                runs.map((run, i) => (
                  <tr
                    key={run.id}
                    onClick={() => onNavigateToTab(`run-detail-${run.id}`)}
                    className="border-b border-[#e6e4df] even:bg-[#faf9f6] odd:bg-white hover:bg-[#f5f4f0]/60 cursor-pointer text-[#1a1a1a] transition-colors"
                  >
                    {/* Copyable ID */}
                    <td className="px-4 py-2 font-mono text-[10px] group flex items-center gap-1">
                      <span className="truncate max-w-[50px] text-[#6e6d68]">{run.id}</span>
                      <button
                        onClick={(e) => handleCopy(run.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8e8d87] hover:text-[#1a1a1a] rounded transition-opacity"
                        title="Copy ID"
                      >
                        {copiedId === run.id ? <Check size={10} className="text-emerald-700" /> : <Copy size={10} />}
                      </button>
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-2 text-[#6e6d68] text-[11px] whitespace-nowrap font-mono">
                      {formatDate(run.timestamp)}
                    </td>

                    {/* Source badge */}
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${sourceColors[run.source] || "border-[#e6e4df] bg-[#f5f4f0] text-[#575652]"}`}>
                        {run.source}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2 truncate max-w-[140px] font-medium text-[#1a1a1a] text-[11px]" title={run.name}>
                      {run.name}
                    </td>

                    {/* Model */}
                    <td className="px-4 py-2 font-mono text-[10px] text-[#6e6d68] whitespace-nowrap">
                      {run.model}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium font-mono border ${
                          run.status === "ok"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${run.status === "ok" ? "bg-emerald-600" : "bg-red-600"}`} />
                        {run.status === "ok" ? "OK" : "ERRO"}
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="px-4 py-2 text-right font-mono text-[#575652] text-[11px]">
                      {run.latency_ms.toLocaleString()} ms
                    </td>

                    {/* Tokens */}
                    <td className="px-4 py-2 text-right font-mono text-[10px] text-[#6e6d68]">
                      {run.tokens_in}/{run.tokens_out}
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-2 text-right font-mono text-[#575652] text-[11px] whitespace-nowrap">
                      ${run.cost.toFixed(4)}
                    </td>

                    {/* Guardrail status */}
                    <td className="px-4 py-2 text-center">
                      {run.has_violation ? (
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                            run.max_violation_verdict === "block"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                          title={`Violação detectada: ${run.max_violation_verdict}`}
                        >
                          {run.max_violation_verdict === "block" ? "BLOCK" : "FLAG"}
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-xs">✔</span>
                      )}
                    </td>

                    {/* Evaluation Score */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      {renderScoreProgress(run.average_eval_score)}
                    </td>

                    {/* Session link */}
                    <td className="px-4 py-2 text-center">
                      {run.session_id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTab(`session-detail-${run.session_id}`);
                          }}
                          className="p-1 text-[#6e6d68] hover:text-[#1a1a1a] hover:bg-[#f5f4f0] rounded transition-colors inline-block"
                          title={`Ver Sessão ${run.session_id}`}
                        >
                          <Link2 size={12} />
                        </button>
                      ) : (
                        <span className="text-[#8e8d87] font-mono text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center text-[#6e6d68]">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f4f0] border border-[#e6e4df] flex items-center justify-center">
                        <FilterX size={20} className="text-[#6e6d68]" />
                      </div>
                      <h4 className="font-medium text-[#1a1a1a]">Nenhuma execução encontrada</h4>
                      <p className="text-xs text-[#6e6d68] leading-normal">
                        Nenhum registro de run coincide com os filtros ativos. Remova ou limpe os filtros para visualizar a lista completa.
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={handleClearFilters}
                          className="px-3.5 py-1.5 bg-[#1a1a1a] text-white font-medium text-xs rounded-md hover:bg-[#2d2d2d] transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#e6e4df] bg-[#f5f4f0] text-xs">
            <span className="text-[#6e6d68]">
              Mostrando <span className="font-semibold text-[#1a1a1a]">{runs.length}</span> de{" "}
              <span className="font-semibold text-[#1a1a1a]">{totalItems}</span> runs
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-[#e6e4df] bg-[#ffffff] text-[#1a1a1a] hover:bg-[#f5f4f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[#6e6d68] px-2 font-mono">
                Página <span className="text-[#1a1a1a]">{page}</span> de <span className="text-[#1a1a1a]">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-[#e6e4df] bg-[#ffffff] text-[#1a1a1a] hover:bg-[#f5f4f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
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
