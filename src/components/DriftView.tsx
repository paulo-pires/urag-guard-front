import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  Zap,
  Check,
  ShieldAlert
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { ModelRegistry, DriftMetrics, AuditViolationLog, McpServerConfig } from "../types";
import { callMCPTool } from "../lib/api";

interface DriftViewProps {
  models: ModelRegistry[];
  driftData?: Record<string, DriftMetrics>;
  auditLogs?: AuditViolationLog[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  config: McpServerConfig;
  onRefresh: () => void;
}

export const DriftView: React.FC<DriftViewProps> = ({
  models,
  driftData = {},
  auditLogs = [],
  selectedModelId = "",
  onSelectModel = (_id: string) => {},
  config,
  onRefresh
}) => {
  const [isUpdatingMetrics, setIsUpdatingMetrics] = useState(false);
  const [selectedLogModal, setSelectedLogModal] = useState<AuditViolationLog | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0];
  const currentDrift: DriftMetrics = driftData[selectedModelId] || {
    modelId: selectedModelId,
    timestamp: new Date().toISOString(),
    latencyMs: 14.8,
    tokensPerSecond: 85.0,
    accuracyScore: 0.93,
    driftScore: 0.08,
    violationCount: 2,
    status: "stable",
    metrics: [
      { timestamp: "18:00", latency: 14.8, accuracy: 0.93, drift: 0.08 }
    ]
  };

  const handleUpdateMetrics = async () => {
    setIsUpdatingMetrics(true);
    try {
      await callMCPTool(
        config.modelOpsPort,
        "update_metrics",
        { model_id: selectedModelId },
        config.token,
        config
      );
      onRefresh();
    } catch (err) {
      console.error("Erro ao atualizar métricas de drift:", err);
    } finally {
      setIsUpdatingMetrics(false);
    }
  };

  const getDriftStatusInfo = (score: number) => {
    if (score > 0.3) {
      return {
        label: "Crítico (Drift Acentuado)",
        badge: "bg-rose-100 text-rose-800 border-rose-200",
        color: "text-rose-800"
      };
    }
    if (score > 0.15) {
      return {
        label: "Atenção (Drift Moderado)",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        color: "text-amber-800"
      };
    }
    return {
      label: "Estável (Sob Controle)",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      color: "text-emerald-800"
    };
  };

  const statusInfo = getDriftStatusInfo(currentDrift.driftScore);

  // @debug-removed: console.log auditLogs — left during development

  const filteredLogs = auditLogs.filter((log) => {
    if (!selectedModelId) return true;

    // Find the selected model object to access its friendly name and version string
    const model = models.find((m) => m.id === selectedModelId);
    if (!model) {
      return log.modelId === selectedModelId || log.modelName === selectedModelId;
    }

    const selId = selectedModelId.toLowerCase();
    const selName = model.name.toLowerCase();
    const selVer = model.modelName.toLowerCase();

    const logAct = log.modelId.toLowerCase();
    const logName = log.modelName.toLowerCase();

    const isMatch =
      log.modelId === selectedModelId ||
      logAct.includes(selId) ||
      logAct.includes(selVer) ||
      selVer.includes(logAct) ||
      logName.includes(selName) ||
      selName.includes(logName) ||
      logName.includes(selVer) ||
      selVer.includes(logName);

    return isMatch && (severityFilter === "ALL" || log.severity === severityFilter);
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safePage, pageSize]);

  // Reset to page 1 when filter changes
  const handleSeverityChange = (val: string) => {
    setSeverityFilter(val);
    setCurrentPage(1);
  };

