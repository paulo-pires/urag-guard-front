import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Settings,
  Info,
  ChevronDown,
  Eye,
} from "lucide-react";
import { api } from "../lib/api";
import { EvalConfig } from "../types";

const sourceOptions = ["proxy", "uRag-go", "uRag-agent-go", "uRag-workflow-go", "uRag-gateway-go"];

const promptTemplates: Record<string, string> = {
  faithfulness: `You are an expert evaluator assessing whether the generated answer is faithful to the provided context. Your task is to check if the answer contains any facts, statements, or claims that are NOT supported by the retrieved context.

<Rubric>
A response is faithful (no hallucinations) if:
- All claims made can be verified by the context text.
- It does not contain unsupported assumptions.
- It does not present speculations as facts.
</Rubric>

<Instructions>
1. Read the retrieved context carefully.
2. Read the generated answer.
3. Compare every claim in the answer to the context.
4. Flag as TRUE if any hallucination or unsupported claim is found, FALSE otherwise.
</Instructions>

<example>
<context>
{{context}}
</context>
<input>
{{input}}
</input>
<output>
{{output}}
</output>
</example>`,

  answer_relevancy: `You are an expert evaluator checking if the generated response is relevant and directly addresses the user's question.

<Rubric>
Relevancy criteria:
- Directly answers the core question.
- Avoids off-topic digressions.
- Does not contain redundant filler text.
</Rubric>

<Instructions>
1. Evaluate if the output addresses the input prompt.
2. Rate relevancy from 0.0 (completely irrelevant) to 1.0 (perfectly relevant).
</Instructions>

<example>
<input>
{{input}}
</input>
<output>
{{output}}
</output>
</example>`,

  context_recall: `You are an expert evaluator checking context recall. Assess if the retrieved context contains all necessary information to answer the reference question.

<Instructions>
Compare the context against the reference output (ground truth) to see if all crucial details are present.
</Instructions>

<example>
<context>
{{context}}
</context>
<reference_outputs>
{{referenceOutput}}
</reference_outputs>
</example>`,

  correctness: `Evaluate correctness of the generated response compared to the ground truth reference output.

<Instructions>
Determine if the model's output is factually correct relative to the gold standard reference output.
</Instructions>

<example>
<input>
{{input}}
</input>
<output>
{{output}}
</output>
<reference_outputs>
{{referenceOutput}}
</reference_outputs>
</example>`,

  conciseness: `Assess the conciseness of the generated response.

<Instructions>
Reward answers that are brief, precise, and contain no repetitive filler words.
</Instructions>

<example>
<input>
{{input}}
</input>
<output>
{{output}}
</output>
</example>`,

  custom: `Custom evaluation algorithm judge prompt.

<Instructions>
Perform assessment based on the custom criteria defined below.
</Instructions>

<example>
<input>
{{input}}
</input>
<output>
{{output}}
</output>
</example>`
};

