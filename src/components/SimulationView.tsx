import React, { useState, useEffect, useRef } from "react";
import {
  PlaySquare,
  Zap,
  Sliders,
  FileText,
  BarChart2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Trophy,
  DollarSign,
  Cpu
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { ModelRegistry, SimulationScenario, SimulationVariant, McpServerConfig } from "../types";
import { callMCPTool } from "../lib/api";

interface SimulationViewProps {
  models: ModelRegistry[];
  simulations: SimulationScenario[];
  config: McpServerConfig;
  onRefresh: () => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  models,
  simulations,
  config,
  onRefresh
}) => {
  const [simName, setSimName] = useState("Simulação de Redução de Alucinações");
  const [datasetName, setDatasetName] = useState("dataset_contratos_2026.csv");

  // Variant A State
  const [varAName, setVarAName] = useState("Variante A (Controle)");
  const [varAModelId, setVarAModelId] = useState<string>(models[0]?.id || "model-ollama-granite");
  const [varATemp, setVarATemp] = useState<number>(0.2);
  const [varAPrompt, setVarAPrompt] = useState<string>(
    "Você é um auditor de contratos rigoroso."
  );

  // Variant B State
  const [varBName, setVarBName] = useState("Variante B (Teste)");
  const [varBModelId, setVarBModelId] = useState<string>(models[0]?.id || "model-ollama-granite");
  const [varBTemp, setVarBTemp] = useState<number>(0.7);
  const [varBPrompt, setVarBPrompt] = useState<string>(
    "Você é um auditor especialista em compliance financeiro. Destaque cláusulas de risco e responda estritamente com dados do documento."
  );

  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (activeSimulationId) {
      const activeSim = simulations.find(s => s.id === activeSimulationId);
      if (activeSim && (activeSim.status === "COMPLETED" || activeSim.status === "FAILED")) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setIsSimulating(false);
        setActiveSimulationId(null);
      }
    }
  }, [simulations, activeSimulationId]);

  // Preset prompt quick load helper
  const applyPresetPrompt = (type: "hallucination" | "json" | "cot") => {
    if (type === "hallucination") {
      setVarAName("Variante A (Prompt Padrão)");
      setVarAPrompt("Resuma o contrato e liste as partes envolvidas.");
      setVarATemp(0.5);

      setVarBName("Variante B (Zero-Hallucination Strict)");
      setVarBPrompt("Você é um auditor de compliance legal. Analise o documento. Se a informação não constar expressamente no texto, diga 'NÃO INFORMADO'. Nunca invente cláusulas.");
      setVarBTemp(0.1);
    } else if (type === "json") {
      setVarAName("Variante A (Texto Livre)");
      setVarAPrompt("Extraia o valor, data e nome da empresa.");
      setVarATemp(0.4);

      setVarBName("Variante B (JSON Schema Guard)");
      setVarBPrompt("Retorne estritamente um JSON valido com a estrutura: {\"valor_total\": float, \"data_vencimento\": string, \"contratada\": string}. Sem texto introdutório.");
      setVarBTemp(0.0);
    } else if (type === "cot") {
      setVarAName("Variante A (Direto)");
      setVarAPrompt("Classifique a gravidade deste incidente de sistema.");
      setVarATemp(0.3);

      setVarBName("Variante B (Chain of Thought)");
      setVarBPrompt("Pense passo a passo: 1) Analise os erros no log, 2) Identifique serviços afetados, 3) Avalie impacto no usuário, 4) Conclua com a gravidade de 1 a 5.");
      setVarBTemp(0.2);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);

    const modelA = models.find(m => m.id === varAModelId);
    const modelB = models.find(m => m.id === varBModelId);

    const payloadVariants = [
      {
        name: varAName,
        params: [
          { key: "judge_model", value: varAModelId },
          { key: "temperature", value: varATemp.toString() },
          { key: "system_prompt", value: varAPrompt },
          { key: "llm_url", value: modelA?.endpointUrl || "" },
          { key: "cost_per_token", value: ((modelA?.costPerMillionTokens ?? 0) / 1_000_000).toString() }
        ]
      },
      {
        name: varBName,
        params: [
          { key: "judge_model", value: varBModelId },
          { key: "temperature", value: varBTemp.toString() },
          { key: "system_prompt", value: varBPrompt },
          { key: "llm_url", value: modelB?.endpointUrl || "" },
          { key: "cost_per_token", value: ((modelB?.costPerMillionTokens ?? 0) / 1_000_000).toString() }
        ]
      }
    ];

    try {
      const res = await callMCPTool<{ simulation_id: string; status: string }>(
        config.simulationPort,
        "simulate",
        {
          name: simName,
          dataset_name: datasetName,
          variants: payloadVariants
        },
        config.token,
        config
      );

      setActiveSimulationId(res.simulation_id);
      onRefresh();

      // Poll until done — max 60s (30 × 2s)
      let ticks = 0;
      pollRef.current = setInterval(() => {
        onRefresh();
        if (++ticks >= 30) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsSimulating(false);
        }
      }, 2000);
    } catch (err) {
      console.error("Erro ao disparar simulação:", err);
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#f5f4f0] border border-[#e6e4df] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2.5">
            <PlaySquare className="w-5 h-5 text-[#1a1a1a]" />
            Simulações & Backtesting <span className="italic font-normal text-[#555249]">(A/B Testing)</span>
          </h2>
          <p className="text-xs text-[#666257] mt-1">
            Compare variantes de prompt e hiperparâmetros lado a lado no uRag Simulation (:8088)
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666257] font-semibold hidden lg:inline">Templates:</span>
          <button
            type="button"
            onClick={() => applyPresetPrompt("hallucination")}
            className="px-2.5 py-1.5 bg-[#ffffff] hover:bg-[#eae8e1] border border-[#e6e4df] text-xs text-[#1a1a1a] font-medium rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3 h-3 text-[#1a1a1a]" />
            Anti-Alucinação
          </button>
          <button
            type="button"
            onClick={() => applyPresetPrompt("json")}
            className="px-2.5 py-1.5 bg-[#ffffff] hover:bg-[#eae8e1] border border-[#e6e4df] text-xs text-emerald-800 font-medium rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
          >
            <Layers className="w-3 h-3 text-emerald-700" />
            JSON Estrito
          </button>
          <button
            type="button"
            onClick={() => applyPresetPrompt("cot")}
            className="px-2.5 py-1.5 bg-[#ffffff] hover:bg-[#eae8e1] border border-[#e6e4df] text-xs text-purple-900 font-medium rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
          >
            <BarChart2 className="w-3 h-3 text-purple-800" />
            Chain-of-Thought
          </button>
        </div>
      </div>

      {/* Main Simulation Builder Form */}
      <form onSubmit={handleRunSimulation} className="bg-[#ffffff] border border-[#e6e4df] p-6 rounded-2xl space-y-6 shadow-xs">
        {/* Basic Scenario Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#e6e4df]">
          <div>
            <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Nome do Cenário de Simulação</label>
            <input
              type="text"
              required
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="Ex: Simulação de Redução de Alucinações"
              className="w-full bg-[#faf9f6] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#1a1a1a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Dataset de Teste (Backtest)</label>
            <select
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#e6e4df] font-mono text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#1a1a1a]"
            >
              <option value="dataset_contratos_2026.csv">dataset_contratos_2026.csv (50 amostras)</option>
              <option value="dataset_k8s_incidentes_v2.json">dataset_k8s_incidentes_v2.json (120 logs)</option>
              <option value="dataset_suporte_tecnico.csv">dataset_suporte_tecnico.csv (200 chamados)</option>
            </select>
          </div>
        </div>

        {/* Side-by-Side Prompt Variants A vs B */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variant A (Control) */}
          <div className="bg-[#f5f4f0] border border-[#e6e4df] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e6e4df] pb-3">
              <span className="px-2.5 py-1 bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold font-mono rounded-lg">
                Variante A (Controle)
              </span>
              <span className="text-[11px] text-[#666257]">Configuração Baseline</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Nome da Variante</label>
              <input
                type="text"
                required
                value={varAName}
                onChange={(e) => setVarAName(e.target.value)}
                className="w-full bg-[#ffffff] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Modelo de LLM</label>
                <select
                  value={varAModelId}
                  onChange={(e) => setVarAModelId(e.target.value)}
                  className="w-full bg-[#ffffff] border border-[#e6e4df] text-[#1a1a1a] text-xs font-mono rounded-xl p-2 focus:outline-none"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-[#1a1a1a]">Temperatura</label>
                  <span className="text-xs font-mono text-[#1a1a1a] font-bold">{varATemp}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={varATemp}
                  onChange={(e) => setVarATemp(parseFloat(e.target.value))}
                  className="w-full accent-[#1a1a1a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">System Prompt (Variante A)</label>
              <textarea
                rows={4}
                required
                value={varAPrompt}
                onChange={(e) => setVarAPrompt(e.target.value)}
                className="w-full bg-[#ffffff] border border-[#e6e4df] font-mono text-xs text-[#1a1a1a] p-3 rounded-xl focus:outline-none focus:border-[#1a1a1a] leading-relaxed resize-none"
              />
              <span className="text-[10px] text-[#666257] float-right mt-1">{varAPrompt.length} caracteres</span>
            </div>
          </div>

          {/* Variant B (Test) */}
          <div className="bg-[#ffffff] border-2 border-[#1a1a1a] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e6e4df] pb-3">
              <span className="px-2.5 py-1 bg-[#1a1a1a] text-white text-xs font-bold font-mono rounded-lg">
                Variante B (Candidato Teste)
              </span>
              <span className="text-[11px] text-[#1a1a1a] font-semibold">Prompt Otimizado</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Nome da Variante</label>
              <input
                type="text"
                required
                value={varBName}
                onChange={(e) => setVarBName(e.target.value)}
                className="w-full bg-[#f5f4f0] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Modelo de LLM</label>
                <select
                  value={varBModelId}
                  onChange={(e) => setVarBModelId(e.target.value)}
                  className="w-full bg-[#f5f4f0] border border-[#e6e4df] text-[#1a1a1a] text-xs font-mono rounded-xl p-2 focus:outline-none"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-[#1a1a1a]">Temperatura</label>
                  <span className="text-xs font-mono text-[#1a1a1a] font-bold">{varBTemp}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={varBTemp}
                  onChange={(e) => setVarBTemp(parseFloat(e.target.value))}
                  className="w-full accent-[#1a1a1a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">System Prompt (Variante B)</label>
              <textarea
                rows={4}
                required
                value={varBPrompt}
                onChange={(e) => setVarBPrompt(e.target.value)}
                className="w-full bg-[#f5f4f0] border border-[#e6e4df] font-mono text-xs text-[#1a1a1a] p-3 rounded-xl focus:outline-none focus:border-[#1a1a1a] leading-relaxed resize-none"
              />
              <span className="text-[10px] text-[#666257] float-right mt-1">{varBPrompt.length} caracteres</span>
            </div>
          </div>
        </div>

        {/* Submit Execution Trigger */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e6e4df]">
          <div className="text-xs text-[#666257] flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>O backtest executará chamadas sequenciais e calculará custo x acurácia.</span>
          </div>

          <button
            type="submit"
            disabled={isSimulating}
            className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#333333] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Simulando via MCP...
              </>
            ) : (
              <>
                <PlaySquare className="w-4 h-4" />
                Disparar Simulação (simulate)
              </>
            )}
          </button>
        </div>
      </form>

      {/* Historical Simulations & Results */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#1a1a1a]" />
          Histórico de Simulações e Resultados A/B
        </h3>

        <div className="space-y-4">
          {simulations.map((sim) => {
            const isCompleted = sim.status === "COMPLETED";
            const isRunning = sim.status === "RUNNING";

            // Prepare chart data for completed simulation
            const chartData = isCompleted && sim.results ? [
              {
                metric: "Acurácia (%)",
                "Variante A": +(sim.results.accuracyA * 100).toFixed(1),
                "Variante B": +(sim.results.accuracyB * 100).toFixed(1)
              },
              {
                metric: "Custo (USD x100)",
                "Variante A": +(sim.results.costA * 100).toFixed(2),
                "Variante B": +(sim.results.costB * 100).toFixed(2)
              }
            ] : [];

            return (
              <div
                key={sim.id}
                className="bg-[#ffffff] border border-[#e6e4df] p-5 rounded-2xl space-y-4 shadow-xs"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e6e4df] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#666257]">{sim.id}</span>
                      <h4 className="text-base font-bold text-[#1a1a1a] font-serif-editorial">{sim.name}</h4>
                    </div>
                    <p className="text-xs text-[#555249] font-mono mt-0.5">Dataset: {sim.datasetName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full font-mono flex items-center gap-1.5 ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isRunning
                          ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isRunning && <Clock className="w-3 h-3 animate-spin" />}
                      {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-800" />}
                      {sim.status}
                    </span>
                  </div>
                </div>

                {/* Running state loader bar */}
                {isRunning && (
                  <div className="bg-[#f5f4f0] p-4 rounded-xl border border-[#e6e4df] space-y-2">
                    <div className="flex justify-between text-xs text-[#555249]">
                      <span>Executando avaliação de respostas do dataset...</span>
                      <span className="font-mono text-[#1a1a1a] font-bold">{sim.progress || 45}%</span>
                    </div>
                    <div className="w-full bg-[#e6e4df] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1a1a1a] h-full rounded-full transition-all duration-300"
                        style={{ width: `${sim.progress || 45}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Completed Results Breakdown */}
                {isCompleted && sim.results && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                    {/* Key Metrics Comparison */}
                    <div className="space-y-3">
                      {/* Winner highlight badge */}
                      {sim.results.winner && (
                        <div className="bg-[#f5f4f0] border border-[#e6e4df] p-3 rounded-xl flex items-center gap-3">
                          <Trophy className="w-6 h-6 text-amber-700 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-wider text-[#666257] font-bold">
                              Vencedora do A/B Test
                            </p>
                            <p className="text-xs font-bold text-[#1a1a1a]">{sim.results.winner}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-[#f5f4f0] p-3.5 rounded-xl border border-[#e6e4df] space-y-2 text-xs">
                        <p className="font-semibold text-[#1a1a1a] mb-1">Métricas da Variante A (Controle):</p>
                        <div className="flex justify-between text-[#555249]">
                          <span>Acurácia:</span>
                          <span className="font-mono text-[#1a1a1a] font-bold">
                            {(sim.results.accuracyA * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-[#555249]">
                          <span>Custo Estimado:</span>
                          <span className="font-mono text-emerald-800 font-bold">
                            ${sim.results.costA.toFixed(3)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#ffffff] p-3.5 rounded-xl border-2 border-[#1a1a1a] space-y-2 text-xs">
                        <p className="font-semibold text-[#1a1a1a] mb-1">Métricas da Variante B (Teste):</p>
                        <div className="flex justify-between text-[#555249]">
                          <span>Acurácia:</span>
                          <span className="font-mono text-[#1a1a1a] font-bold">
                            {(sim.results.accuracyB * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-[#555249]">
                          <span>Custo Estimado:</span>
                          <span className="font-mono text-emerald-800 font-bold">
                            ${sim.results.costB.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Comparative Recharts Bar Chart */}
                    <div className="lg:col-span-2 bg-[#f5f4f0] border border-[#e6e4df] p-4 rounded-xl flex flex-col justify-between">
                      <p className="text-xs font-semibold text-[#1a1a1a] mb-2">
                        Gráfico Comparativo de Acurácia (%) e Custo Relativo
                      </p>

                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e4df" vertical={false} />
                            <XAxis dataKey="metric" stroke="#666257" fontSize={11} />
                            <YAxis stroke="#666257" fontSize={11} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#ffffff",
                                borderColor: "#e6e4df",
                                borderRadius: "12px",
                                fontSize: "12px",
                                color: "#1a1a1a"
                              }}
                            />
                            <Bar dataKey="Variante A" fill="#4b5563" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Variante B" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {sim.results.summaryNotes && (
                        <p className="text-[11px] text-[#555249] mt-2 bg-[#ffffff] p-2 rounded border border-[#e6e4df]">
                          💡 <span className="font-semibold text-[#1a1a1a]">Conclusão:</span> {sim.results.summaryNotes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
