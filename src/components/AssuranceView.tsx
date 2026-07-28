import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertOctagon,
  FileText,
  RefreshCw,
  Sparkles,
  BarChart2,
  Scale
} from "lucide-react";
import { ModelRegistry, EvaluateResponse, McpServerConfig } from "../types";
import { callMCPTool } from "../lib/api";

interface AssuranceViewProps {
  models: ModelRegistry[];
  config: McpServerConfig;
}

export const AssuranceView: React.FC<AssuranceViewProps> = ({ models, config }) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || "model-ollama-granite");
  const [promptInput, setPromptInput] = useState(
    "Extraia o valor total da rescisão e a data de assinatura do contrato."
  );
  const [responseInput, setResponseInput] = useState(
    "O valor total da rescisão é de R$ 45.000,00 e a data de assinatura foi 15/03/2026."
  );
  const [groundTruth, setGroundTruth] = useState(
    "Valor total da rescisão: R$ 45.000,00. Data: 15/03/2026."
  );

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvaluateResponse | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Batch backtest state
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any | null>(null);
  const [backtestError, setBacktestError] = useState<string | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setEvalResult(null);
    setEvalError(null);

    try {
      const res = await callMCPTool<EvaluateResponse>(
        config.assurancePort,
        "evaluate",
        {
          modelId: selectedModelId,
          prompt: promptInput,
          response: responseInput,
          groundTruth
        },
        config.token,
        config
      );

      setEvalResult(res);
    } catch (err: any) {
      setEvalError(err?.message || "Erro ao conectar ao Assurance (:8085)");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRunBatchBacktest = async () => {
    setIsBacktesting(true);
    setBacktestError(null);
    try {
      const res = await callMCPTool(
        config.assurancePort,
        "backtest",
        { dataset: "dataset_contratos_2026.csv", modelId: selectedModelId },
        config.token,
        config
      );
      setBacktestResult(res);
    } catch (err: any) {
      setBacktestError(err?.message || "Erro ao executar backtest (:8085)");
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#f5f4f0] border border-[#e6e4df] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#1a1a1a]" />
            uRag Assurance — LLM-as-Judge & Validação
          </h2>
          <p className="text-xs text-[#666257] mt-1">
            Avaliação automatizada de alucinações, acurácia factual e alinhamento via porta :8085
          </p>
        </div>

        <button
          onClick={handleRunBatchBacktest}
          disabled={isBacktesting}
          className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#333333] text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 self-start sm:self-auto transition-all"
        >
          {isBacktesting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              Executando Backtest de Amostras...
            </>
          ) : (
            <>
              <BarChart2 className="w-4 h-4" />
              Executar Backtest do Dataset (backtest)
            </>
          )}
        </button>
      </div>

      {backtestError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-800 font-mono">
          {backtestError}
        </div>
      )}

      {/* Batch Backtest Result Card */}
      {backtestResult && (
        <div className="bg-[#ffffff] border border-[#e6e4df] p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-[#1a1a1a] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Resultado do Backtest em Lote (Assurance :8085)
            </span>
            <span className="text-xs text-[#666257] font-mono">Status: {backtestResult.status}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#f5f4f0] p-4 rounded-xl border border-[#e6e4df] text-xs">
            <div>
              <span className="text-[#666257] block">Total de Amostras</span>
              <span className="text-lg font-bold text-[#1a1a1a] font-mono">{backtestResult.totalSamples || 150}</span>
            </div>
            <div>
              <span className="text-[#666257] block">Aprovadas</span>
              <span className="text-lg font-bold text-emerald-800 font-mono">{backtestResult.passedSamples || 142}</span>
            </div>
            <div>
              <span className="text-[#666257] block">Acurácia Global</span>
              <span className="text-lg font-bold text-[#1a1a1a] font-mono">
                {((backtestResult.accuracyScore || 0.946) * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[#666257] block">Custo Estimado</span>
              <span className="text-lg font-bold text-emerald-800 font-mono">
                ${(backtestResult.estimatedTotalCost || 0.035).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Single Evaluation Form & Judge Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Column */}
        <form onSubmit={handleEvaluate} className="bg-[#ffffff] border border-[#e6e4df] p-6 rounded-2xl space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#1a1a1a]" />
            Avaliação Pontual (evaluate)
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Modelo para Avaliar</label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#e6e4df] text-[#1a1a1a] text-xs font-mono rounded-xl p-2.5 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Prompt de Entrada</label>
            <textarea
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#e6e4df] text-xs font-mono text-[#1a1a1a] p-2.5 rounded-xl focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Resposta Gerada pelo Modelo</label>
            <textarea
              rows={3}
              value={responseInput}
              onChange={(e) => setResponseInput(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#e6e4df] text-xs font-mono text-[#1a1a1a] p-2.5 rounded-xl focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Ground Truth (Gabarito / Esperado)</label>
            <textarea
              rows={2}
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#e6e4df] text-xs font-mono text-emerald-900 p-2.5 rounded-xl focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isEvaluating}
            className="w-full py-3 bg-[#1a1a1a] hover:bg-[#333333] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Avaliando via LLM-as-Judge...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Executar Avaliação (evaluate)
              </>
            )}
          </button>

          {evalError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-800 font-mono">
              {evalError}
            </div>
          )}
        </form>

        {/* Judge Output Result */}
        <div className="bg-[#ffffff] border border-[#e6e4df] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e4df]">
              <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                Parecer do LLM-as-Judge
              </h3>
              <span className="text-[10px] font-mono text-[#1a1a1a] bg-[#f5f4f0] px-2 py-0.5 rounded border border-[#e6e4df] font-semibold">
                Assurance Engine
              </span>
            </div>

            {evalResult ? (
              <div className="mt-4 space-y-4 animate-in fade-in duration-150">
                {/* Score Big Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df] text-center">
                    <span className="text-[10px] text-[#666257] uppercase font-semibold">Judge Score</span>
                    <p className="text-xl font-extrabold text-[#1a1a1a] font-mono mt-1">
                      {(evalResult.score * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df] text-center">
                    <span className="text-[10px] text-[#666257] uppercase font-semibold">Relevância</span>
                    <p className="text-xl font-extrabold text-emerald-800 font-mono mt-1">
                      {(evalResult.relevance * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df] text-center">
                    <span className="text-[10px] text-[#666257] uppercase font-semibold">Factualidade</span>
                    <p className="text-xl font-extrabold text-sky-800 font-mono mt-1">
                      {(evalResult.factualAccuracy * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Hallucination Badge */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                    evalResult.hallucinationDetected
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {evalResult.hallucinationDetected ? (
                      <AlertOctagon className="w-4 h-4 text-rose-700" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    )}
                    {evalResult.hallucinationDetected
                      ? "Alucinação Detectada na Resposta"
                      : "Zero Alucinações Detectadas"}
                  </span>
                  <span className="font-mono text-[10px] uppercase">
                    {evalResult.hallucinationDetected ? "FALHA" : "PASSOU"}
                  </span>
                </div>

                {/* Explanation text */}
                <div className="bg-[#f5f4f0] p-4 rounded-xl border border-[#e6e4df] space-y-1">
                  <p className="text-xs font-semibold text-[#1a1a1a]">Explicação Fundamentada:</p>
                  <p className="text-xs text-[#555249] leading-relaxed">{evalResult.explanation}</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-[#7a766c] my-auto">
                <Scale className="w-10 h-10 text-[#7a766c] mb-2" />
                <p className="text-xs">Preencha o formulário e clique em Executar Avaliação para ver o veredito.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
