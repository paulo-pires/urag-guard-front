import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Search,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { api } from "../lib/api";
import { GuardrailEvent, GuardrailRule } from "../types";

interface GuardrailEventsViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
  onNavigateToTab: (tab: string) => void;
}

export default function GuardrailEventsView({
  period,
  customFrom,
  customTo,
  selectedSources,
  onNavigateToTab,
}: GuardrailEventsViewProps) {
  const [events, setEvents] = useState<GuardrailEvent[]>([]);
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [selectedRule, setSelectedRule] = useState("all");
  const [selectedVerdict, setSelectedVerdict] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  // Fetch active rules for the filter dropdown
  useEffect(() => {
    api
      .getGuardrailRules()
      .then((data) => setRules(data))
      .catch((err) => console.error("Error loading rules list:", err));
  }, []);

  const fetchEvents = () => {
    setLoading(true);
    setError(false);
    api
      .getGuardrailEvents({
        from: period === "custom" ? customFrom : period,
        to: period === "custom" ? customTo : undefined,
        source: selectedSources.join(","),
        rule: selectedRule !== "all" ? selectedRule : undefined,
        verdict: selectedVerdict !== "all" ? selectedVerdict : undefined,
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setEvents(data.events);
        setTotalPages(data.total_pages);
        setTotalItems(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching guardrail events:", err);
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, [period, customFrom, customTo, selectedSources, selectedRule, selectedVerdict, page]);

  const handleClearFilters = () => {
    setSelectedRule("all");
    setSelectedVerdict("all");
    setPage(1);
  };

  const isFilterActive = selectedRule !== "all" || selectedVerdict !== "all";

  const sourceColors: Record<string, string> = {
    proxy: "bg-blue-950/20 text-blue-400 border-blue-900/30",
    "uRag-go": "bg-emerald-950/20 text-emerald-400 border-emerald-900/30",
    "uRag-agent-go": "bg-purple-950/20 text-purple-400 border-purple-900/30",
    "uRag-workflow-go": "bg-amber-950/20 text-amber-400 border-amber-900/30",
    "uRag-gateway-go": "bg-zinc-950 border border-zinc-900 text-zinc-400",
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters block */}
      <div className="flex flex-col md:flex-row gap-3 p-3 rounded-lg border border-zinc-900 bg-zinc-900/20 shadow-sm items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Rule Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded px-2.5 py-1 text-xs text-zinc-300">
            <span className="text-zinc-500 text-[11px]">Regra:</span>
            <select
              value={selectedRule}
              onChange={(e) => {
                setSelectedRule(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-zinc-300 cursor-pointer min-w-[150px]"
            >
              <option value="all" className="bg-zinc-950 text-zinc-300">Todas as Regras</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.name} className="bg-zinc-950 text-zinc-300">
                  {rule.name}
                </option>
              ))}
            </select>
          </div>

          {/* Verdict Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded px-2.5 py-1 text-xs text-zinc-300">
            <span className="text-zinc-500 text-[11px]">Veredito:</span>
            <select
              value={selectedVerdict}
              onChange={(e) => {
                setSelectedVerdict(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-zinc-300 cursor-pointer min-w-[120px]"
            >
              <option value="all" className="bg-zinc-950 text-zinc-300">Todos os Vereditos</option>
              <option value="block" className="bg-zinc-950 text-zinc-300">BLOCK (Bloquear)</option>
              <option value="flag" className="bg-zinc-950 text-zinc-300">FLAG (Sinalizar)</option>
              <option value="log" className="bg-zinc-950 text-zinc-300">LOG (Apenas registrar)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors bg-rose-950/20 border border-rose-900/30 px-2.5 py-1 rounded w-full md:w-auto justify-center"
          >
            <FilterX size={12} />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Events Table card */}
      <div className="border border-zinc-900/50 rounded-lg bg-zinc-950/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900/60 text-zinc-500 bg-zinc-950/20">
                <th className="px-4 py-2 font-medium">Horário (UTC)</th>
                <th className="px-4 py-2 font-medium">Regra Disparada</th>
                <th className="px-4 py-2 font-medium">Estágio</th>
                <th className="px-4 py-2 font-medium">Veredito</th>
                <th className="px-4 py-2 font-medium">Filtro / Trecho Violado</th>
                <th className="px-4 py-2 font-medium font-mono">Fonte</th>
                <th className="px-4 py-2 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-zinc-900/30 animate-pulse">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-3 bg-zinc-900/50 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : events.length > 0 ? (
                events.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => onNavigateToTab(`run-detail-${evt.run_id}`)}
                    className="border-b border-zinc-900/30 even:bg-zinc-900/10 odd:bg-transparent hover:bg-zinc-900/40 cursor-pointer text-zinc-300 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-1.5 text-zinc-500 text-[11px] font-mono whitespace-nowrap">
                      {formatDate(evt.timestamp)}
                    </td>

                    {/* Rule name */}
                    <td className="px-4 py-1.5 font-semibold text-zinc-300 text-[11px]">
                      {evt.rule_name}
                    </td>

                    {/* Stage badge */}
                    <td className="px-4 py-1.5">
                      <span className="px-1.5 py-0.5 rounded-[3px] text-[9px] bg-zinc-950 border border-zinc-900 text-zinc-500 font-mono">
                        {evt.stage.toUpperCase()}
                      </span>
                    </td>

                    {/* Verdict badge */}
                    <td className="px-4 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold border ${
                          evt.verdict === "block"
                            ? "bg-rose-950/20 text-rose-400 border-rose-900/30"
                            : evt.verdict === "flag"
                            ? "bg-amber-950/20 text-amber-400 border-amber-900/30"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800/80"
                        }`}
                      >
                        {evt.verdict.toUpperCase()}
                      </span>
                    </td>

                    {/* Snippet text snippet */}
                    <td className="px-4 py-1.5 max-w-[250px] truncate" title={evt.snippet}>
                      <span className="font-mono text-[10px] text-zinc-400 px-1.5 py-0.2 rounded-[3px] bg-zinc-950/40 border border-zinc-905">
                        "{evt.snippet}"
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-1.5">
                      <span className={`px-1 py-0.5 rounded-[3px] text-[9px] font-mono border ${sourceColors[evt.source] || "border-zinc-800 bg-zinc-900 text-zinc-400"}`}>
                        {evt.source}
                      </span>
                    </td>

                    {/* Action link */}
                    <td className="px-4 py-1.5 text-right">
                      <button className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5 text-[11px] font-semibold">
                        <span>Ver Run</span>
                        <ArrowUpRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                        <AlertTriangle size={16} className="text-zinc-500" />
                      </div>
                      <h4 className="font-medium text-zinc-400">Nenhuma violação encontrada</h4>
                      <p className="text-xs text-zinc-600 leading-normal">
                        Nenhum evento de guardrail foi registrado com os filtros e períodos especificados.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && events.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-900 bg-zinc-950/40 text-[11px]">
            <span className="text-zinc-500">
              Mostrando <span className="font-semibold text-zinc-400">{events.length}</span> de{" "}
              <span className="font-semibold text-zinc-400">{totalItems}</span> eventos
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
