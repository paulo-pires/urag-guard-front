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
    proxy: "bg-blue-50 text-blue-700 border-blue-200",
    "uRag-go": "bg-emerald-50 text-emerald-800 border-emerald-200",
    "uRag-agent-go": "bg-purple-50 text-purple-700 border-purple-200",
    "uRag-workflow-go": "bg-amber-50 text-amber-800 border-amber-200",
    "uRag-gateway-go": "bg-[#f5f4f0] border-[#e6e4df] text-[#575652]",
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
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Filters block */}
      <div className="flex flex-col md:flex-row gap-3 p-3 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Rule Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-[#f5f4f0] border border-[#e6e4df] rounded px-2.5 py-1 text-xs text-[#1a1a1a]">
            <span className="text-[#6e6d68] text-[11px]">Regra:</span>
            <select
              value={selectedRule}
              onChange={(e) => {
                setSelectedRule(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-[#1a1a1a] cursor-pointer min-w-[150px]"
            >
              <option value="all" className="bg-[#ffffff] text-[#1a1a1a]">Todas as Regras</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.name} className="bg-[#ffffff] text-[#1a1a1a]">
                  {rule.name}
                </option>
              ))}
            </select>
          </div>

          {/* Verdict Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-[#f5f4f0] border border-[#e6e4df] rounded px-2.5 py-1 text-xs text-[#1a1a1a]">
            <span className="text-[#6e6d68] text-[11px]">Veredito:</span>
            <select
              value={selectedVerdict}
              onChange={(e) => {
                setSelectedVerdict(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-[#1a1a1a] cursor-pointer min-w-[120px]"
            >
              <option value="all" className="bg-[#ffffff] text-[#1a1a1a]">Todos os Vereditos</option>
              <option value="block" className="bg-[#ffffff] text-[#1a1a1a]">BLOCK (Bloquear)</option>
              <option value="flag" className="bg-[#ffffff] text-[#1a1a1a]">FLAG (Sinalizar)</option>
              <option value="log" className="bg-[#ffffff] text-[#1a1a1a]">LOG (Apenas registrar)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 text-xs text-red-700 hover:text-red-800 transition-colors bg-red-50 border border-red-200 px-2.5 py-1 rounded w-full md:w-auto justify-center font-medium"
          >
            <FilterX size={12} />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Events Table card */}
      <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4df] text-[#6e6d68] bg-[#f5f4f0] font-mono text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Horário (UTC)</th>
                <th className="px-4 py-2.5 font-medium">Regra Disparada</th>
                <th className="px-4 py-2.5 font-medium">Estágio</th>
                <th className="px-4 py-2.5 font-medium">Veredito</th>
                <th className="px-4 py-2.5 font-medium">Filtro / Trecho Violado</th>
                <th className="px-4 py-2.5 font-medium font-mono">Fonte</th>
                <th className="px-4 py-2.5 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-[#e6e4df] animate-pulse">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-3 bg-[#f5f4f0] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : events.length > 0 ? (
                events.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => onNavigateToTab(`run-detail-${evt.run_id}`)}
                    className="border-b border-[#e6e4df] even:bg-[#faf9f6] odd:bg-white hover:bg-[#f5f4f0]/60 cursor-pointer text-[#1a1a1a] transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-2 text-[#6e6d68] text-[11px] font-mono whitespace-nowrap">
                      {formatDate(evt.timestamp)}
                    </td>

                    {/* Rule name */}
                    <td className="px-4 py-2 font-medium text-[#1a1a1a] text-[11px]">
                      {evt.rule_name}
                    </td>

                    {/* Stage badge */}
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-[9px] bg-[#f5f4f0] border border-[#e6e4df] text-[#575652] font-mono">
                        {evt.stage.toUpperCase()}
                      </span>
                    </td>

                    {/* Verdict badge */}
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                          evt.verdict === "block"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : evt.verdict === "flag"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-[#f5f4f0] text-[#575652] border-[#e6e4df]"
                        }`}
                      >
                        {evt.verdict.toUpperCase()}
                      </span>
                    </td>

                    {/* Snippet text snippet */}
                    <td className="px-4 py-2 max-w-[250px] truncate" title={evt.snippet}>
                      <span className="font-mono text-[10px] text-[#575652] px-1.5 py-0.5 rounded bg-[#f5f4f0] border border-[#e6e4df]">
                        "{evt.snippet}"
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${sourceColors[evt.source] || "border-[#e6e4df] bg-[#f5f4f0] text-[#575652]"}`}>
                        {evt.source}
                      </span>
                    </td>

                    {/* Action link */}
                    <td className="px-4 py-2 text-right">
                      <button className="text-[#1a1a1a] hover:underline inline-flex items-center gap-0.5 text-[11px] font-medium">
                        <span>Ver Run</span>
                        <ArrowUpRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#6e6d68]">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-8 h-8 rounded-full bg-[#f5f4f0] border border-[#e6e4df] flex items-center justify-center">
                        <AlertTriangle size={16} className="text-[#6e6d68]" />
                      </div>
                      <h4 className="font-medium text-[#1a1a1a]">Nenhuma violação encontrada</h4>
                      <p className="text-xs text-[#6e6d68] leading-normal">
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
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e6e4df] bg-[#f5f4f0] text-[11px]">
            <span className="text-[#6e6d68]">
              Mostrando <span className="font-semibold text-[#1a1a1a]">{events.length}</span> de{" "}
              <span className="font-semibold text-[#1a1a1a]">{totalItems}</span> eventos
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded border border-[#e6e4df] bg-[#ffffff] text-[#575652] hover:text-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[#6e6d68] font-mono">
                Página <span className="text-[#1a1a1a]">{page}</span> de <span className="text-[#1a1a1a]">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded border border-[#e6e4df] bg-[#ffffff] text-[#575652] hover:text-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