export default function EvalConfigsView() {
  const [configs, setConfigs] = useState<EvalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedConfigId, setCopiedConfigId] = useState<string | null>(null);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EvalConfig | null>(null); // null means creating
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [metric, setMetric] = useState<EvalConfig["metric"]>("faithfulness");
  const [samplingRate, setSamplingRate] = useState<number>(100);
  const [thresholdWarn, setThresholdWarn] = useState<number>(0.8);
  const [thresholdFail, setThresholdFail] = useState<number>(0.6);
  const [enabled, setEnabled] = useState(true);
  const [scope, setScope] = useState<string[]>(["all"]);

  // LangSmith Specific States
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [strictMode, setStrictMode] = useState(true);
  const [responseFormat, setResponseFormat] = useState("Boolean");
  const [feedbackDescription, setFeedbackDescription] = useState("");

  // Delete Confirmation
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  const fetchConfigs = () => {
    setLoading(true);
    api
      .getEvalConfigs()
      .then((data) => {
        setConfigs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading eval configs:", err);
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Update prompt template and description when metric changes
  useEffect(() => {
    if (!editingConfig) {
      setPromptText(promptTemplates[metric] || "");
      if (metric === "faithfulness") {
        setFeedbackDescription("TRUE if output contains any hallucinations or unsupported claims. FALSE otherwise.");
        setResponseFormat("Boolean");
      } else if (metric === "answer_relevancy") {
        setFeedbackDescription("Rate the answer relevancy to user prompt from 0.0 to 1.0.");
        setResponseFormat("Score / Scale");
      } else if (metric === "context_recall") {
        setFeedbackDescription("Rate context recall from 0.0 to 1.0.");
        setResponseFormat("Score / Scale");
      } else if (metric === "correctness") {
        setFeedbackDescription("Rate response correctness from 0.0 to 1.0.");
        setResponseFormat("Score / Scale");
      } else if (metric === "conciseness") {
        setFeedbackDescription("TRUE if response is perfectly concise. FALSE otherwise.");
        setResponseFormat("Boolean");
      } else {
        setFeedbackDescription("TRUE if evaluation succeeds. FALSE otherwise.");
        setResponseFormat("Boolean");
      }
    }
  }, [metric, editingConfig]);

  const openEditModal = (config: EvalConfig) => {
    setEditingConfig(config);
    setName(config.name);
    setMetric(config.metric);
    setSamplingRate(config.sampling_rate);
    setThresholdWarn(config.threshold_warn);
    setThresholdFail(config.threshold_fail);
    setEnabled(config.enabled);
    setScope(config.scope);

    // LangSmith pre-filling
    setSelectedModel(config.config?.scoring_model || "gemini-2.5-flash");
    setPromptText(config.config?.prompt || promptTemplates[config.metric] || "");
    setIncludeReasoning(config.config?.include_reasoning ?? true);
    setStrictMode(config.config?.strict_mode ?? true);
    setResponseFormat(config.config?.response_format || (config.metric === "conciseness" || config.metric === "faithfulness" ? "Boolean" : "Score / Scale"));
    setFeedbackDescription(config.config?.description || (config.metric === "faithfulness" ? "TRUE if output contains hallucinations. FALSE otherwise." : "TRUE if evaluation succeeds. FALSE otherwise."));

    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingConfig(null);
    setName("");
    setMetric("faithfulness");
    setSamplingRate(100);
    setThresholdWarn(0.8);
    setThresholdFail(0.6);
    setEnabled(true);
    setScope(["all"]);

    // LangSmith default
    setSelectedModel("gemini-2.5-flash");
    setPromptText(promptTemplates["faithfulness"]);
    setIncludeReasoning(true);
    setStrictMode(true);
    setResponseFormat("Boolean");
    setFeedbackDescription("TRUE if output contains hallucinations. FALSE otherwise.");

    setIsModalOpen(true);
  };

  const handleDuplicate = (config: EvalConfig) => {
    const duplicated: Partial<EvalConfig> = {
      name: `${config.name} (Cópia)`,
      metric: config.metric,
      sampling_rate: config.sampling_rate,
      threshold_warn: config.threshold_warn,
      threshold_fail: config.threshold_fail,
      enabled: config.enabled,
      scope: [...config.scope],
    };

    setLoading(true);
    api
      .createEvalConfig(duplicated)
      .then(() => {
        fetchConfigs();
        setCopiedConfigId(config.id);
        setTimeout(() => setCopiedConfigId(null), 1500);
      })
      .catch((err) => {
        console.error("Error duplicating config:", err);
        setLoading(false);
      });
  };

  const handleToggleActive = (config: EvalConfig) => {
    const originalState = config.enabled;
    // optimistic update
    setConfigs(configs.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c)));

    api.updateEvalConfig(config.id, { enabled: !originalState }).catch((err) => {
      console.error("Failed to toggle config:", err);
      // revert on error
      setConfigs(configs.map((c) => (c.id === config.id ? { ...c, enabled: originalState } : c)));
    });
  };

  const handleDelete = (id: string) => {
    api
      .deleteEvalConfig(id)
      .then(() => {
        setConfigs(configs.filter((c) => c.id !== id));
        setConfigToDelete(null);
      })
      .catch((err) => console.error("Error deleting eval config:", err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    const configPayload: any = {
      scoring_model: selectedModel,
      prompt: promptText,
      include_reasoning: includeReasoning,
      strict_mode: strictMode,
      response_format: responseFormat,
      description: feedbackDescription,
    };

    const payload: Partial<EvalConfig> = {
      name,
      metric,
      sampling_rate: samplingRate,
      threshold_warn: thresholdWarn,
      threshold_fail: thresholdFail,
      enabled,
      scope,
      config: configPayload,
    };

    const apiPromise = editingConfig
      ? api.updateEvalConfig(editingConfig.id, payload)
      : api.createEvalConfig(payload);

    apiPromise
      .then(() => {
        fetchConfigs();
        setIsModalOpen(false);
        setIsSubmitting(false);
      })
      .catch((err) => {
        console.error("Error saving eval config:", err);
        setIsSubmitting(false);
      });
  };

  const handleScopeToggle = (sourceId: string) => {
    if (sourceId === "all") {
      setScope(["all"]);
    } else {
      let updated = scope.filter((s) => s !== "all");
      if (updated.includes(sourceId)) {
        updated = updated.filter((s) => s !== sourceId);
        if (updated.length === 0) updated = ["all"];
      } else {
        updated.push(sourceId);
      }
      setScope(updated);
    }
  };

  const metricLabels: Record<EvalConfig["metric"], string> = {
    faithfulness: "Fidelidade (Faithfulness)",
    answer_relevancy: "Relevância da Resposta",
    context_recall: "Recuperação de Contexto (Context Recall)",
    correctness: "Exatidão / Correctness",
    conciseness: "Concisão de Resposta",
    custom: "Algoritmo Customizado",
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2 font-serif italic">
            <Sparkles className="text-[#1a1a1a]" size={20} />
            Métricas de Avaliação Automatizada
          </h2>
          <p className="text-xs text-[#6e6d68]">
            Configure métricas estatísticas de qualidade para avaliar as respostas geradas por IA contra contextos recuperados do RAG.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a1a1a] text-white hover:bg-[#2e2e2e] rounded-md text-xs font-medium transition-colors shadow-xs"
        >
          <Plus size={14} />
          <span>Nova Config</span>
        </button>
      </div>

      {/* Grid of evaluations */}
      <div className="border border-[#e6e4df] rounded-lg bg-[#ffffff] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4df] text-[#6e6d68] bg-[#f5f4f0] font-mono text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Métrica</th>
                <th className="px-4 py-2.5 font-medium text-center">Amostragem (%)</th>
                <th className="px-4 py-2.5 font-medium text-right">Threshold Aviso</th>
                <th className="px-4 py-2.5 font-medium text-right">Threshold Falha</th>
                <th className="px-4 py-2.5 font-medium">Escopo de Fontes</th>
                <th className="px-4 py-2.5 font-medium text-center">Habilitada</th>
                <th className="px-4 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-[#e6e4df] animate-pulse">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-3 bg-[#f5f4f0] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : configs.length > 0 ? (
                configs.map((config) => (
                  <tr key={config.id} className="border-b border-[#e6e4df] even:bg-[#faf9f6] odd:bg-white hover:bg-[#f5f4f0]/60 text-[#1a1a1a] transition-colors">
                    <td className="px-4 py-2 font-medium text-[#1a1a1a] text-[11px]">
                      {config.name}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                        {metricLabels[config.metric] || config.metric}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-0.5 bg-[#f5f4f0] text-[#1a1a1a] border border-[#e6e4df] rounded font-mono text-[10px]">
                        {config.sampling_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold font-mono text-amber-700 text-[11px]">
                      {config.threshold_warn.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold font-mono text-red-700 text-[11px]">
                      {config.threshold_fail.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {config.scope.includes("all") ? (
                          <span className="px-1.5 py-0.5 bg-[#f5f4f0] text-[#6e6d68] text-[9px] rounded border border-[#e6e4df] font-mono">Todas</span>
                        ) : (
                          config.scope.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-[#f5f4f0] text-[#575652] text-[9px] rounded border border-[#e6e4df] font-mono">
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleToggleActive(config)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          config.enabled ? "bg-[#1a1a1a]" : "bg-[#e6e4df]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            config.enabled ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDuplicate(config)}
                          className="p-1 text-[#6e6d68] hover:text-[#1a1a1a] hover:bg-[#f5f4f0] rounded transition-colors"
                          title="Duplicar configuração"
                        >
                          {copiedConfigId === config.id ? (
                            <Check size={12} className="text-emerald-700" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(config)}
                          className="p-1 text-[#6e6d68] hover:text-[#1a1a1a] hover:bg-[#f5f4f0] rounded transition-colors"
                          title="Editar configuração"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setConfigToDelete(config.id)}
                          className="p-1 text-[#6e6d68] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir configuração"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#6e6d68]">
                    Nenhuma regra de avaliação criada. Clique em "Nova Config" para registrar uma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {configToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-[#e6e4df] bg-[#ffffff] p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-700 rounded-lg border border-red-200 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a1a]">Excluir Regra de Avaliação?</h4>
                <p className="text-xs text-[#6e6d68] mt-1 leading-normal">
                  Tem certeza que deseja apagar esta métrica de scoring automático? Esta operação interromperá os cálculos e estatísticas para as próximas execuções.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs font-semibold pt-1">
              <button
                onClick={() => setConfigToDelete(null)}
                className="px-3.5 py-1.5 border border-[#e6e4df] hover:bg-[#f5f4f0] text-[#1a1a1a] rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(configToDelete)}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-4xl rounded-xl border border-[#e6e4df] bg-[#ffffff] shadow-2xl overflow-hidden my-4">
            
            {/* LangSmith Style Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#e6e4df] bg-[#f5f4f0]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-[#6e6d68] text-[11px] font-mono tracking-wider uppercase">
                  <span>Configure Evaluator</span>
                  <span className="text-[#8e8d87] font-sans text-xs">»</span>
                  <span className="text-[#1a1a1a] font-semibold lowercase font-sans text-xs">
                    {editingConfig ? `editar: ${editingConfig.name}` : "nova_configuracao"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded hover:bg-[#e6e4df] text-[#6e6d68] hover:text-[#1a1a1a] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[85vh] overflow-y-auto bg-[#ffffff]">
              
              {/* Application and Basic Config Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start p-4 rounded-lg bg-[#faf9f6] border border-[#e6e4df]">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Application Link</label>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#ffffff] border border-[#e6e4df] rounded text-[#575652] font-mono text-[11px]">
                    <span>No application</span>
                    <ChevronDown size={12} className="text-[#8e8d87]" />
                  </div>
                  <p className="text-[9px] text-[#8e8d87]">Link to a deployment or gateway source.</p>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Nome Amigável</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fidelidade RAG - Produção"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#ffffff] border border-[#e6e4df] focus:border-[#1a1a1a] rounded px-3 py-1.5 text-[#1a1a1a] font-medium focus:outline-none transition-colors"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Métrica Estatística</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as any)}
                    className="w-full bg-[#ffffff] border border-[#e6e4df] focus:border-[#1a1a1a] rounded px-2.5 py-1.5 text-[#1a1a1a] focus:outline-none cursor-pointer transition-colors"
                  >
                    <option value="faithfulness">Fidelidade RAG (Faithfulness)</option>
                    <option value="answer_relevancy">Relevância de Resposta (Answer Relevancy)</option>
                    <option value="context_recall">Recuperação de Contexto (Context Recall)</option>
                    <option value="correctness">Acurácia / Exatidão (Correctness)</option>
                    <option value="conciseness">Concisão (Evita redundâncias)</option>
                    <option value="custom">Algoritmo Customizado</option>
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Taxa de Amostragem</label>
                  <div className="flex items-center gap-2 bg-[#ffffff] border border-[#e6e4df] rounded px-3 py-1">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={samplingRate}
                      onChange={(e) => setSamplingRate(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                      className="w-full bg-transparent text-[#1a1a1a] font-mono focus:outline-none"
                    />
                    <span className="text-[#6e6d68]">%</span>
                  </div>
                </div>
              </div>

              {/* SECTION: Prompt & Model */}
              <div className="border border-[#e6e4df] rounded-lg p-5 bg-[#faf9f6] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6e4df] pb-3">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-[#1a1a1a] text-xs flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#1a1a1a]" />
                      Prompt &amp; Model
                    </h4>
                    <p className="text-[10px] text-[#6e6d68]">Create your evaluator by defining the criteria you want to evaluate in your prompt.</p>
                  </div>
                  
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    {/* Model selector dropdown */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ffffff] border border-[#e6e4df] rounded">
                      <Settings size={11} className="text-[#6e6d68]" />
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-mono text-[#1a1a1a] focus:outline-none cursor-pointer"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        <option value="gpt-5.6-terra">gpt-5.6-terra</option>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                      </select>
                    </div>

                    {/* Preview toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#6e6d68] uppercase font-semibold tracking-wider">Preview</span>
                      <button
                        type="button"
                        onClick={() => setIsPreviewEnabled(!isPreviewEnabled)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isPreviewEnabled ? "bg-[#1a1a1a]" : "bg-[#e6e4df]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            isPreviewEnabled ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prompt Editor Interface */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 text-[#6e6d68]">
                      <span className="font-semibold text-[#1a1a1a]">Prompt editor</span>
                      <span>•</span>
                      <span>Type {"{{"} to create a mapped variable.</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#f5f4f0] text-[#1a1a1a] font-mono text-[9px] border border-[#e6e4df]">Default</span>
                      <span className="px-1.5 py-0.5 rounded bg-transparent text-[#6e6d68] font-mono text-[9px]">Mustache</span>
                    </div>
                  </div>

                  {/* Chat Message Styled Container */}
                  <div className="border border-[#e6e4df] rounded-lg overflow-hidden bg-[#ffffff]">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#e6e4df] bg-[#f5f4f0]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#1a1a1a] font-mono uppercase px-1.5 py-0.5 bg-[#ffffff] border border-[#e6e4df] rounded">
                          Human
                        </span>
                        <span className="text-[10px] text-[#6e6d68]">» Chat message instruction</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#6e6d68]">
                        <button type="button" className="p-1 hover:text-[#1a1a1a] transition-colors"><Copy size={11} /></button>
                        <button type="button" className="p-1 hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </div>

                    {isPreviewEnabled ? (
                      <div className="p-4 bg-[#faf9f6]">
                        <div className="text-[10px] text-[#6e6d68] font-bold mb-1.5 uppercase tracking-wider">Interpolated Preview</div>
                        <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e6e4df] font-mono text-[11px] text-[#1a1a1a] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                          {promptText
                            .replace("{{input}}", `"Qual o faturamento da rivalcorp em 2025?"`)
                            .replace("{{output}}", `"O faturamento estimado é de R$ 45M de acordo com relatórios internos."`)
                            .replace("{{context}}", `"Relatório Financeiro 2025: Faturamento total atingiu R$ 45M, superando as metas de R$ 40M estabelecidas."`)
                            .replace("{{referenceOutput}}", `"Faturamento de R$ 45 milhões em 2025."`)}
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="Write evaluation prompt instructions..."
                        className="w-full bg-[#ffffff] p-4 font-mono text-[11px] text-[#1a1a1a] placeholder-[#8e8d87] leading-relaxed min-h-[160px] focus:outline-none resize-y"
                      />
                    )}
                  </div>

                  {/* Variable Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] text-[#6e6d68] uppercase tracking-wider font-bold">Mapped inputs:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-mono text-[9px]">
                      <span>input</span>
                      <span className="text-[8px] cursor-pointer hover:text-amber-900">×</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-mono text-[9px]">
                      <span>output</span>
                      <span className="text-[8px] cursor-pointer hover:text-amber-900">×</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-mono text-[9px]">
                      <span>context</span>
                      <span className="text-[8px] cursor-pointer hover:text-amber-900">×</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#e6e4df] bg-[#f5f4f0] text-[#6e6d68] font-mono text-[9px]">
                      <span>referenceOutput</span>
                      <span className="text-[8px] cursor-pointer hover:text-[#1a1a1a]">×</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="mt-2 text-[10px] text-[#575652] font-semibold px-2.5 py-1 rounded border border-[#e6e4df] bg-[#ffffff] hover:bg-[#f5f4f0] hover:text-[#1a1a1a] transition-colors cursor-pointer"
                  >
                    + Message
                  </button>
                </div>
              </div>

              {/* Threshold Parameters Config */}
              <div className="p-5 rounded-lg border border-[#e6e4df] bg-[#faf9f6] space-y-4">
                <span className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider block border-b border-[#e6e4df] pb-2">Scoring Thresholds</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Warning Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[#575652] font-mono text-[10px]">
                      <span className="font-sans font-semibold">Limiar de Aviso (Warn)</span>
                      <span className="font-bold text-[#1a1a1a]">{thresholdWarn.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={thresholdWarn}
                      onChange={(e) => setThresholdWarn(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer text-amber-600"
                    />
                    <p className="text-[9px] text-[#8e8d87]">
                      Notas abaixo deste limiar disparam sinalizações amarelas nos relatórios do RAG.
                    </p>
                  </div>

                  {/* Failure Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[#575652] font-mono text-[10px]">
                      <span className="font-sans font-semibold">Limiar de Falha Grave (Fail)</span>
                      <span className="font-bold text-[#1a1a1a]">{thresholdFail.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={thresholdFail}
                      onChange={(e) => setThresholdFail(parseFloat(e.target.value))}
                      className="w-full accent-red-600 cursor-pointer text-red-600"
                    />
                    <p className="text-[9px] text-[#8e8d87]">
                      Notas abaixo deste limiar acusam erros graves de integridade ou exatidão da IA.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: Feedback configuration */}
              <div className="border border-[#e6e4df] rounded-lg p-5 bg-[#faf9f6] space-y-4">
                <div className="space-y-0.5 border-b border-[#e6e4df] pb-3">
                  <h4 className="font-bold text-[#1a1a1a] text-xs">Feedback configuration</h4>
                  <p className="text-[10px] text-[#6e6d68]">Define your evaluation criteria. Describe what you're measuring, then select a response format. This configuration structures how your evaluation results are returned.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Key Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#6e6d68] font-bold uppercase tracking-wider">Key:</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-mono text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {metric}
                      </span>
                    </div>

                    {/* Reasoning and Advanced */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[#575652] text-[10px]">
                        <input
                          type="checkbox"
                          checked={includeReasoning}
                          onChange={(e) => setIncludeReasoning(e.target.checked)}
                          className="rounded bg-[#ffffff] border-[#e6e4df] text-[#1a1a1a] accent-[#1a1a1a]"
                        />
                        <span className="font-semibold text-[#1a1a1a]">Include reasoning</span>
                        <Info size={11} className="text-[#8e8d87]" />
                      </label>
                      <button
                        type="button"
                        className="text-[10px] px-2 py-0.5 rounded border border-[#e6e4df] bg-[#ffffff] text-[#575652] hover:text-[#1a1a1a]"
                      >
                        Advanced
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Description text block */}
                    <div className="md:col-span-8 space-y-1.5">
                      <label className="text-[10px] text-[#6e6d68] uppercase tracking-wider font-bold">Description</label>
                      <textarea
                        value={feedbackDescription}
                        onChange={(e) => setFeedbackDescription(e.target.value)}
                        placeholder="TRUE if output contains hallucinations. FALSE otherwise."
                        className="w-full bg-[#ffffff] border border-[#e6e4df] focus:border-[#1a1a1a] rounded px-3 py-2 text-[#1a1a1a] focus:outline-none h-14"
                      />
                    </div>

                    {/* Response Format dropdown */}
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-[10px] text-[#6e6d68] uppercase tracking-wider font-bold">Response Format</label>
                      <select
                        value={responseFormat}
                        onChange={(e) => setResponseFormat(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e6e4df] focus:border-[#1a1a1a] rounded px-2.5 py-1.5 text-[#1a1a1a] focus:outline-none cursor-pointer"
                      >
                        <option value="Boolean">Boolean</option>
                        <option value="Score / Scale">Score / Scale</option>
                        <option value="Category">Category</option>
                      </select>
                    </div>
                  </div>

                  {/* Feedback Helper message box */}
                  <div className="px-3.5 py-2.5 bg-[#ffffff] border border-[#e6e4df] rounded text-[10px] text-[#6e6d68] font-mono">
                    {responseFormat === "Boolean" ? (
                      <span>The evaluator will provide a <strong>true (1)</strong> or <strong>false (0)</strong> response based on the feedback criteria.</span>
                    ) : responseFormat === "Score / Scale" ? (
                      <span>The evaluator will provide a <strong>numeric score between 0.0 and 1.0</strong> based on the feedback criteria.</span>
                    ) : (
                      <span>The evaluator will categorize the response based on custom output label structures.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scope Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#6e6d68] uppercase tracking-wider">Escopo de Atuação</label>
                <div className="bg-[#ffffff] border border-[#e6e4df] rounded p-2.5 max-h-24 overflow-y-auto space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[#575652]">
                    <input
                      type="checkbox"
                      checked={scope.includes("all")}
                      onChange={() => handleScopeToggle("all")}
                      className="rounded bg-[#ffffff] border-[#e6e4df] text-[#1a1a1a] accent-[#1a1a1a]"
                    />
                    <span className="text-[11px]">Todas as fontes</span>
                  </label>
                  {sourceOptions.map((src) => (
                    <label key={src} className="flex items-center gap-2 cursor-pointer select-none text-[#575652] font-mono">
                      <input
                        type="checkbox"
                        checked={scope.includes(src) && !scope.includes("all")}
                        disabled={scope.includes("all")}
                        onChange={() => handleScopeToggle(src)}
                        className="rounded bg-[#ffffff] border-[#e6e4df] text-[#1a1a1a] accent-[#1a1a1a] disabled:opacity-40"
                      />
                      <span className="text-[11px]">{src}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Strict Mode Checkbox */}
              <div className="p-4 rounded-lg border border-[#e6e4df] bg-[#faf9f6] space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-[#1a1a1a]">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                    className="rounded bg-[#ffffff] border-[#e6e4df] text-[#1a1a1a] accent-[#1a1a1a] mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#1a1a1a]">Strict mode</span>
                    <p className="text-[10px] text-[#6e6d68] mt-0.5">
                      For Gemini or OpenAI models, force the model's output to exactly conform to this schema and response format.
                    </p>
                  </div>
                </label>
              </div>

              {/* Habilitada Switch */}
              <label className="flex items-center gap-3.5 cursor-pointer select-none text-[#1a1a1a] pt-1">
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? "bg-[#1a1a1a]" : "bg-[#e6e4df]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <span className="font-semibold text-[#1a1a1a]">Habilitada imediatamente</span>
                  <p className="text-[10px] text-[#6e6d68] mt-0.5">Se desativada, a regra de scoring deixará de processar dados.</p>
                </div>
              </label>

              <div className="h-px bg-[#e6e4df]" />

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-1 font-semibold">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#e6e4df] hover:bg-[#f5f4f0] rounded text-[#575652] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2e2e2e] disabled:opacity-50 text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : editingConfig ? (
                    "Salvar Configuração"
                  ) : (
                    "Criar Configuração"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
