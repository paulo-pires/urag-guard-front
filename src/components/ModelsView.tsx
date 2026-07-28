import React, { useState } from "react";
import {
  Cpu,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Activity,
  DollarSign,
  Globe,
  RefreshCw,
  ExternalLink,
  Trash2,
  Zap,
  Server,
  Edit
} from "lucide-react";
import { ModelRegistry, McpServerConfig } from "../types";
import { callMCPTool } from "../lib/api";

interface ModelsViewProps {
  models: ModelRegistry[];
  config: McpServerConfig;
  onRefresh: () => void;
  onSelectModelForDrift: (modelId: string) => void;
  isLoading: boolean;
}

export const ModelsView: React.FC<ModelsViewProps> = ({
  models,
  config,
  onRefresh,
  onSelectModelForDrift,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UP" | "DOWN">("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; latency: number } | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Form State for new model registration
  const [formName, setFormName] = useState("Ollama Llama 3.2");
  const [formProvider, setFormProvider] = useState<ModelProvider>("ollama");
  const [formModelName, setFormModelName] = useState("llama3.2:3b");
  const [formEndpoint, setFormEndpoint] = useState("http://localhost:11434");
  const [formCost, setFormCost] = useState("0.10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Proxy Models integration state
  const [proxyModels, setProxyModels] = useState<ModelRegistry[]>([]);
  const [isLoadingProxy, setIsLoadingProxy] = useState(false);
  const [selectedProxyModelId, setSelectedProxyModelId] = useState("");

  const openModalAndLoadProxy = async () => {
    setIsModalOpen(true);
    setIsLoadingProxy(true);
    try {
      const list = await fetchModelsFromProxy();
      setProxyModels(list);
    } catch (err) {
      console.error("Erro ao carregar modelos do proxy:", err);
    } finally {
      setIsLoadingProxy(false);
    }
  };

  const handleOpenNewModelModal = async () => {
    setEditingModelId(null);
    setFormName("Ollama Granite 4 Micro");
    setFormProvider("ollama");
    setFormModelName("granite4:micro-h");
    setFormEndpoint("http://localhost:11434");
    setFormCost("0.15");
    setSelectedProxyModelId("");
    setFormError(null);
    openModalAndLoadProxy();
  };

  const handleOpenEditModelModal = async (model: ModelRegistry) => {
    setEditingModelId(model.id);
    setFormName(model.name);
    setFormProvider(model.provider);
    setFormModelName(model.modelName);
    setFormEndpoint(model.endpointUrl);
    setFormCost(model.costPerMillionTokens.toString());
    setSelectedProxyModelId("");
    setFormError(null);
    openModalAndLoadProxy();
  };

  const handleSelectProxyModel = (modelId: string) => {
    setSelectedProxyModelId(modelId);
    if (!modelId) return;
    const model = proxyModels.find((m) => m.id === modelId);
    if (model) {
      setFormName(model.name);
      setFormProvider(model.provider);
      setFormModelName(model.modelName);
      // Ponto focal: chama o proxy ao invés do provider externo direto (porta default 8082)
      setFormEndpoint("http://localhost:8082/v1");
      setFormCost((model.costPerMillionTokens / 1_000_000).toFixed(6));
    }
  };

  // Provider presets helper
  const handleProviderChange = (provider: ModelProvider) => {
    setFormProvider(provider);
    switch (provider) {
      case "ollama":
        setFormName("Ollama Granite 4 Micro");
        setFormModelName("granite4:micro-h");
        setFormEndpoint("http://localhost:11434");
        setFormCost("0.15");
        break;
      case "lm-studio":
        setFormName("LM Studio Qwen 2.5 7B");
        setFormModelName("qwen2.5-7b-instruct");
        setFormEndpoint("http://localhost:1234/v1");
        setFormCost("0.30");
        break;
      case "ignus-proxy":
        setFormName("LLM Ignustec (Proxy)");
        setFormModelName("deepseek-coder");
        setFormEndpoint("http://localhost:8082/v1");
        setFormCost("0.05");
        break;
    }
  };

  const handleRegisterModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formModelName.trim()) {
      setFormError("Nome e ID do modelo são obrigatórios");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      // Map provider names from frontend format to Go server format
      const providerMap: Record<string, string> = {
        "ollama": "local",
        "lm-studio": "lmstudio",
        "ignus-proxy": "local"
      };

      const args: Record<string, any> = {
        name: formName,
        version: formModelName,         // modelName → version
        type: "llm",                    // always llm for chat models
        provider: providerMap[formProvider] || formProvider,
        endpoint_url: formEndpoint,     // camelCase → snake_case
        context_window: 8192            // default context window
      };

      if (editingModelId) {
        args.id = editingModelId;
      }

      await callMCPTool(
        config.modelOpsPort,
        "register_model",
        args,
        config.token,
        config
      );

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar modelo");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle model selection for comparison
  const toggleCompare = (modelId: string) => {
    setCompareIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  // Real connection test using the backend ping_model tool
  const handleTestConnection = async (model: ModelRegistry) => {
    setTestingModelId(model.id);
    setTestResult(null);

    const start = performance.now();
    try {
      const res = await callMCPTool<{ success: boolean; latency_ms: number; error?: string }>(
        config.modelOpsPort,
        "ping_model",
        { model_id: model.id },
        config.token,
        config
      );
      setTestResult({
        id: model.id,
        success: res.success,
        latency: res.success ? Math.round(res.latency_ms) : 0
      });
    } catch {
      setTestResult({ id: model.id, success: false, latency: 0 });
    } finally {
      setTestingModelId(null);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!window.confirm(`Tem certeza de que deseja remover o modelo "${modelId}"?`)) {
      return;
    }
    try {
      await callMCPTool(
        config.modelOpsPort,
        "unregister_model",
        { model_id: modelId },
        config.token,
        config
      );
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Erro ao remover modelo");
    }
  };

  // Filtered models
  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    const matchesProvider = providerFilter === "ALL" || m.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const totalModels = models.length;
  const modelsUp = models.filter((m) => m.status === "UP").length;
  const avgCost = totalModels > 0 ? models.reduce((acc, m) => acc + m.costPerMillionTokens, 0) / totalModels : 0;

  const getProviderBadge = (provider: ModelProvider) => {
    switch (provider) {
      case "ollama":
        return { label: "Ollama", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "lm-studio":
        return { label: "LM Studio", bg: "bg-purple-50 text-purple-800 border-purple-200" };
      case "ignus-proxy":
        return { label: "LLM Ignustec", bg: "bg-amber-50 text-amber-800 border-amber-200" };
      default:
        return { label: provider, bg: "bg-gray-100 text-gray-800 border-gray-200" };
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] font-serif-editorial flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#1a1a1a]" />
            Registro de Modelos <span className="italic font-normal text-[#555249]">(ModelOps)</span>
          </h2>
          <p className="text-xs text-[#666257] mt-1">
            Gerenciamento e cadastro de endpoints LLM locais e em nuvem via uRag ModelOps (:{config.modelOpsPort})
          </p>
        </div>

        <button
          onClick={handleOpenNewModelModal}
          className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#333333] text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Modelo
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Total de Modelos</p>
            <p className="text-2xl font-bold text-[#1a1a1a] font-mono mt-1">{totalModels}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#f5f4f0] border border-[#e6e4df] flex items-center justify-center text-[#1a1a1a]">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Modelos Ativos (UP)</p>
            <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">{modelsUp} / {totalModels}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Custo Médio / 1M Tokens</p>
            <p className="text-2xl font-bold text-[#1a1a1a] font-mono mt-1">${avgCost.toFixed(2)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold text-[#7a766c] uppercase tracking-wider font-mono">Provedores Ativos</p>
            <p className="text-2xl font-bold text-purple-900 font-mono mt-1">
              {new Set(models.map((m) => m.provider)).size}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-800">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-[#ffffff] border border-[#e6e4df] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7a766c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar modelo por nome, ID ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#faf9f6] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#1a1a1a] placeholder-[#8c877a]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-[#faf9f6] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#1a1a1a]"
          >
            <option value="ALL">Todos Provedores</option>
            <option value="ollama">Ollama</option>
            <option value="lm-studio">LM Studio</option>
            <option value="ignus-proxy">LLM Ignustec</option>
          </select>

          {/* Compare button */}
          {compareIds.length >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              Comparar ({compareIds.length})
            </button>
          )}

        {/* Status Filter */}
          <div className="bg-[#f5f4f0] p-1 rounded-xl border border-[#e6e4df] flex text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "ALL" ? "bg-[#1a1a1a] text-white font-medium" : "text-[#555249] hover:text-[#1a1a1a]"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("UP")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "UP" ? "bg-emerald-700 text-white font-medium" : "text-[#555249] hover:text-[#1a1a1a]"
              }`}
            >
              UP
            </button>
            <button
              onClick={() => setStatusFilter("DOWN")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "DOWN" ? "bg-rose-700 text-white font-medium" : "text-[#555249] hover:text-[#1a1a1a]"
              }`}
            >
              DOWN
            </button>
          </div>
        </div>
      </div>

      {/* Models Grid Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModels.map((model) => {
          const providerBadge = getProviderBadge(model.provider);
          const isTesting = testingModelId === model.id;
          const isResultForThis = testResult?.id === model.id;

          return (
            <div
              key={model.id}
              className={`bg-[#ffffff] border ${
                compareIds.includes(model.id) ? "border-indigo-400 ring-2 ring-indigo-200" : "border-[#e6e4df] hover:border-[#b8b4a8]"
              } rounded-2xl p-5 transition-all flex flex-col justify-between group shadow-xs hover:shadow-sm`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full border mb-1.5 ${providerBadge.bg}`}
                    >
                      {providerBadge.label}
                    </span>
                    <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial group-hover:text-[#000000] transition-colors">
                      {model.name}
                    </h3>
                    <p className="text-xs font-mono text-[#666257]">{model.id}</p>
                  </div>

                  {/* Status Pill & Delete Button */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                        model.status === "UP"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          model.status === "UP" ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
                        }`}
                      />
                      {model.status}
                    </span>

                    <button
                      onClick={() => handleOpenEditModelModal(model)}
                      className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-all border border-transparent hover:border-amber-100 active:scale-95"
                      title="Editar Modelo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-all border border-transparent hover:border-rose-100 active:scale-95"
                      title="Remover Modelo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2 text-xs bg-[#f5f4f0] p-3.5 rounded-xl border border-[#e6e4df] my-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666257]">Modelo Interno:</span>
                    <span className="font-mono text-[#1a1a1a] font-medium">{model.modelName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666257]">Endpoint:</span>
                    <span className="font-mono text-[#1a1a1a] truncate max-w-[200px]" title={model.endpointUrl}>
                      {model.endpointUrl}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666257]">Custo (1M Tokens):</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      ${model.costPerMillionTokens.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Test Result feedback */}
                {isResultForThis && (
                  <div
                    className={`px-3 py-2 text-xs rounded-xl mb-3 flex items-center justify-between ${
                      testResult.success
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      {testResult.success ? "Conexão bem-sucedida" : "Falha na resposta do endpoint"}
                    </span>
                    {testResult.success && <span className="font-mono font-bold">{testResult.latency}ms</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e6e4df] text-xs">
                <button
                  onClick={() => handleTestConnection(model)}
                  disabled={isTesting}
                  className="px-3.5 py-1.5 bg-[#ffffff] hover:bg-[#f5f4f0] text-[#1a1a1a] border border-[#e6e4df] rounded-lg flex items-center gap-1.5 transition-colors font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-[#1a1a1a]" : ""}`} />
                  Testar Ping
                </button>

                <button
                  onClick={() => onSelectModelForDrift(model.id)}
                  className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-lg flex items-center gap-1.5 font-medium transition-colors shadow-xs"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Ver Drift
                </button>

                <button
                  onClick={() => toggleCompare(model.id)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors text-xs ${
                    compareIds.includes(model.id)
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                      : "bg-[#ffffff] hover:bg-[#f5f4f0] text-[#555249] border border-[#e6e4df]"
                  }`}
                >
                  {compareIds.includes(model.id) ? "Remover" : "Comparar"}
                </button>
              </div>
            </div>
          );
        })}

        {filteredModels.length === 0 && (
          <div className="col-span-full bg-[#ffffff] border border-[#e6e4df] p-12 rounded-2xl text-center">
            <Cpu className="w-12 h-12 text-[#8c877a] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial">Nenhum modelo encontrado</h3>
            <p className="text-xs text-[#666257] mt-1 max-w-sm mx-auto">
              Nenhum endpoint cadastrado corresponde aos seus filtros de busca atuais.
            </p>
          </div>
        )}
      </div>

      {/* Panel Comparacao de Modelos */}
      {showComparison && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e6e4df] w-full max-w-5xl rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-[#1a1a1a] overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6e4df]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold font-serif-editorial">
                  Comparacao de Modelos ({compareIds.length})
                </h3>
              </div>
              <button onClick={() => setShowComparison(false)} className="text-[#666257] hover:text-[#1a1a1a] p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#e6e4df]">
                    <th className="text-left py-2 pr-4 font-bold text-[#7a766c] uppercase tracking-wider">Metrica</th>
                    {compareIds.map((id) => {
                      const m = models.find((x) => x.id === id);
                      return <th key={id} className="text-left py-2 px-3 font-bold text-[#1a1a1a]">{m?.name || id}</th>;
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e4df]">
                  <tr>
                    <td className="py-3 pr-4 font-medium text-[#555249]">Provedor</td>
                    {compareIds.map((id) => {
                      const m = models.find((x) => x.id === id);
                      return <td key={id} className="py-3 px-3 font-mono">{m?.provider || "-"}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-[#555249]">Modelo Interno</td>
                    {compareIds.map((id) => {
                      const m = models.find((x) => x.id === id);
                      return <td key={id} className="py-3 px-3 font-mono">{m?.modelName || "-"}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-[#555249]">Custo / 1M Tokens</td>
                    {compareIds.map((id) => {
                      const m = models.find((x) => x.id === id);
                      return (
                        <td key={id} className="py-3 px-3 font-mono text-emerald-700 font-bold">
                          ${m?.costPerMillionTokens.toFixed(2) || "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-[#555249]">Status</td>
                    {compareIds.map((id) => {
                      const m = models.find((x) => x.id === id);
                      return (
                        <td key={id} className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            m?.status === "UP"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}>
                            {m?.status || "-"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-[#555249]">ID</td>
                    {compareIds.map((id) => {
                      const m = models.find((x) => x.id === id);
                      return <td key={id} className="py-3 px-3 font-mono text-[#666257]">{m?.id || "-"}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#e6e4df] mt-4">
              <button
                onClick={() => setShowComparison(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Modelo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e6e4df] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-[#1a1a1a]">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6e4df]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-white">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1a1a1a] font-serif-editorial">
                    {editingModelId ? "Editar Modelo" : "Cadastrar Novo Modelo"} ({editingModelId ? "update_model" : "register_model"})
                  </h3>
                  <p className="text-xs text-[#666257]">
                    {editingModelId ? "Atualiza especificações do modelo via tool MCP" : "Dispara tool MCP para uRag ModelOps"} (:{config.modelOpsPort})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#666257] hover:text-[#1a1a1a] p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterModel} className="mt-4 space-y-4">
              {/* Import from Proxy */}
              <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df]">
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">
                  Importar do Catálogo do Proxy (ignus-code-landing-page)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedProxyModelId}
                    onChange={(e) => handleSelectProxyModel(e.target.value)}
                    disabled={isLoadingProxy}
                    className="flex-1 bg-[#ffffff] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl p-2 focus:outline-none"
                  >
                    <option value="">-- Selecione um modelo do catálogo --</option>
                    {proxyModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openModalAndLoadProxy}
                    disabled={isLoadingProxy}
                    className="px-3 py-2 bg-[#1a1a1a] text-white rounded-xl text-xs font-semibold flex items-center justify-center hover:bg-[#333333]"
                  >
                    {isLoadingProxy ? "Carregando..." : "Atualizar"}
                  </button>
                </div>
                <p className="text-[10px] text-[#666257] mt-1 font-mono">
                  Dica: Registra o endpoint na porta do Proxy (:8082) aplicando billing e guardrails.
                </p>
              </div>

              {/* Provedor Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1.5">Provedor de LLM</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ollama", "lm-studio", "ignus-proxy"] as ModelProvider[]).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => handleProviderChange(prov)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        formProvider === prov
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-sm"
                          : "bg-[#f5f4f0] text-[#555249] border-[#e6e4df] hover:text-[#1a1a1a]"
                      }`}
                    >
                      {prov === "ignus-proxy" ? "LLM Ignustec" : prov}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome amigável */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Nome Exibido</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Ollama Granite 4 Micro"
                  className="w-full bg-[#ffffff] border border-[#e6e4df] text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#1a1a1a]"
                />
              </div>

              {/* Model Name & Endpoint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">ID do Modelo (Model Name)</label>
                  <input
                    type="text"
                    required
                    value={formModelName}
                    onChange={(e) => setFormModelName(e.target.value)}
                    placeholder="Ex: granite4:micro-h"
                    className="w-full bg-[#ffffff] border border-[#e6e4df] font-mono text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Custo / 1M Tokens ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.15"
                    className="w-full bg-[#ffffff] border border-[#e6e4df] font-mono text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#1a1a1a]"
                  />
                </div>
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">URL do Endpoint HTTP</label>
                <input
                  type="url"
                  required
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-[#ffffff] border border-[#e6e4df] font-mono text-[#1a1a1a] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#1a1a1a]"
                />
              </div>

              {/* JSON Preview of MCP tool payload */}
              <div className="bg-[#f5f4f0] p-3 rounded-xl border border-[#e6e4df]">
                <p className="text-[10px] font-bold text-[#7a766c] uppercase tracking-wider mb-1 font-mono">
                  Payload MCP JSON-RPC
                </p>
                <pre className="text-[11px] font-mono text-[#1a1a1a] overflow-x-auto leading-relaxed">
{JSON.stringify({
  method: "tools/call",
  params: {
    name: "register_model",
    arguments: {
      ...(editingModelId ? { id: editingModelId } : {}),
      name: formName,
      version: formModelName,
      type: "llm",
      provider: ({
        "ollama": "local",
        "lm-studio": "lmstudio",
        "ignus-proxy": "local"
      } as Record<string, string>)[formProvider] || formProvider,
      endpoint_url: formEndpoint,
      context_window: 8192
    }
  }
}, null, 2)}
                </pre>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e6e4df]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#666257] hover:text-[#1a1a1a]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#333333] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {editingModelId ? "Salvando..." : "Registrando..."}
                    </>
                  ) : (
                    editingModelId ? "Salvar Alterações" : "Cadastrar Modelo"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
