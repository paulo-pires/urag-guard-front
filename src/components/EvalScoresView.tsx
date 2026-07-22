import { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api } from "../lib/api";
import { EvalScore } from "../types";

interface EvalScoresViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
  onNavigateToTab: (tab: string) => void;
}

export default function EvalScoresView({
  period,
  customFrom,
  customTo,
  selectedSources,
  onNavigateToTab,
}: EvalScoresViewProps) {
  const [scores, setScores] = useState<EvalScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter States
  const [metric, setMetric] = useState("all");
  const [verdict, setVerdict] = useState("all");
  const [runId, setRunId] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  const fetchScores = () => {
    setLoading(true);
    setError(false);
    api
      .getScores({
        from: period === "custom" ? customFrom : period,
        to: period === "custom" ? customTo : undefined,
        source: selectedSources.join(","),
        metric: metric !== "all" ? metric : undefined,
        verdict: verdict !== "all" ? verdict : undefined,
        run_id: runId || undefined,
        session_id: sessionId || undefined,
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setScores(data.scores);
        setTotalPages(data.total_pages);
        setTotalItems(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading eval scores:", err);
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScores();
  }, [period, customFrom, customTo, selectedSources, metric, verdict, page]);

  // Handle Input searches with short debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchScores();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [runId, sessionId]);

  const handleClearFilters = () => {
    setMetric("all");
    setVerdict("all");
    setRunId("");
    setSessionId("");
    setPage(1);
  };

  const isFilterActive = metric !== "all" || verdict !== "all" || runId !== "" || sessionId !== "";

  // Mock aggregates for Histogram & Line Chart depending on active filters
  const generateChartData = () => {
    // 1. Histogram distribution (0.0 to 1.0)
    // Distribution bins: 0.0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0
    // Faithfulness usually leans higher, conciseness lower, etc.
    const isFaithfulness = metric === "faithfulness";
    const bin1Count = isFaithfulness ? 1 : 2 + Math.floor(Math.random() * 3);
    const bin2Count = isFaithfulness ? 2 : 4 + Math.floor(Math.random() * 4);
    const bin3Count = isFaithfulness ? 5 : 8 + Math.floor(Math.random() * 6);
    const bin4Count = isFaithfulness ? 18 : 12 + Math.floor(Math.random() * 8);
    const bin5Count = isFaithfulness ? 32 : 24 + Math.floor(Math.random() * 12);

    const histogram = [
      { range: "0.0 - 0.2", count: bin1Count, fill: "#ef4444" },
      { range: "0.2 - 0.4", count: bin2Count, fill: "#ef4444" },
      { range: "0.4 - 0.6", count: bin3Count, fill: "#ef4444" },
      { range: "0.6 - 0.8", count: bin4Count, fill: "#f59e0b" },
      { range: "0.8 - 1.0", count: bin5Count, fill: "#10b981" },
    ];

    // 2. Trendline (Score over time)
    const trend = Array.from({ length: 7 }).map((_, idx) => {
      const baseScore = isFaithfulness ? 0.85 : 0.78;
      const variation = (Math.random() * 0.15) - 0.07;
      return {
        day: `D${idx + 1}`,
        score: Number((baseScore + variation).toFixed(2)),
        warn_limit: 0.80,
        fail_limit: 0.60,
      };
    });

    return { histogram, trend };
  };

  const { histogram, trend } = generateChartData();

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  const renderScoreBar = (val: number, verdictStr: "pass" | "warn" | "fail") => {
    const pct = Math.round(val * 100);
    let barColor = "bg-[#1a1a1a]";
    let textColor = "text-emerald-800";

    if (verdictStr === "fail") {
      barColor = "bg-red-600";
      textColor = "text-red-700";
    } else if (verdictStr === "warn") {
      barColor = "bg-amber-600";
      textColor = "text-amber-700";
    }

    return (
      <div className="flex items-center gap-2 max-w-[120px]">
        <div className="w-12 h-1 bg-[#e6e4df] rounded-full overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-[10px] font-mono font-semibold ${textColor}`}>{val.toFixed(2)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Search and Filters panel */}
      <div className="flex flex-col xl:flex-row gap-3 p-3 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {/* Metric select */}
          <div className="flex flex-col">
            <select
              value={metric}
              onChange={(e) => {
                setMetric(e.target.value);
                setPage(1);
              }}
              className="bg-[#ffffff] border border-[#e6e4df] hover:border-[#1a1a1a] rounded px-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none cursor-pointer transition-colors"
            >
              <option value="all">Todas as Métricas</option>
              <option value="faithfulness">Fidelidade (Faithfulness)</option>
              <option value="answer_relevancy">Relevância da Resposta</option>
              <option value="context_recall">Recuperação de Contexto</option>
              <option value="correctness">Acurácia / Correctness</option>
              <option value="conciseness">Concisão</option>
            </select>
          </div>

          {/* Verdict Select */}
          <div className="flex flex-col">
            <select
              value={verdict}
              onChange={(e) => {
                setVerdict(e.target.value);
                setPage(1);
              }}
              className="bg-[#ffffff] border border-[#e6e4df] hover:border-[#1a1a1a] rounded px-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none cursor-pointer transition-colors"
            >
              <option value="all">Todos os Vereditos</option>
              <option value="pass">PASS (Aprovado)</option>
              <option value="warn">WARN (Aviso)</option>
              <option value="fail">FAIL (Falha)</option>
            </select>
          </div>

          {/* Run ID Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8e8d87]" />
            <input
              type="text"
              placeholder="Buscar por Run ID..."
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              className="w-full bg-[#ffffff] border border-[#e6e4df] focus:border-[#1a1a1a] rounded pl-8 pr-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none"
            />
          </div>

          {/* Session ID Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8e8d87]" />
            <input
              type="text"
              placeholder="Buscar por Session ID..."
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full bg-[#ffffff] border border-[#e6e4df] focus:border-[#1a1a1a] rounded pl-8 pr-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none"
            />
          </div>
        </div>

        {/* Clear filters */}
        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center gap-1.5 text-xs text-red-700 hover:text-red-800 transition-colors bg-red-50 border border-red-200 px-2.5 py-1 rounded w-full xl:w-auto font-medium"
          >
            <FilterX size={12} />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Analysis charts (side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histogram distribution */}
        <div className="p-4 border border-[#e6e4df] rounded-lg bg-[#ffffff] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Distribuição de Scores</h4>
            <span className="text-[10px] text-[#6e6d68]">Métrica: {metric === "all" ? "Geral" : metric}</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={histogram} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="range" stroke="#6e6d68" fontSize={10} tickLine={false} />
                <YAxis stroke="#6e6d68" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <RechartsBar name="Quantidade" dataKey="count" radius={[2, 2, 0, 0]}>
                  {histogram.map((entry, index) => (
                    <span key={index} style={{ fill: entry.fill }} />
                  ))}
                  {/* Map the bar colors to dynamic fills */}
                  {histogram.map((entry, idx) => (
                    <RechartsBar key={idx} dataKey="count" fill={entry.fill} />
                  ))}
                </RechartsBar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Trend chart */}
        <div className="p-4 border border-[#e6e4df] rounded-lg bg-[#ffffff] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Tendência Temporal do Score</h4>
            <span className="text-[10px] text-[#6e6d68]">Média Móvel Diária</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={trend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                <XAxis dataKey="day" stroke="#6e6d68" fontSize={10} tickLine={false} />
                <YAxis stroke="#6e6d68" fontSize={10} tickLine={false} domain={[0.4, 1.0]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                  labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
                <RechartsLine name="Score Médio" type="monotone" dataKey="score" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3 }} />
                <RechartsLine name="Aviso Threshold" type="monotone" dataKey="warn_limit" stroke="#d97706" strokeWidth={1} strokeDasharray="4 4" dot={false} activeDot={false} />
                <RechartsLine name="Falha Threshold" type="monotone" dataKey="fail_limit" stroke="#dc2626" strokeWidth={1} strokeDasharray="4 4" dot={false} activeDot={false} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scores log table */}
      <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4df] text-[#6e6d68] bg-[#f5f4f0] font-mono text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Horário (UTC)</th>
                <th className="px-4 py-2.5 font-medium">Run ID</th>
                <th className="px-4 py-2.5 font-medium">Métrica</th>
                <th className="px-4 py-2.5 font-medium">Valor Registrado</th>
                <th className="px-4 py-2.5 font-medium">Veredito</th>
                <th className="px-4 py-2.5 font-medium">Feedback do Avaliador</th>
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
              ) : scores.length > 0 ? (
                scores.map((score) => (
                  <tr
                    key={score.id}
                    onClick={() => onNavigateToTab(`run-detail-${score.run_id}`)}
                    className="border-b border-[#e6e4df] even:bg-[#faf9f6] odd:bg-white hover:bg-[#f5f4f0]/60 cursor-pointer text-[#1a1a1a] transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-2 text-[#6e6d68] text-[11px] font-mono whitespace-nowrap">
                      {formatDate(score.timestamp)}
                    </td>

                    {/* Run ID Link */}
                    <td className="px-4 py-2 font-mono text-[11px] text-[#575652]">
                      {score.run_id}
                    </td>

                    {/* Metric badge */}
                    <td className="px-4 py-2 capitalize font-medium text-[#1a1a1a] text-[11px]">
                      {score.metric.replace("_", " ")}
                    </td>

                    {/* Progress score bar */}
                    <td className="px-4 py-2">
                      {renderScoreBar(score.value, score.verdict)}
                    </td>

                    {/* Verdict badge */}
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          score.verdict === "pass"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : score.verdict === "warn"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {score.verdict.toUpperCase()}
                      </span>
                    </td>

                    {/* Evaluator Comment */}
                    <td className="px-4 py-2 text-[#6e6d68] text-[11px] truncate max-w-[200px]" title={score.comment}>
                      {score.comment}
                    </td>

                    {/* Link */}
                    <td className="px-4 py-2 text-right">
                      <button className="text-[#1a1a1a] hover:underline inline-flex items-center gap-0.5 text-[11px] font-medium">
                        <span>Ver Trace</span>
                        <ArrowUpRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#6e6d68]">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-8 h-8 rounded-full bg-[#f5f4f0] flex items-center justify-center">
                        <Sparkles size={16} className="text-[#6e6d68]" />
                      </div>
                      <h4 className="font-medium text-[#1a1a1a]">Nenhum score registrado</h4>
                      <p className="text-xs text-[#6e6d68] leading-normal">
                        Nenhum score de avaliação coincide com os filtros ativos. Remova filtros ou amplie o período.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && scores.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e6e4df] bg-[#f5f4f0] text-[11px]">
            <span className="text-[#6e6d68]">
              Mostrando <span className="font-semibold text-[#1a1a1a]">{scores.length}</span> de{" "}
              <span className="font-semibold text-[#1a1a1a]">{totalItems}</span> avaliações
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded border border-[#e6e4df] bg-[#ffffff] text-[#1a1a1a] hover:bg-[#f5f4f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[#6e6d68] font-mono">
                Página <span className="text-[#1a1a1a] font-semibold">{page}</span> de <span className="text-[#1a1a1a] font-semibold">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded border border-[#e6e4df] bg-[#ffffff] text-[#1a1a1a] hover:bg-[#f5f4f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
