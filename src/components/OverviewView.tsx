/**
 * OverviewView — Landing page for "Gestão" mode.
 * Answers three questions in order: How much did I spend? With whom? How's the quality?
 */

import { useState, useEffect } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowRight,
  Users, ShieldCheck, AlertTriangle, BarChart3, Activity,
} from "lucide-react";
import { api } from "../lib/api";
import { formatCost } from "../lib/formatCost";
import { UsageGroup } from "../types";

interface OverviewViewProps {
  period: string;
  customFrom: string;
  customTo: string;
  selectedSources: string[];
  onNavigateToTab: (tab: string) => void;
}

/** Period label map for display. */
const PERIOD_LABELS: Record<string, string> = {
  "24h": "Últimas 24h",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  custom: "Período personalizado",
};

export default function OverviewView({
  period,
  customFrom,
  customTo,
  selectedSources,
  onNavigateToTab,
}: OverviewViewProps) {
  const [currentUsage, setCurrentUsage] = useState<UsageGroup[]>([]);
  const [prevUsage, setPrevUsage] = useState<UsageGroup[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Current period usage
        const current = await api.getUsage({
          from: period === "custom" ? customFrom : period,
          to: period === "custom" ? customTo : undefined,
          source: selectedSources.join(","),
          groupBy: "model",
        });
        if (!cancelled) setCurrentUsage(current);

        // Previous period usage (for variation)
        try {
          const prev = await api.getUsage({
            from: "30d",
            source: selectedSources.join(","),
            groupBy: "model",
          });
          if (!cancelled) setPrevUsage(prev);
        } catch {
          if (!cancelled) setPrevUsage([]);
        }

        // Recent scores for quality indicator
        try {
          const scoresRes = await api.getScores({
            page_size: 20,
            from: period === "custom" ? customFrom : period,
            to: period === "custom" ? customTo : undefined,
          });
          if (!cancelled) setScores(scoresRes.scores || []);
        } catch {
          if (!cancelled) setScores([]);
        }
      } catch (err) {
        console.error("[OverviewView] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [period, customFrom, customTo, selectedSources]);

  // Aggregate
  const totalCost = currentUsage.reduce((sum, u) => sum + u.cost, 0);
  const prevTotalCost = prevUsage.reduce((sum, u) => sum + u.cost, 0);
  const costVariation = prevTotalCost > 0
    ? ((totalCost - prevTotalCost) / prevTotalCost) * 100
    : 0;

  const totalTokensIn = currentUsage.reduce((sum, u) => sum + u.tokens_in, 0);
  const totalTokensOut = currentUsage.reduce((sum, u) => sum + u.tokens_out, 0);

  // Top 5 consumers (by cost)
  const topConsumers = [...currentUsage]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // Quality indicator from scores
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length
    : 0;
  const qualityLevel = avgScore >= 0.7 ? "good" : avgScore >= 0.4 ? "warning" : "critical";
  const qualityConfig = {
    good: { label: "Bom", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: ShieldCheck },
    warning: { label: "Atenção", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: AlertTriangle },
    critical: { label: "Crítico", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: AlertTriangle },
  };
  const qCfg = qualityConfig[qualityLevel];
  const QualityIcon = qCfg.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif italic font-bold text-[#1A1A1A]">
          Visão Geral
        </h1>
        <p className="text-xs text-[#71706F] mt-1">
          Resumo do período: {PERIOD_LABELS[period] || period}
        </p>
      </div>

      {/* 3 Big Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Cost */}
        <div className="bg-white border border-[#D3D1CE] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <button
              onClick={() => onNavigateToTab("usage")}
              className="flex items-center gap-1 text-[10px] font-medium text-[#71706F] hover:text-[#1A1A1A] transition-colors"
            >
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#71706F] tracking-wider">
              Gasto no Período
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] mt-1">
              {formatCost(totalCost)}
            </p>
          </div>
          {/* Variation vs previous */}
          <div className="flex items-center gap-1.5">
            {costVariation !== 0 && (
              <div
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  costVariation > 0
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-600"
                }`}
              >
                {costVariation > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(costVariation).toFixed(1)}%
              </div>
            )}
            <span className="text-[10px] text-[#71706F]">
              vs. período anterior
            </span>
          </div>
        </div>

        {/* Card 2: Tokens Summary */}
        <div className="bg-white border border-[#D3D1CE] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <button
              onClick={() => onNavigateToTab("usage")}
              className="flex items-center gap-1 text-[10px] font-medium text-[#71706F] hover:text-[#1A1A1A] transition-colors"
            >
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#71706F] tracking-wider">
              Tokens Processados
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] mt-1">
              {(totalTokensIn + totalTokensOut).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#71706F]">
            <span>↓ {totalTokensIn.toLocaleString("pt-BR")} in</span>
            <span>↑ {totalTokensOut.toLocaleString("pt-BR")} out</span>
          </div>
        </div>

        {/* Card 3: Quality Indicator */}
        <div
          className="rounded-xl p-5 space-y-3 border"
          style={{ backgroundColor: qCfg.bg, borderColor: qCfg.border }}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: qCfg.color + "15" }}
            >
              <QualityIcon className="w-5 h-5" style={{ color: qCfg.color }} />
            </div>
            <button
              onClick={() => onNavigateToTab("assurance")}
              className="flex items-center gap-1 text-[10px] font-medium text-[#71706F] hover:text-[#1A1A1A] transition-colors"
            >
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#71706F] tracking-wider">
              Qualidade das Respostas
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold" style={{ color: qCfg.color }}>
                {scores.length > 0 ? avgScore.toFixed(2) : "—"}
              </p>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={{ backgroundColor: qCfg.color + "20", color: qCfg.color }}
              >
                {scores.length > 0 ? qCfg.label : "Sem dados"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-[#71706F]">
            {scores.length} avaliações no período
          </p>
        </div>
      </div>

      {/* Top 5 Consumers */}
      {topConsumers.length > 0 && (
        <div className="bg-white border border-[#D3D1CE] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#D3D1CE]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#71706F]" />
              <h3 className="text-xs font-bold text-[#1A1A1A]">
                Top Consumidores
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab("usage")}
              className="flex items-center gap-1 text-[10px] font-medium text-[#71706F] hover:text-[#1A1A1A] transition-colors"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#D3D1CE]/50">
            {topConsumers.map((item, idx) => (
              <div
                key={item.group}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#EBE7E2] flex items-center justify-center text-[10px] font-bold text-[#71706F]">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1A1A1A] truncate">
                    {item.group}
                  </p>
                  <p className="text-[10px] text-[#71706F]">
                    {item.count.toLocaleString("pt-BR")} requisições ·{" "}
                    {((item.tokens_in + item.tokens_out)).toLocaleString("pt-BR")} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold font-mono text-[#1A1A1A]">
                    {formatCost(item.cost)}
                  </p>
                  {/* Cost bar */}
                  <div className="w-20 h-1 bg-[#EBE7E2] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (item.cost / (topConsumers[0]?.cost || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {topConsumers.length === 0 && (
        <div className="bg-white border border-[#D3D1CE] rounded-xl p-8 text-center">
          <BarChart3 className="w-8 h-8 text-[#D3D1CE] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#71706F]">
            Nenhum consumo registrado no período
          </p>
          <p className="text-[10px] text-[#71706F] mt-1">
            Os dados aparecem aqui quando houver requisições processadas.
          </p>
        </div>
      )}
    </div>
  );
}
