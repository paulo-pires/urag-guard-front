import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  GitCompare,
  Plus,
  Trash2,
  Play,
  ArrowLeft,
  Search,
  Check,
  Copy,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  FileJson,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { Dataset, DatasetItem, DatasetDiff } from "../types";

interface DatasetsViewProps {
  onNavigateToTab?: (tab: string) => void;
}

type TabMode = "manager" | "diff";
type DiffFilter = "all" | "added" | "removed" | "unchanged";

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeJsonFormat(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

const inputClass =
  "w-full bg-[#FAF8F5] border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]";

export const DatasetsView: React.FC<DatasetsViewProps> = ({ onNavigateToTab }) => {
  const [activeTab, setActiveTab] = useState<TabMode>("manager");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dataset detalhado selecionado
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [datasetItems, setDatasetItems] = useState<DatasetItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Modais de ação
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetDescription, setNewDatasetDescription] = useState("");
  const [creatingDataset, setCreatingDataset] = useState(false);

  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [rawItemJson, setRawItemJson] = useState("");
  const [addingItems, setAddingItems] = useState(false);
  const [itemJsonError, setItemJsonError] = useState<string | null>(null);

  const [sampleRunsModalOpen, setSampleRunsModalOpen] = useState(false);
  const [sampleTargetDatasetId, setSampleTargetDatasetId] = useState<string>("");
  const [sampleMinScore, setSampleMinScore] = useState<number>(0.9);
  const [sampleLimit, setSampleLimit] = useState<number>(100);
  const [sampling, setSampling] = useState(false);
  const [sampleSuccessMsg, setSampleSuccessMsg] = useState<string | null>(null);

  const [deletingDatasetId, setDeletingDatasetId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Estado do Comparador de Diff
  const [diffBaseId, setDiffBaseId] = useState<string>("");
  const [diffTargetId, setDiffTargetId] = useState<string>("");
  const [diffResult, setDiffResult] = useState<DatasetDiff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");

  // Feedback Toast / Banner
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Carregar lista de datasets
  const loadDatasets = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const list = await api.getDatasets();
      setDatasets(list);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao carregar datasets.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  // Carregar detalhe de dataset e itens
  const loadDatasetDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const [ds, items] = await Promise.all([
        api.getDataset(id),
        api.getDatasetItems(id),
      ]);
      setSelectedDataset(ds);
      setDatasetItems(items);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Erro ao carregar itens do dataset.");
      setSelectedDataset(null);
      setDatasetItems([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      void loadDatasetDetail(selectedDatasetId);
    } else {
      setSelectedDataset(null);
      setDatasetItems([]);
    }
  }, [selectedDatasetId, loadDatasetDetail]);

  // Ações de Dataset
  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName.trim()) return;
    setCreatingDataset(true);
    try {
      const { id } = await api.createDataset(newDatasetName.trim(), newDatasetDescription.trim());
      showToast("success", `Dataset "${newDatasetName}" criado com sucesso.`);
      setCreateModalOpen(false);
      setNewDatasetName("");
      setNewDatasetDescription("");
      await loadDatasets();
      setSelectedDatasetId(id);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Falha ao criar dataset.");
    } finally {
      setCreatingDataset(false);
    }
  };

  const handleDeleteDataset = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o dataset "${name}" e todos os seus itens?`)) {
      return;
    }
    setDeletingDatasetId(id);
    try {
      await api.deleteDataset(id);
      showToast("success", `Dataset "${name}" excluído.`);
      if (selectedDatasetId === id) {
        setSelectedDatasetId(null);
      }
      await loadDatasets();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Falha ao excluir dataset.");
    } finally {
      setDeletingDatasetId(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedDatasetId) return;
    setDeletingItemId(itemId);
    try {
      await api.deleteDatasetItem(selectedDatasetId, itemId);
      setDatasetItems((prev) => prev.filter((it) => it.id !== itemId));
      showToast("success", "Item removido com sucesso.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Falha ao remover item.");
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleAddItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId || !rawItemJson.trim()) return;
    setItemJsonError(null);
    setAddingItems(true);

    let parsedPayload: Array<{ input: unknown; expected_output?: unknown; metadata?: unknown }> = [];
    try {
      const parsed = JSON.parse(rawItemJson);
      if (Array.isArray(parsed)) {
        parsedPayload = parsed.map((it) => {
          if (it && typeof it === "object" && "input" in it) {
            return {
              input: it.input,
              expected_output: it.expected_output ?? it.expectedOutput ?? it.output,
              metadata: it.metadata,
            };
          }
          return { input: it };
        });
      } else if (parsed && typeof parsed === "object") {
        if ("input" in parsed) {
          parsedPayload = [{
            input: parsed.input,
            expected_output: parsed.expected_output ?? parsed.expectedOutput ?? parsed.output,
            metadata: parsed.metadata,
          }];
        } else {
          parsedPayload = [{ input: parsed }];
        }
      } else {
        parsedPayload = [{ input: parsed }];
      }
    } catch {
      setItemJsonError("JSON inválido. Certifique-se de fornecer um objeto ou array JSON válido.");
      setAddingItems(false);
      return;
    }

    try {
      const res = await api.addDatasetItems(selectedDatasetId, parsedPayload);
      showToast("success", `${res.ids?.length || parsedPayload.length} item(ns) adicionado(s) com sucesso.`);
      setAddItemModalOpen(false);
      setRawItemJson("");
      await loadDatasetDetail(selectedDatasetId);
    } catch (err) {
      setItemJsonError(err instanceof Error ? err.message : "Falha ao enviar itens.");
    } finally {
      setAddingItems(false);
    }
  };

  const handleRunSampling = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = sampleTargetDatasetId || selectedDatasetId;
    if (!targetId) return;
    setSampling(true);
    setSampleSuccessMsg(null);
    try {
      const res = await api.buildDatasetFromRuns(targetId, sampleMinScore, sampleLimit);
      const imported = res.imported ?? res.created ?? 0;
      setSampleSuccessMsg(`${imported} item(ns) importado(s) com sucesso a partir de runs com nota judge >= ${sampleMinScore}!`);
      showToast("success", `${imported} item(ns) importado(s) com sucesso.`);
      if (selectedDatasetId === targetId) {
        await loadDatasetDetail(targetId);
      }
      await loadDatasets();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Falha na amostragem de runs.");
    } finally {
      setSampling(false);
    }
  };

  // Ações de Diff
  const handleCalculateDiff = async () => {
    if (!diffBaseId || !diffTargetId) return;
    if (diffBaseId === diffTargetId) {
      setDiffError("Selecione dois datasets distintos para comparação.");
      return;
    }
    setLoadingDiff(true);
    setDiffError(null);
    try {
      const diff = await api.getDatasetDiff(diffBaseId, diffTargetId);
      setDiffResult(diff);
      setDiffFilter("all");
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : "Falha ao calcular diff dos datasets.");
      setDiffResult(null);
    } finally {
      setLoadingDiff(false);
    }
  };

  const openDiffWithDataset = (baseId: string) => {
    setDiffBaseId(baseId);
    const other = datasets.find((d) => d.id !== baseId);
    if (other) {
      setDiffTargetId(other.id);
    }
    setActiveTab("diff");
  };

  const openSamplingModal = (targetId?: string) => {
    if (targetId) {
      setSampleTargetDatasetId(targetId);
    } else if (selectedDatasetId) {
      setSampleTargetDatasetId(selectedDatasetId);
    } else if (datasets.length > 0) {
      setSampleTargetDatasetId(datasets[0].id);
    }
    setSampleSuccessMsg(null);
    setSampleRunsModalOpen(true);
  };

  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;
    const q = searchQuery.toLowerCase();
    return datasets.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q))
    );
  }, [datasets, searchQuery]);

  // Itens filtrados no comparador de diff
  const displayedDiffItems = useMemo(() => {
    if (!diffResult) return [];
    const items: Array<{ type: "added" | "removed" | "unchanged"; item: DatasetItem }> = [];
    if (diffFilter === "all" || diffFilter === "added") {
      diffResult.added.forEach((item) => items.push({ type: "added", item }));
    }
    if (diffFilter === "all" || diffFilter === "removed") {
      diffResult.removed.forEach((item) => items.push({ type: "removed", item }));
    }
    if (diffFilter === "all" || diffFilter === "unchanged") {
      diffResult.unchanged.forEach((item) => items.push({ type: "unchanged", item }));
    }
    return items;
  }, [diffResult, diffFilter]);

  const baseDatasetObj = useMemo(() => datasets.find((d) => d.id === diffBaseId), [datasets, diffBaseId]);
  const targetDatasetObj = useMemo(() => datasets.find((d) => d.id === diffTargetId), [datasets, diffTargetId]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border text-xs flex items-center gap-2 transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {toastMsg.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header com estilo editorial */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3D1CE] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-[#FAF8F5] border border-[#D3D1CE] text-[#1A1A1A]">
              <Database size={18} />
            </span>
            <h1 className="text-xl font-serif italic font-semibold text-[#1A1A1A]">
              Datasets & Diff de Regressão
            </h1>
          </div>
          <p className="text-xs text-[#71706F] mt-1 max-w-2xl">
            Gerenciamento de datasets de teste e avaliação, amostragem automatizada de runs com alta nota do judge e motor visual de Diff para CI/CD de prompts e guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openSamplingModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D3D1CE] bg-[#FAF8F5] hover:bg-[#EBE7E2] text-[#1A1A1A] rounded-md text-xs font-medium transition-colors"
          >
            <Sparkles size={14} className="text-amber-600" />
            Amostragem de Runs
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded-md text-xs font-medium transition-colors shadow-sm"
          >
            <Plus size={14} />
            Novo Dataset
          </button>
        </div>
      </div>

      {/* Navegação de Abas do Módulo */}
      <div className="flex items-center gap-2 border-b border-[#D3D1CE]/60">
        <button
          type="button"
          onClick={() => {
            setActiveTab("manager");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "manager"
              ? "border-[#1A1A1A] text-[#1A1A1A] font-semibold"
              : "border-transparent text-[#71706F] hover:text-[#1A1A1A]"
          }`}
        >
          <Layers size={14} />
          Gerenciador de Datasets
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#D3D1CE] text-[10px]">
            {datasets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("diff");
            if (!diffBaseId && datasets.length > 0) setDiffBaseId(datasets[0].id);
            if (!diffTargetId && datasets.length > 1) setDiffTargetId(datasets[1].id);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "diff"
              ? "border-[#1A1A1A] text-[#1A1A1A] font-semibold"
              : "border-transparent text-[#71706F] hover:text-[#1A1A1A]"
          }`}
        >
          <GitCompare size={14} />
          Comparador Visual de Diff (CI)
          {diffResult && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-medium">
              +{diffResult.added.length} / -{diffResult.removed.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          ABA 1: GERENCIADOR DE DATASETS
         ========================================================================= */}
      {activeTab === "manager" && (
        <div className="space-y-5">
          {/* Se um dataset estiver selecionado para visualização detalhada */}
          {selectedDatasetId ? (
            <div className="space-y-4">
              {/* Header do Dataset Selecionado */}
              <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDatasetId(null)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#71706F] hover:text-[#1A1A1A] mb-1 group"
                    >
                      <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
                      Voltar à lista de datasets
                    </button>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-serif italic font-semibold text-[#1A1A1A] truncate">
                        {selectedDataset?.name || "Dataset"}
                      </h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#D3D1CE] text-[#71706F]">
                        ID: {selectedDatasetId}
                      </span>
                    </div>
                    {selectedDataset?.description && (
                      <p className="text-xs text-[#71706F] max-w-3xl">
                        {selectedDataset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-[#71706F] pt-1">
                      <span>Criado em: {formatWhen(selectedDataset?.created_at || "")}</span>
                      <span>•</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {datasetItems.length} item(ns)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openSamplingModal(selectedDatasetId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D3D1CE] bg-white hover:bg-[#F4F1EE] text-[#1A1A1A] rounded text-xs font-medium transition-colors"
                    >
                      <Sparkles size={13} className="text-amber-600" />
                      Amostrar de Runs
                    </button>
                    <button
                      type="button"
                      onClick={() => openDiffWithDataset(selectedDatasetId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D3D1CE] bg-white hover:bg-[#F4F1EE] text-[#1A1A1A] rounded text-xs font-medium transition-colors"
                    >
                      <GitCompare size={13} />
                      Comparar Diff
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddItemModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded text-xs font-medium transition-colors"
                    >
                      <Plus size={13} />
                      Adicionar Itens
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadDatasetDetail(selectedDatasetId)}
                      disabled={loadingDetail}
                      className="p-1.5 border border-[#D3D1CE] bg-white hover:bg-[#F4F1EE] text-[#71706F] hover:text-[#1A1A1A] rounded transition-colors"
                      title="Atualizar itens"
                    >
                      <RefreshCw size={13} className={loadingDetail ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback de erro */}
              {detailError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{detailError}</span>
                </div>
              )}

              {/* Lista de Itens */}
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#71706F] text-xs gap-2">
                  <Loader2 size={20} className="animate-spin text-[#1A1A1A]" />
                  <span>Carregando itens do dataset...</span>
                </div>
              ) : datasetItems.length === 0 ? (
                <div className="bg-[#FAF8F5] border border-dashed border-[#D3D1CE] rounded-lg p-10 text-center space-y-3">
                  <FileJson size={32} className="mx-auto text-[#71706F]/60" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#1A1A1A]">Nenhum item cadastrado neste dataset</p>
                    <p className="text-[11px] text-[#71706F] max-w-md mx-auto">
                      Adicione itens manualmente via JSON ou execute a amostragem automatizada a partir de runs reais com altas notas de judge.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openSamplingModal(selectedDatasetId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#D3D1CE] hover:bg-[#EBE7E2] text-[#1A1A1A] rounded text-xs font-medium"
                    >
                      <Sparkles size={13} className="text-amber-600" />
                      Amostrar de Runs
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddItemModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded text-xs font-medium"
                    >
                      <Plus size={13} />
                      Adicionar JSON
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#71706F] px-1">
                    <span>Exibindo {datasetItems.length} item(ns)</span>
                  </div>

                  <div className="space-y-2">
                    {datasetItems.map((item, idx) => (
                      <DatasetItemCard
                        key={item.id || idx}
                        item={item}
                        index={idx}
                        onDelete={() => handleDeleteItem(item.id)}
                        isDeleting={deletingItemId === item.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Lista Geral de Datasets */
            <div className="space-y-4">
              {/* Barra de Filtro / Busca */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#71706F]" />
                  <input
                    type="text"
                    placeholder="Filtrar datasets por nome ou descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${inputClass} pl-8`}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-[#71706F] w-full sm:w-auto justify-between sm:justify-end">
                  <span>Total: <strong>{filteredDatasets.length}</strong> dataset(s)</span>
                  <button
                    type="button"
                    onClick={() => void loadDatasets()}
                    className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#D3D1CE] rounded text-[#71706F] hover:text-[#1A1A1A] transition-colors"
                    title="Recarregar lista"
                  >
                    <RefreshCw size={13} className={loadingList ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {listError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{listError}</span>
                </div>
              )}

              {loadingList ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#71706F] text-xs gap-2">
                  <Loader2 size={20} className="animate-spin text-[#1A1A1A]" />
                  <span>Carregando datasets...</span>
                </div>
              ) : filteredDatasets.length === 0 ? (
                <div className="bg-[#FAF8F5] border border-dashed border-[#D3D1CE] rounded-lg p-12 text-center space-y-3">
                  <Database size={36} className="mx-auto text-[#71706F]/50" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {searchQuery ? "Nenhum dataset encontrado com essa busca" : "Nenhum dataset cadastrado"}
                    </p>
                    <p className="text-xs text-[#71706F] max-w-md mx-auto">
                      Crie um dataset para organizar entradas de teste e ground truths para avaliar respostas de LLM e regras de guardrail.
                    </p>
                  </div>
                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded text-xs font-medium transition-colors"
                    >
                      <Plus size={13} />
                      Criar Primeiro Dataset
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDatasets.map((ds) => (
                    <div
                      key={ds.id}
                      className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg p-4 flex flex-col justify-between hover:border-[#1A1A1A]/40 transition-all group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif italic font-semibold text-sm text-[#1A1A1A] group-hover:text-black">
                            {ds.name}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#D3D1CE] text-[#71706F]">
                            {formatWhen(ds.created_at).split(",")[0]}
                          </span>
                        </div>

                        {ds.description ? (
                          <p className="text-xs text-[#71706F] line-clamp-2">
                            {ds.description}
                          </p>
                        ) : (
                          <p className="text-xs text-[#71706F]/60 italic">Sem descrição</p>
                        )}
                      </div>

                      <div className="pt-4 mt-3 border-t border-[#D3D1CE]/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDatasetId(ds.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                        >
                          Ver itens
                          <ChevronRight size={13} />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openDiffWithDataset(ds.id)}
                            className="p-1.5 hover:bg-white border border-transparent hover:border-[#D3D1CE] rounded text-[#71706F] hover:text-[#1A1A1A] transition-colors"
                            title="Comparar diff deste dataset"
                          >
                            <GitCompare size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openSamplingModal(ds.id)}
                            className="p-1.5 hover:bg-white border border-transparent hover:border-[#D3D1CE] rounded text-amber-600 hover:text-amber-700 transition-colors"
                            title="Amostrar runs para este dataset"
                          >
                            <Sparkles size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDataset(ds.id, ds.name)}
                            disabled={deletingDatasetId === ds.id}
                            className="p-1.5 hover:bg-red-50 border border-transparent hover:border-red-200 rounded text-[#71706F] hover:text-red-700 transition-colors"
                            title="Excluir dataset"
                          >
                            {deletingDatasetId === ds.id ? (
                              <Loader2 size={14} className="animate-spin text-red-600" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2: COMPARADOR VISUAL DE DIFF (CI/REGRESSÃO)
         ========================================================================= */}
      {activeTab === "diff" && (
        <div className="space-y-6">
          {/* Painel de Configuração da Comparação */}
          <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif italic font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                  <GitCompare size={16} />
                  Configurar Comparação entre Datasets
                </h3>
                <p className="text-xs text-[#71706F] mt-0.5">
                  Compare o dataset base com o alvo para detectar modificações, adições e exclusões de itens de teste.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Dataset Base (A) */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-medium text-[#1A1A1A] flex items-center justify-between">
                  <span>Dataset Base (A)</span>
                  {baseDatasetObj && (
                    <span className="text-[10px] text-[#71706F]">
                      {formatWhen(baseDatasetObj.created_at)}
                    </span>
                  )}
                </label>
                <select
                  value={diffBaseId}
                  onChange={(e) => setDiffBaseId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione o dataset base...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              {/* Ícone de Comparação */}
              <div className="hidden md:flex md:col-span-2 items-center justify-center pb-2 text-[#71706F]">
                <div className="p-2 rounded-full bg-white border border-[#D3D1CE]">
                  <GitCompare size={16} />
                </div>
              </div>

              {/* Dataset Comparar Com (B) */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-medium text-[#1A1A1A] flex items-center justify-between">
                  <span>Comparar Com / Target (B)</span>
                  {targetDatasetObj && (
                    <span className="text-[10px] text-[#71706F]">
                      {formatWhen(targetDatasetObj.created_at)}
                    </span>
                  )}
                </label>
                <select
                  value={diffTargetId}
                  onChange={(e) => setDiffTargetId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione o dataset alvo...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D3D1CE]/50">
              <button
                type="button"
                onClick={handleCalculateDiff}
                disabled={!diffBaseId || !diffTargetId || diffBaseId === diffTargetId || loadingDiff}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors shadow-sm"
              >
                {loadingDiff ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Calculando Diff...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Calcular Diff
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback de erro do diff */}
          {diffError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{diffError}</span>
            </div>
          )}

          {/* Resultado do Diff */}
          {diffResult && (
            <div className="space-y-5">
              {/* Cards de Métricas do Diff */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg p-3">
                  <div className="text-[11px] text-[#71706F]">Total Base (A)</div>
                  <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                    {diffResult.total_base}
                  </div>
                </div>

                <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg p-3">
                  <div className="text-[11px] text-[#71706F]">Total Target (B)</div>
                  <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                    {diffResult.total_target}
                  </div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                  <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
                    <span>+ Adicionados</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-xl font-serif font-bold text-emerald-700 mt-1">
                    +{diffResult.added.length}
                  </div>
                </div>

                <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3">
                  <div className="text-[11px] font-medium text-rose-800 flex items-center justify-between">
                    <span>- Removidos</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                  <div className="text-xl font-serif font-bold text-rose-700 mt-1">
                    -{diffResult.removed.length}
                  </div>
                </div>

                <div className="bg-zinc-100/70 border border-zinc-200 rounded-lg p-3 col-span-2 sm:col-span-4 lg:col-span-1">
                  <div className="text-[11px] font-medium text-zinc-700 flex items-center justify-between">
                    <span>= Inalterados</span>
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  </div>
                  <div className="text-xl font-serif font-bold text-zinc-800 mt-1">
                    {diffResult.unchanged.length}
                  </div>
                </div>
              </div>

              {/* Filtros de visualização dos itens */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3D1CE] pb-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setDiffFilter("all")}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      diffFilter === "all"
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#FAF8F5] text-[#71706F] hover:text-[#1A1A1A] border border-[#D3D1CE]"
                    }`}
                  >
                    Todos ({diffResult.added.length + diffResult.removed.length + diffResult.unchanged.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiffFilter("added")}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      diffFilter === "added"
                        ? "bg-emerald-600 text-white font-semibold"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    + Adicionados ({diffResult.added.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiffFilter("removed")}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      diffFilter === "removed"
                        ? "bg-rose-600 text-white font-semibold"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    }`}
                  >
                    - Removidos ({diffResult.removed.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiffFilter("unchanged")}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      diffFilter === "unchanged"
                        ? "bg-zinc-700 text-white font-semibold"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
                    }`}
                  >
                    = Inalterados ({diffResult.unchanged.length})
                  </button>
                </div>

                <div className="text-[11px] text-[#71706F]">
                  Exibindo {displayedDiffItems.length} item(ns)
                </div>
              </div>

              {/* Lista Detalhada de Itens do Diff */}
              {displayedDiffItems.length === 0 ? (
                <div className="bg-[#FAF8F5] border border-dashed border-[#D3D1CE] rounded-lg p-8 text-center text-xs text-[#71706F]">
                  Nenhum item corresponde ao filtro selecionado ({diffFilter}).
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedDiffItems.map(({ type, item }, idx) => (
                    <DiffItemCard key={`${type}-${item.id || idx}`} type={type} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAIS DE AÇÃO
         ========================================================================= */}

      {/* Modal: Novo Dataset */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D3D1CE] pb-3">
              <h3 className="font-serif italic font-semibold text-base text-[#1A1A1A] flex items-center gap-2">
                <Database size={16} />
                Novo Dataset
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-[#71706F] hover:text-[#1A1A1A] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDataset} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#1A1A1A]">Nome do Dataset *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: gold-standard-v1 ou benchmarks-seguranca"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#1A1A1A]">Descrição (Opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Finalidade deste dataset, versão de prompts ou regras cobertas..."
                  value={newDatasetDescription}
                  onChange={(e) => setNewDatasetDescription(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D3D1CE]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-[#D3D1CE] bg-white hover:bg-[#F4F1EE] text-[#1A1A1A] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingDataset || !newDatasetName.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] disabled:opacity-50 rounded text-xs font-medium"
                >
                  {creatingDataset ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Criar Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Itens JSON */}
      {addItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D3D1CE] pb-3">
              <div>
                <h3 className="font-serif italic font-semibold text-base text-[#1A1A1A] flex items-center gap-2">
                  <FileJson size={16} />
                  Adicionar Itens ao Dataset
                </h3>
                <p className="text-xs text-[#71706F] mt-0.5">
                  Insira um objeto JSON ou array de objetos contendo <code className="text-[#1A1A1A] font-mono">input</code>, <code className="text-[#1A1A1A] font-mono">expected_output</code> e <code className="text-[#1A1A1A] font-mono">metadata</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddItemModalOpen(false)}
                className="text-[#71706F] hover:text-[#1A1A1A] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItems} className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1A1A1A]">JSON dos Itens *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setRawItemJson(JSON.stringify([
                        {
                          input: { prompt: "Qual o prazo de devolução de produtos com defeito?" },
                          expected_output: "O prazo de devolução é de até 30 dias para bens não duráveis e 90 dias para bens duráveis conforme o CDC.",
                          metadata: { category: "faq-sac", priority: "high" }
                        },
                        {
                          input: { prompt: "Como solicitar reembolso via Pix?" },
                          expected_output: "Envie sua chave Pix através do menu Reembolsos no painel de suporte.",
                          metadata: { category: "financeiro" }
                        }
                      ], null, 2));
                    }}
                    className="text-[11px] text-[#1A1A1A] hover:underline"
                  >
                    Inserir Exemplo
                  </button>
                </div>
                <textarea
                  rows={10}
                  required
                  placeholder='[\n  {\n    "input": { "query": "..." },\n    "expected_output": "...",\n    "metadata": { ... }\n  }\n]'
                  value={rawItemJson}
                  onChange={(e) => {
                    setRawItemJson(e.target.value);
                    setItemJsonError(null);
                  }}
                  className={`${inputClass} font-mono text-[11px]`}
                  autoFocus
                />
              </div>

              {itemJsonError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded border border-red-200 bg-red-50 text-red-700 text-xs">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>{itemJsonError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D3D1CE]">
                <button
                  type="button"
                  onClick={() => setAddItemModalOpen(false)}
                  className="px-3 py-1.5 border border-[#D3D1CE] bg-white hover:bg-[#F4F1EE] text-[#1A1A1A] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingItems || !rawItemJson.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] disabled:opacity-50 rounded text-xs font-medium"
                >
                  {addingItems ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Importar Itens
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Amostragem de Runs Reais */}
      {sampleRunsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D3D1CE] pb-3">
              <div>
                <h3 className="font-serif italic font-semibold text-base text-[#1A1A1A] flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-600" />
                  Amostragem Automatizada de Runs
                </h3>
                <p className="text-xs text-[#71706F] mt-0.5">
                  Importa runs reais da observabilidade com nota do LLM Judge superior ao limiar definido.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSampleRunsModalOpen(false)}
                className="text-[#71706F] hover:text-[#1A1A1A] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunSampling} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#1A1A1A]">Dataset Destino *</label>
                <select
                  required
                  value={sampleTargetDatasetId}
                  onChange={(e) => setSampleTargetDatasetId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione o dataset...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#1A1A1A] flex items-center justify-between">
                    <span>Nota Mínima do Judge</span>
                    <span className="font-mono text-[11px] text-amber-700 font-semibold">{sampleMinScore.toFixed(2)}</span>
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={sampleMinScore}
                    onChange={(e) => setSampleMinScore(parseFloat(e.target.value) || 0.9)}
                    className={inputClass}
                  />
                  <span className="text-[10px] text-[#71706F]">Garante apenas exemplos de alta fidelidade (ex: 0.90+)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#1A1A1A]">Limite de Runs</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={sampleLimit}
                    onChange={(e) => setSampleLimit(parseInt(e.target.value, 10) || 100)}
                    className={inputClass}
                  />
                  <span className="text-[10px] text-[#71706F]">Máximo de itens gerados (1-500)</span>
                </div>
              </div>

              {sampleSuccessMsg && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                  <Check size={14} className="shrink-0" />
                  <span>{sampleSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D3D1CE]">
                <button
                  type="button"
                  onClick={() => setSampleRunsModalOpen(false)}
                  className="px-3 py-1.5 border border-[#D3D1CE] bg-white hover:bg-[#F4F1EE] text-[#1A1A1A] rounded text-xs"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={sampling || !sampleTargetDatasetId}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] disabled:opacity-50 rounded text-xs font-medium"
                >
                  {sampling ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Importando Runs...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-amber-400" />
                      Iniciar Amostragem
                    </>
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

// ── Componente Card de Item Individual de Dataset ─────────────────────────────
interface DatasetItemCardProps {
  item: DatasetItem;
  index: number;
  onDelete: () => void;
  isDeleting: boolean;
}

const DatasetItemCard: React.FC<DatasetItemCardProps> = ({
  item,
  index,
  onDelete,
  isDeleting,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedInput = useMemo(() => safeJsonFormat(item.input), [item.input]);
  const formattedExpected = useMemo(() => safeJsonFormat(item.expected_output), [item.expected_output]);
  const formattedMeta = useMemo(() => safeJsonFormat(item.metadata), [item.metadata]);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      JSON.stringify(
        {
          input: item.input,
          expected_output: item.expected_output,
          metadata: item.metadata,
        },
        null,
        2
      )
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#D3D1CE] rounded-lg p-3.5 space-y-2.5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#D3D1CE] text-[#71706F]">
            #{index + 1}
          </span>
          <span className="text-[10px] font-mono text-[#71706F] truncate max-w-[160px]">
            ID: {item.id}
          </span>
          {item.created_at && (
            <span className="text-[10px] text-[#71706F] hidden sm:inline">
              • {formatWhen(item.created_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 hover:bg-white border border-transparent hover:border-[#D3D1CE] rounded text-[#71706F] hover:text-[#1A1A1A] transition-colors"
            title="Copiar JSON do item"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-2 py-0.5 hover:bg-white border border-transparent hover:border-[#D3D1CE] rounded text-[11px] text-[#71706F] hover:text-[#1A1A1A] transition-colors"
          >
            {expanded ? "Recolher" : "Expandir"}
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1 hover:bg-red-50 border border-transparent hover:border-red-200 rounded text-[#71706F] hover:text-red-700 transition-colors"
            title="Excluir item"
          >
            {isDeleting ? <Loader2 size={12} className="animate-spin text-red-600" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {/* Prévia do Input */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-wider">
          Input
        </span>
        <pre className={`text-[11px] font-mono bg-white border border-[#D3D1CE]/70 rounded p-2.5 text-[#1A1A1A] overflow-x-auto whitespace-pre-wrap ${!expanded ? "max-h-24 overflow-y-hidden" : ""}`}>
          {formattedInput || "(vazio)"}
        </pre>
      </div>

      {/* Expected Output se houver */}
      {formattedExpected && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
            Expected Output
          </span>
          <pre className={`text-[11px] font-mono bg-emerald-50/40 border border-emerald-200/60 rounded p-2.5 text-[#1A1A1A] overflow-x-auto whitespace-pre-wrap ${!expanded ? "max-h-24 overflow-y-hidden" : ""}`}>
            {formattedExpected}
          </pre>
        </div>
      )}

      {/* Metadados quando expandido */}
      {expanded && formattedMeta && (
        <div className="space-y-1 pt-1 border-t border-[#D3D1CE]/40">
          <span className="text-[10px] font-semibold text-[#71706F] uppercase tracking-wider">
            Metadata
          </span>
          <pre className="text-[10px] font-mono bg-[#FAF8F5] border border-[#D3D1CE]/50 rounded p-2 text-[#71706F] overflow-x-auto whitespace-pre-wrap">
            {formattedMeta}
          </pre>
        </div>
      )}
    </div>
  );
};

// ── Componente Card de Item Comparado no Diff ─────────────────────────────────
interface DiffItemCardProps {
  type: "added" | "removed" | "unchanged";
  item: DatasetItem;
}

const DiffItemCard: React.FC<DiffItemCardProps> = ({ type, item }) => {
  const [expanded, setExpanded] = useState(false);

  const formattedInput = useMemo(() => safeJsonFormat(item.input), [item.input]);
  const formattedExpected = useMemo(() => safeJsonFormat(item.expected_output), [item.expected_output]);
  const formattedMeta = useMemo(() => safeJsonFormat(item.metadata), [item.metadata]);

  const config = useMemo(() => {
    switch (type) {
      case "added":
        return {
          badge: "+ Adicionado no Target (B)",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold",
          borderClass: "border-l-4 border-l-emerald-500 border-r border-t border-b border-[#D3D1CE] bg-emerald-50/30",
        };
      case "removed":
        return {
          badge: "- Removido da Base (A)",
          badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-semibold",
          borderClass: "border-l-4 border-l-rose-500 border-r border-t border-b border-[#D3D1CE] bg-rose-50/30",
        };
      case "unchanged":
      default:
        return {
          badge: "= Inalterado",
          badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
          borderClass: "border border-[#D3D1CE] bg-[#FAF8F5]",
        };
    }
  }, [type]);

  return (
    <div className={`rounded-lg p-3.5 space-y-2.5 ${config.borderClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
            {config.badge}
          </span>
          <span className="text-[10px] font-mono text-[#71706F] truncate max-w-[180px]">
            ID: {item.id}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2 py-0.5 hover:bg-white border border-transparent hover:border-[#D3D1CE] rounded text-[11px] text-[#71706F] hover:text-[#1A1A1A] transition-colors"
        >
          {expanded ? "Recolher" : "Expandir"}
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>

      {/* Input */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-wider">
          Input
        </span>
        <pre className={`text-[11px] font-mono bg-white border border-[#D3D1CE]/70 rounded p-2.5 text-[#1A1A1A] overflow-x-auto whitespace-pre-wrap ${!expanded ? "max-h-20 overflow-y-hidden" : ""}`}>
          {formattedInput || "(vazio)"}
        </pre>
      </div>

      {/* Expected Output */}
      {formattedExpected && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
            Expected Output
          </span>
          <pre className={`text-[11px] font-mono bg-white border border-emerald-200/60 rounded p-2.5 text-[#1A1A1A] overflow-x-auto whitespace-pre-wrap ${!expanded ? "max-h-20 overflow-y-hidden" : ""}`}>
            {formattedExpected}
          </pre>
        </div>
      )}

      {/* Metadata se expandido */}
      {expanded && formattedMeta && (
        <div className="space-y-1 pt-1 border-t border-[#D3D1CE]/40">
          <span className="text-[10px] font-semibold text-[#71706F] uppercase tracking-wider">
            Metadata
          </span>
          <pre className="text-[10px] font-mono bg-[#FAF8F5] border border-[#D3D1CE]/50 rounded p-2 text-[#71706F] overflow-x-auto whitespace-pre-wrap">
            {formattedMeta}
          </pre>
        </div>
      )}
    </div>
  );
};