  const chartMetrics = [...(currentDrift.metrics || [])].sort((a, b) => {
    return a.timestamp.localeCompare(b.timestamp);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Model Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#ffffff] border border-[#e6e4df] p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#1a1a1a]" />
            Telemetria & Drift de Qualidade
          </h2>
          <p className="text-xs text-[#666257] mt-1">
            Monitoramento de latência, acurácia e desvios de comportamento via uRag ModelOps (:8097)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#555249]">Modelo:</span>
            <select
              value={selectedModelId}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-[#faf9f6] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-[#1a1a1a]"
              aria-label="Selecionar modelo"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Action Update Metrics */}
          <button
            onClick={handleUpdateMetrics}
            disabled={isUpdatingMetrics}
            className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#333333] text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingMetrics ? "animate-spin" : ""}`} />
            Atualizar Métricas
          </button>
        </div>
      </div>

      {/* KPI Stats Grid for Selected Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Drift Score Card */}
        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Pontuação de Drift</span>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusInfo.badge}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className={`text-3xl font-extrabold font-mono ${statusInfo.color}`}>
              {currentDrift.driftScore.toFixed(2)}
            </p>
            <span className="text-xs text-[#666257]">/ 1.0</span>
          </div>
        </div>

        {/* Accuracy Score Card */}
        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Acurácia Global</span>
            <CheckCircle className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-emerald-800 font-mono">
              {(currentDrift.accuracyScore * 100).toFixed(1)}%
            </p>
            <span className="text-xs font-semibold text-emerald-700">Score de Precisão</span>
          </div>
        </div>

        {/* Avg Latency Card */}
        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Latência Média</span>
            <Clock className="w-4 h-4 text-[#1a1a1a]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-[#1a1a1a] font-mono">
              {typeof currentDrift.latencyMs === "number" ? currentDrift.latencyMs.toFixed(1) : currentDrift.latencyMs} ms
            </p>
            <span className="text-xs text-[#666257]">
              ~{typeof currentDrift.tokensPerSecond === "number" ? currentDrift.tokensPerSecond.toFixed(1) : currentDrift.tokensPerSecond || 80} tok/s
            </span>
          </div>
        </div>

        {/* Violations Count Card */}
        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Violações / Alertas</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-amber-800 font-mono">{currentDrift.violationCount}</p>
            <span className="text-xs text-[#666257]">Registros no Audit Log</span>
          </div>
        </div>
      </div>

      {/* Main Chart: Latency vs Accuracy & Drift over Time */}
      <div className="bg-[#ffffff] border border-[#e6e4df] p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e6e4df] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1a1a1a]" />
              Evolução Temporal das Métricas de Qualidade
            </h3>
            <p className="text-xs text-[#666257]">
              Comparação direta entre Latência (ms), Acurácia e Drift Score em tempo real
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1a1a1a]" />
              <span className="text-[#1a1a1a] font-semibold">Latência (ms)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600" />
              <span className="text-emerald-800 font-semibold">Acurácia</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-amber-800 font-semibold">Drift Score</span>
            </div>
          </div>
        </div>

