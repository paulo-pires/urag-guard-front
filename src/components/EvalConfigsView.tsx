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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="text-emerald-400" size={20} />
            Métricas de Avaliação Automatizada
          </h2>
          <p className="text-xs text-zinc-400">
            Configure métricas estatísticas de qualidade para avaliar as respostas geradas por IA contra contextos recuperados do RAG.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-lg text-xs font-semibold shadow transition-all duration-150"
        >
          <Plus size={14} />
          <span>Nova Config</span>
        </button>
      </div>

      {/* Grid of evaluations */}
      <div className="border border-zinc-900/50 rounded-lg bg-zinc-950/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900/60 text-zinc-500 bg-zinc-950/20">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Métrica</th>
                <th className="px-4 py-2 font-medium text-center">Amostragem (%)</th>
                <th className="px-4 py-2 font-medium text-right">Threshold Aviso</th>
                <th className="px-4 py-2 font-medium text-right">Threshold Falha</th>
                <th className="px-4 py-2 font-medium">Escopo de Fontes</th>
                <th className="px-4 py-2 font-medium text-center">Habilitada</th>
                <th className="px-4 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-zinc-900/30 animate-pulse">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-3 bg-zinc-900/50 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : configs.length > 0 ? (
                configs.map((config) => (
                  <tr key={config.id} className="border-b border-zinc-900/30 even:bg-zinc-900/10 odd:bg-transparent hover:bg-zinc-900/40 text-zinc-300 transition-colors">
                    <td className="px-4 py-1.5 font-semibold text-zinc-300 text-[11px]">
                      {config.name}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] bg-sky-950/20 text-sky-400 border border-sky-900/30 font-medium">
                        {metricLabels[config.metric] || config.metric}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <span className="px-1.5 py-0.2 bg-zinc-900 text-zinc-400 border border-zinc-800/80 rounded-[3px] font-mono text-[10px]">
                        {config.sampling_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-right font-semibold font-mono text-amber-500 text-[11px]">
                      {config.threshold_warn.toFixed(2)}
                    </td>
                    <td className="px-4 py-1.5 text-right font-semibold font-mono text-rose-500 text-[11px]">
                      {config.threshold_fail.toFixed(2)}
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {config.scope.includes("all") ? (
                          <span className="px-1.5 py-0.2 bg-zinc-900 text-zinc-500 text-[9px] rounded-[3px] border border-zinc-850">Todas</span>
                        ) : (
                          config.scope.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 bg-zinc-900 text-zinc-400 text-[9px] rounded-[3px] border border-zinc-850 font-mono">
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <button
                        onClick={() => handleToggleActive(config)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          config.enabled ? "bg-emerald-500" : "bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                            config.enabled ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDuplicate(config)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                          title="Duplicar configuração"
                        >
                          {copiedConfigId === config.id ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(config)}
                          className="p-1 text-zinc-500 hover:text-emerald-400 rounded transition-colors"
                          title="Editar configuração"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => setConfigToDelete(config.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                          title="Excluir configuração"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Excluir Regra de Avaliação?</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Tem certeza que deseja apagar esta métrica de scoring automático? Esta operação interromperá os cálculos e estatísticas para as próximas execuções.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs font-semibold pt-1">
              <button
                onClick={() => setConfigToDelete(null)}
                className="px-3.5 py-2 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(configToDelete)}
                className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-zinc-100 rounded-lg transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-900 bg-zinc-950 shadow-2xl overflow-hidden my-4">
            
            {/* LangSmith Style Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-900 bg-zinc-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono tracking-wider uppercase">
                  <span>Configure Evaluator</span>
                  <span className="text-zinc-600 font-sans text-xs">»</span>
                  <span className="text-zinc-300 font-semibold lowercase font-sans text-xs">
                    {editingConfig ? `editar: ${editingConfig.name}` : "nova_configuracao"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[85vh] overflow-y-auto bg-zinc-950">
              
              {/* Application and Basic Config Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start p-4 rounded-lg bg-zinc-900/10 border border-zinc-900/60">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Application Link</label>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border border-zinc-900 rounded-[4px] text-zinc-400 font-mono text-[11px]">
                    <span>No application</span>
                    <ChevronDown size={12} className="text-zinc-600" />
                  </div>
                  <p className="text-[9px] text-zinc-600">Link to a deployment or gateway source.</p>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome Amigável</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fidelidade RAG - Produção"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-[4px] px-3 py-1.5 text-zinc-100 font-medium focus:outline-none transition-colors"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Métrica Estatística</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-[4px] px-2.5 py-1.5 text-zinc-100 focus:outline-none cursor-pointer transition-colors"
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
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Taxa de Amostragem</label>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-[4px] px-3 py-1">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={samplingRate}
                      onChange={(e) => setSamplingRate(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                      className="w-full bg-transparent text-zinc-100 font-mono focus:outline-none"
                    />
                    <span className="text-zinc-500">%</span>
                  </div>
                </div>
              </div>

              {/* SECTION: Prompt & Model */}
              <div className="border border-zinc-900 rounded-lg p-5 bg-zinc-950/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-zinc-300 text-xs flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400 animate-pulse" />
                      Prompt & Model
                    </h4>
                    <p className="text-[10px] text-zinc-500">Create your evaluator by defining the criteria you want to evaluate in your prompt.</p>
                  </div>
                  
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    {/* Model selector dropdown */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-900 rounded-[4px]">
                      <Settings size={11} className="text-zinc-500" />
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-mono text-zinc-300 focus:outline-none cursor-pointer"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        <option value="gpt-5.6-terra">gpt-5.6-terra</option>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                      </select>
                    </div>

                    {/* Preview toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Preview</span>
                      <button
                        type="button"
                        onClick={() => setIsPreviewEnabled(!isPreviewEnabled)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isPreviewEnabled ? "bg-emerald-500" : "bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
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
                    <div className="flex items-center gap-1 text-zinc-500">
                      <span className="font-semibold text-zinc-400">Prompt editor</span>
                      <span>•</span>
                      <span>Type {"{{"} to create a mapped variable.</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono text-[9px] border border-zinc-850">Default</span>
                      <span className="px-1.5 py-0.5 rounded bg-transparent text-zinc-500 font-mono text-[9px]">Mustache</span>
                    </div>
                  </div>

                  {/* Chat Message Styled Container */}
                  <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-900 bg-zinc-900/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 font-mono uppercase px-1.5 py-0.2 bg-zinc-900 border border-zinc-850/80 rounded-[3px]">
                          Human
                        </span>
                        <span className="text-[10px] text-zinc-600">» Chat message instruction</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <button type="button" className="p-1 hover:text-zinc-300 transition-colors"><Copy size={11} /></button>
                        <button type="button" className="p-1 hover:text-rose-400 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </div>

                    {isPreviewEnabled ? (
                      <div className="p-4 bg-zinc-950/40">
                        <div className="text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Interpolated Preview</div>
                        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900/80 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
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
                        className="w-full bg-zinc-950/20 p-4 font-mono text-[11px] text-zinc-100 placeholder-zinc-700 leading-relaxed min-h-[160px] focus:outline-none resize-y"
                      />
                    )}
                  </div>

                  {/* Variable Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Mapped inputs:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 font-mono text-[9px]">
                      <span>input</span>
                      <span className="text-[8px] cursor-pointer hover:text-orange-300">×</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 font-mono text-[9px]">
                      <span>output</span>
                      <span className="text-[8px] cursor-pointer hover:text-orange-300">×</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 font-mono text-[9px]">
                      <span>context</span>
                      <span className="text-[8px] cursor-pointer hover:text-orange-300">×</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-500 font-mono text-[9px]">
                      <span>referenceOutput</span>
                      <span className="text-[8px] cursor-pointer hover:text-zinc-400">×</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="mt-2 text-[10px] text-zinc-400 font-semibold px-2.5 py-1 rounded border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    + Message
                  </button>
                </div>
              </div>

              {/* Threshold Parameters Config */}
              <div className="p-5 rounded-lg border border-zinc-900 bg-zinc-950/40 space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-900 pb-2">Scoring Thresholds</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Warning Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-zinc-450 font-mono text-[10px]">
                      <span className="font-sans font-semibold">Limiar de Aviso (Warn)</span>
                      <span className="font-bold text-zinc-200">{thresholdWarn.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={thresholdWarn}
                      onChange={(e) => setThresholdWarn(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer text-amber-500"
                    />
                    <p className="text-[9px] text-zinc-500">
                      Notas abaixo deste limiar disparam sinalizações amarelas nos relatórios do RAG.
                    </p>
                  </div>

                  {/* Failure Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-zinc-450 font-mono text-[10px]">
                      <span className="font-sans font-semibold">Limiar de Falha Grave (Fail)</span>
                      <span className="font-bold text-zinc-200">{thresholdFail.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={thresholdFail}
                      onChange={(e) => setThresholdFail(parseFloat(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer text-rose-500"
                    />
                    <p className="text-[9px] text-zinc-500">
                      Notas abaixo deste limiar acusam erros graves de integridade ou exatidão da IA.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: Feedback configuration */}
              <div className="border border-zinc-900 rounded-lg p-5 bg-zinc-950/40 space-y-4">
                <div className="space-y-0.5 border-b border-zinc-900 pb-3">
                  <h4 className="font-bold text-zinc-300 text-xs">Feedback configuration</h4>
                  <p className="text-[10px] text-zinc-500">Define your evaluation criteria. Describe what you're measuring, then select a response format. This configuration structures how your evaluation results are returned.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Key Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Key:</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 font-mono text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {metric}
                      </span>
                    </div>

                    {/* Reasoning and Advanced */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 text-[10px]">
                        <input
                          type="checkbox"
                          checked={includeReasoning}
                          onChange={(e) => setIncludeReasoning(e.target.checked)}
                          className="rounded bg-zinc-950 border-zinc-900 text-emerald-500 accent-emerald-500"
                        />
                        <span className="font-semibold text-zinc-300">Include reasoning</span>
                        <Info size={11} className="text-zinc-600" />
                      </label>
                      <button
                        type="button"
                        className="text-[10px] px-2 py-0.5 rounded border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                      >
                        Advanced
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Description text block */}
                    <div className="md:col-span-8 space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Description</label>
                      <textarea
                        value={feedbackDescription}
                        onChange={(e) => setFeedbackDescription(e.target.value)}
                        placeholder="TRUE if output contains hallucinations. FALSE otherwise."
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-[4px] px-3 py-2 text-zinc-100 focus:outline-none h-14"
                      />
                    </div>

                    {/* Response Format dropdown */}
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Response Format</label>
                      <select
                        value={responseFormat}
                        onChange={(e) => setResponseFormat(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-[4px] px-2.5 py-1.5 text-zinc-100 focus:outline-none cursor-pointer"
                      >
                        <option value="Boolean">Boolean</option>
                        <option value="Score / Scale">Score / Scale</option>
                        <option value="Category">Category</option>
                      </select>
                    </div>
                  </div>

                  {/* Feedback Helper message box */}
                  <div className="px-3.5 py-2.5 bg-zinc-900/10 border border-zinc-900 rounded-[4px] text-[10px] text-zinc-500 font-mono">
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Escopo de Atuação</label>
                <div className="bg-zinc-950 border border-zinc-900 rounded-[4px] p-2.5 max-h-24 overflow-y-auto space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-500">
                    <input
                      type="checkbox"
                      checked={scope.includes("all")}
                      onChange={() => handleScopeToggle("all")}
                      className="rounded bg-zinc-950 border-zinc-900 text-emerald-500"
                    />
                    <span className="text-[11px]">Todas as fontes</span>
                  </label>
                  {sourceOptions.map((src) => (
                    <label key={src} className="flex items-center gap-2 cursor-pointer select-none text-zinc-500 font-mono">
                      <input
                        type="checkbox"
                        checked={scope.includes(src) && !scope.includes("all")}
                        disabled={scope.includes("all")}
                        onChange={() => handleScopeToggle(src)}
                        className="rounded bg-zinc-950 border-zinc-900 text-emerald-500 disabled:opacity-40"
                      />
                      <span className="text-[11px]">{src}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Strict Mode Checkbox */}
              <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-900/10 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-zinc-300">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-900 text-emerald-500 accent-emerald-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs text-zinc-300">Strict mode</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      For Gemini or OpenAI models, force the model's output to exactly conform to this schema and response format.
                    </p>
                  </div>
                </label>
              </div>

              {/* Habilitada Switch */}
              <label className="flex items-center gap-3.5 cursor-pointer select-none text-zinc-300 pt-1">
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <span className="font-semibold text-zinc-300">Habilitada imediatamente</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Se desativada, a regra de scoring deixará de processar dados.</p>
                </div>
              </label>

              <div className="h-px bg-zinc-900" />

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-1 font-semibold">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-900 hover:bg-zinc-900 rounded-[4px] text-zinc-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-zinc-950 rounded-[4px] transition-colors flex items-center justify-center gap-2"
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
