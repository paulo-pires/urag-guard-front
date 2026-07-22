import { useState, useEffect } from "react";
import {
  Coins,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../lib/api";
import { UsageGroup } from "../types";

interface UsageViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
}

export default function UsageView({
  period,
  customFrom,
  customTo,
  selectedSources,
}: UsageViewProps) {
  const [usageData, setUsageData] = useState<UsageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groupBy, setGroupBy] = useState<"model" | "provider" | "source" | "user" | "day">("model");

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .getUsage({
        from: period === "custom" ? customFrom : period,
        to: period === "custom" ? customTo : undefined,
        source: selectedSources.join(","),
        groupBy,
      })
      .then((data) => {
        setUsageData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching usage stats:", err);
        setError(true);
        setLoading(false);
      });
  }, [period, customFrom, customTo, selectedSources, groupBy]);

  // Aggregate totals
  const totalCost = usageData.reduce((sum, item) => sum + item.cost, 0);
  const totalRequests = usageData.reduce((sum, item) => sum + item.count, 0);
  const totalTokensIn = usageData.reduce((sum, item) => sum + item.tokens_in, 0);
  const totalTokensOut = usageData.reduce((sum, item) => sum + item.tokens_out, 0);
  const totalTokens = totalTokensIn + totalTokensOut;

  const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];

  const renderGroupDetails = () => {
    return (
      <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4df] text-[#6e6d68] bg-[#f5f4f0] font-mono text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium capitalize">{groupBy}</th>
                <th className="px-4 py-2.5 font-medium text-right">Chamadas (Requests)</th>
                <th className="px-4 py-2.5 font-medium text-right">Tokens Entrada (In)</th>
                <th className="px-4 py-2.5 font-medium text-right">Tokens Saída (Out)</th>
                <th className="px-4 py-2.5 font-medium text-right">Custo Consumido ($)</th>
                <th className="px-4 py-2.5 font-medium text-right">Média Custo/Req</th>
              </tr>
            </thead>
            <tbody>
              {usageData.map((item, idx) => (
                <tr key={idx} className="border-b border-[#e6e4df] even:bg-[#faf9f6] odd:bg-white hover:bg-[#f5f4f0]/60 text-[#1a1a1a] transition-colors">
                  <td className="px-4 py-2 font-mono font-medium text-[#1a1a1a]">
                    {item.group}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[#1a1a1a]">
                    {item.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[#6e6d68]">
                    {item.tokens_in.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[#6e6d68]">
                    {item.tokens_out.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-800 font-semibold">
                    ${item.cost.toFixed(4)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[#6e6d68]">
                    ${(item.cost / (item.count || 1)).toFixed(5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (groupBy === "day") {
      // Historical curves are best served with a double area chart (tokens in vs out) or cost curve
      const sortedByDay = [...usageData].sort((a, b) => a.group.localeCompare(b.group));
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Area Chart */}
          <div className="p-4 border border-[#e6e4df] rounded-lg bg-[#ffffff] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Histórico de Tokens</h4>
              <span className="text-[10px] text-[#6e6d68]">Distribuição Input / Output</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedByDay} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                  <XAxis dataKey="group" stroke="#6e6d68" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6e6d68" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                    labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                    itemStyle={{ fontSize: "10px" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#6e6d68" }} />
                  <Area name="Tokens In" type="monotone" dataKey="tokens_in" stroke="#2563eb" fillOpacity={1} fill="url(#colorIn)" />
                  <Area name="Tokens Out" type="monotone" dataKey="tokens_out" stroke="#059669" fillOpacity={1} fill="url(#colorOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Line Chart */}
          <div className="p-4 border border-[#e6e4df] rounded-lg bg-[#ffffff] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Custo Diário Acumulado</h4>
              <span className="text-[10px] text-[#6e6d68]">Métrica em Dólares USD</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedByDay} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                  <XAxis dataKey="group" stroke="#6e6d68" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6e6d68" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                    labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                    itemStyle={{ fontSize: "10px" }}
                  />
                  <Line name="Custo ($)" type="monotone" dataKey="cost" stroke="#dc2626" strokeWidth={2} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Pie chart or bar charts for non-temporal configurations (model, source, provider, etc.)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Distribution (Pie Chart) */}
        <div className="p-4 border border-[#e6e4df] rounded-lg bg-[#ffffff] space-y-3 shadow-xs">
          <h4 className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Fatia de Custo (%)</h4>
          <div className="h-64 flex items-center justify-center">
            {usageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usageData}
                    dataKey="cost"
                    nameKey="group"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ group, percent }) => `${group} (${(percent * 100).toFixed(0)}%)`}
                    fontSize={10}
                    stroke="#ffffff"
                  >
                    {usageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                    labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                    itemStyle={{ fontSize: "10px" }}
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, "Custo"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-[#6e6d68]">Sem dados</span>
            )}
          </div>
        </div>

        {/* Requests comparisons (Bar Chart) */}
        <div className="p-4 border border-[#e6e4df] rounded-lg bg-[#ffffff] space-y-3 shadow-xs">
          <h4 className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Chamadas por Grupo</h4>
          <div className="h-64">
            {usageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" />
                  <XAxis dataKey="group" stroke="#6e6d68" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6e6d68" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e6e4df", borderRadius: "6px", color: "#1a1a1a" }}
                    labelStyle={{ color: "#6e6d68", fontSize: "10px" }}
                    itemStyle={{ fontSize: "10px" }}
                  />
                  <Bar dataKey="count" name="Chamadas" fill="#10b981" radius={[2, 2, 0, 0]}>
                    {usageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-[#6e6d68]">Sem dados</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Top Header Group selector bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs items-center justify-between">
        <div className="space-y-0.5 w-full sm:w-auto">
          <h2 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Coins className="text-[#1a1a1a]" size={14} />
            Agrupamento do Consumo
          </h2>
          <p className="text-[11px] text-[#6e6d68]">Analise custos de LLMs sob múltiplos pontos de agregação.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#f5f4f0] border border-[#e6e4df] rounded w-full sm:w-auto overflow-x-auto">
          {(["model", "provider", "source", "user", "day"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all whitespace-nowrap capitalize cursor-pointer ${
                groupBy === g
                  ? "bg-[#1a1a1a] text-white shadow-xs"
                  : "text-[#6e6d68] hover:text-[#1a1a1a]"
              }`}
            >
              {g === "day" ? "Dia (Linha)" : g}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregated Totals grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs">
          <p className="text-[#6e6d68] text-[10px] uppercase font-bold tracking-wider">Custo Consolidado ($)</p>
          <p className="text-xl font-bold font-mono text-[#1a1a1a] mt-2">${totalCost.toFixed(4)}</p>
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#6e6d68]">
            <TrendingUp size={11} className="text-emerald-700" />
            <span>Cobranças sob taxas normais</span>
          </div>
        </div>

        {/* Requests */}
        <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs">
          <p className="text-[#6e6d68] text-[10px] uppercase font-bold tracking-wider">Volume de Chamadas</p>
          <p className="text-xl font-bold font-mono text-[#1a1a1a] mt-2">{totalRequests.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#6e6d68]">
            <Activity size={11} className="text-[#6e6d68]" />
            <span>Estabilidade de tráfego</span>
          </div>
        </div>

        {/* Tokens In */}
        <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs">
          <p className="text-[#6e6d68] text-[10px] uppercase font-bold tracking-wider">Tokens Entrada (Prompt)</p>
          <p className="text-xl font-bold font-mono text-[#1a1a1a] mt-2">{totalTokensIn.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#6e6d68]">
            <span className="font-semibold text-emerald-800">
              {totalTokens > 0 ? `${Math.round((totalTokensIn / totalTokens) * 100)}%` : "0%"}
            </span>
            <span className="text-[#6e6d68]">do volume total</span>
          </div>
        </div>

        {/* Tokens Out */}
        <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs">
          <p className="text-[#6e6d68] text-[10px] uppercase font-bold tracking-wider">Tokens Saída (Resposta)</p>
          <p className="text-xl font-bold font-mono text-[#1a1a1a] mt-2">{totalTokensOut.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#6e6d68]">
            <span className="font-semibold text-blue-800">
              {totalTokens > 0 ? `${Math.round((totalTokensOut / totalTokens) * 100)}%` : "0%"}
            </span>
            <span className="text-[#6e6d68]">do volume total</span>
          </div>
        </div>
      </div>

      {/* Usage Charts depending on Grouping selection */}
      {loading ? (
        <div className="h-64 border border-[#e6e4df] rounded-lg bg-[#ffffff] flex items-center justify-center text-[#6e6d68]">
          <RefreshCw className="animate-spin mr-2" size={14} />
          <span className="text-[11px] font-mono">Calculando métricas...</span>
        </div>
      ) : (
        renderCharts()
      )}

      {/* Grid details */}
      {!loading && usageData.length > 0 && renderGroupDetails()}
    </div>
  );
}