        {chartMetrics.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-[#7a766c] border-2 border-dashed border-[#e6e4df] rounded-xl">
            <Activity className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-semibold">Nenhuma métrica disponível</p>
            <p className="text-xs mt-1">Selecione um modelo ou atualize as métricas para gerar o gráfico</p>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#666257" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" stroke="#666257" fontSize={11} tickLine={false} unit="ms" />
              <YAxis yAxisId="right" orientation="right" stroke="#666257" fontSize={11} tickLine={false} domain={[0, 1]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e6e4df",
                  borderRadius: "12px",
                  color: "#1a1a1a",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  fontSize: "12px"
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="latency"
                name="Latência (ms)"
                stroke="#1a1a1a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#1a1a1a" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                name="Acurácia"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: "#10b981" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="drift"
                name="Drift Score"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#f59e0b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* Audit Violations Table */}
      <div className="bg-[#ffffff] border border-[#e6e4df] p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6e4df] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              Audit Log de Alertas & Violações
            </h3>
            <p className="text-xs text-[#666257]">
              Registros detalhados de alucinações, estouro de latência e desvios de política
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#555249] font-medium">Gravidade:</span>
            <select
              value={severityFilter}
              onChange={(e) => handleSeverityChange(e.target.value)}
              className="bg-[#faf9f6] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl px-3 py-1.5 focus:outline-none"
              aria-label="Filtrar por gravidade"
            >
              <option value="ALL">Todas</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#7a766c]">
            <ShieldAlert className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">Nenhum evento encontrado</p>
            <p className="text-xs mt-1">
              {severityFilter !== "ALL"
                ? "Nenhum registro com a gravidade selecionada. Tente um filtro diferente."
                : "Nenhuma violação ou alerta registrado para este modelo."}
            </p>
          </div>
        ) : (
          <>
            {/* Record count */}
            <div className="flex items-center justify-between text-xs text-[#666257]">
              <span>
                Exibindo {(safePage - 1) * pageSize + 1}&ndash;{Math.min(safePage * pageSize, filteredLogs.length)} de{' '}
                <strong className="text-[#1a1a1a]">{filteredLogs.length}</strong> registro{filteredLogs.length !== 1 ? 's' : ''}
              </span>
              {totalPages > 1 && (
                <span className="text-[10px] font-mono text-[#7a766c]">
                  Página {safePage} de {totalPages}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1a1a1a]">
                <thead className="bg-[#f5f4f0] text-[#7a766c] uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-lg">ID / Data</th>
                    <th className="p-3">Modelo</th>
                    <th className="p-3">Tipo de Evento</th>
                    <th className="p-3">Gravidade</th>
                    <th className="p-3">Detalhes do Incidente</th>
                    <th className="p-3 text-right rounded-r-lg">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e4df]">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f5f4f0]/80 transition-colors">
                      <td className="p-3 font-mono">
                        <p className="text-[#1a1a1a] font-semibold">{log.id}</p>
                        <p className="text-[10px] text-[#666257]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="p-3 font-medium text-[#1a1a1a]">{log.modelName}</td>
                      <td className="p-3 font-semibold text-[#1a1a1a]">{log.type}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                            log.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : log.severity === "HIGH"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-sky-100 text-sky-800 border border-sky-200"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-[#555249]" title={log.details}>
                        {log.details}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedLogModal(log)}
                          className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-lg font-medium inline-flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          Inspecionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-[#e6e4df]">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e6e4df] bg-[#faf9f6] text-[#1a1a1a] hover:bg-[#f0eee9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &larr; Anterior
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] h-7 text-xs font-semibold rounded-lg transition-colors ${
                        page === safePage
                          ? "bg-[#1a1a1a] text-white shadow-sm"
                          : "bg-[#faf9f6] text-[#555249] hover:bg-[#f0eee9] border border-[#e6e4df]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e6e4df] bg-[#faf9f6] text-[#1a1a1a] hover:bg-[#f0eee9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próximo &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e6e4df] w-full max-w-xl rounded-2xl p-6 shadow-2xl relative space-y-4 text-[#1a1a1a]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e4df]">
              <div>
                <span className="text-[10px] font-mono font-semibold text-[#1a1a1a] uppercase">
                  Inspeção de Audit Log
                </span>
                <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial">{selectedLogModal.id} — {selectedLogModal.type}</h3>
              </div>
              <button
                onClick={() => setSelectedLogModal(null)}
                className="text-[#666257] hover:text-[#1a1a1a] p-1 rounded-lg"
                aria-label="Fechar inspeção"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df]">
                <p className="text-[#666257] font-semibold mb-1">Descrição do Ocorrido:</p>
                <p className="text-[#1a1a1a]">{selectedLogModal.details}</p>
              </div>

              <div>
                <p className="text-[#666257] font-semibold mb-1">Amostra do Prompt Enviado:</p>
                <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df] font-mono text-[#1a1a1a] text-[11px]">
                  {selectedLogModal.promptSample}
                </div>
              </div>

              <div>
                <p className="text-[#666257] font-semibold mb-1">Resposta Gerada pelo Modelo:</p>
                <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df] font-mono text-rose-800 text-[11px]">
                  {selectedLogModal.responseSample}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e6e4df] flex justify-end">
              <button
                onClick={() => setSelectedLogModal(null)}
                className="px-4 py-2 bg-[#1a1a1a] text-white font-semibold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
