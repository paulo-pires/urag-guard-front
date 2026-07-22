import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Calendar,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { api } from "../lib/api";
import { Project, APIKey } from "../types";

export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [keyCounts, setKeyCounts] = useState<Record<string, number>>({});
  
  // Loading and Error States
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);

  // Form Fields
  const [newProjectName, setNewProjectName] = useState("");
  const [newKeyKind, setNewKeyKind] = useState<"ingest" | "dashboard">("ingest");
  const [copied, setCopied] = useState(false);

  // Load all projects and fetch key counts
  const loadProjects = async (selectId?: string) => {
    setLoadingProjects(true);
    setErrorMsg(null);
    try {
      const projs = await api.getProjects();
      setProjects(projs);

      // Determine default active project if none selected yet or requested specific ID
      let targetProj = selectedProject;
      if (selectId) {
        targetProj = projs.find((p) => p.id === selectId) || null;
      }
      if (!targetProj && projs.length > 0) {
        targetProj =
          projs.find(
            (p) => p.name.toLowerCase() === "default" || p.id === "default"
          ) || projs[0];
      }
      setSelectedProject(targetProj);

      // Fetch key counts in parallel to populate sidebar info
      const counts: Record<string, number> = {};
      await Promise.all(
        projs.map(async (p) => {
          try {
            const keys = await api.getProjectAPIKeys(p.id);
            counts[p.id] = keys.length;
          } catch {
            counts[p.id] = 0;
          }
        })
      );
      setKeyCounts(counts);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao carregar projetos. Verifique a conexão com o servidor.");
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load API keys for selected project
  const loadKeysForSelected = async () => {
    if (!selectedProject) return;
    setLoadingKeys(true);
    try {
      const keys = await api.getProjectAPIKeys(selectedProject.id);
      setApiKeys(keys);
      // Keep keyCounts in sync for the selected project
      setKeyCounts((prev) => ({ ...prev, [selectedProject.id]: keys.length }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadKeysForSelected();
    } else {
      setApiKeys([]);
    }
  }, [selectedProject]);

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setActionLoading(true);
    try {
      const result = await api.createProject(newProjectName.trim());
      setNewProjectName("");
      setIsNewProjectModalOpen(false);
      // Reload and auto-select newly created project
      await loadProjects(result.id);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar projeto.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create API Key handler
  const handleCreateAPIKey = async () => {
    if (!selectedProject) return;
    setActionLoading(true);
    try {
      const result = await api.createProjectAPIKey(selectedProject.id, newKeyKind);
      setRevealedKey(result.key);
      setIsNewKeyModalOpen(false);
      setIsRevealModalOpen(true);
      // Reload keys for the active project
      await loadKeysForSelected();
    } catch (err) {
      console.error(err);
      alert("Erro ao criar API key.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete API Key handler
  const handleRevokeAPIKey = async () => {
    if (!selectedProject || !keyToRevoke) return;
    setActionLoading(true);
    try {
      await api.deleteProjectAPIKey(selectedProject.id, keyToRevoke.id);
      setKeyToRevoke(null);
      // Reload keys for active project
      await loadKeysForSelected();
    } catch (err) {
      console.error(err);
      alert("Erro ao revogar API key.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Relative time helper
  function getRelativeTimeString(dateStr: string): string {
    const now = new Date();
    const created = new Date(dateStr);
    const diffMs = now.getTime() - created.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return "agora mesmo";
    if (diffSecs < 60) return `há ${diffSecs} segundos`;
    if (diffMins < 60) return `há ${diffMins} min${diffMins > 1 ? "s" : ""}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 30) return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;

    return created.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // Format date helper
  function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Sort projects: "default" first, then by creation date descending
  const sortedProjects = [...projects].sort((a, b) => {
    const isADefault = a.name.toLowerCase() === "default" || a.id === "default";
    const isBDefault = b.name.toLowerCase() === "default" || b.id === "default";
    if (isADefault && !isBDefault) return -1;
    if (!isADefault && isBDefault) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div id="projects-view-root" className="min-h-full">
      {/* Page Title & Context Header */}
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="font-serif italic text-2xl font-semibold text-[#1a1a1a] tracking-tight flex items-center gap-2">
          <KeyRound size={22} className="text-[#1a1a1a]" />
          Projetos &amp; API Keys
        </h1>
        <p className="text-xs text-[#6e6d68] max-w-2xl">
          Gerencie múltiplos projetos isolados ("tenants") e controle chaves de autenticação individuais para ingestão de dados ou acesso ao dashboard.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-red-600" />
          <span>{errorMsg}</span>
          <button onClick={() => loadProjects()} className="ml-auto underline hover:text-red-900 font-medium">
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Left Column: Projects List */}
        <div className="flex flex-col rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[#e6e4df] bg-[#f5f4f0]">
            <span className="font-serif italic text-xs font-semibold text-[#1a1a1a] tracking-tight">
              Projetos ({projects.length})
            </span>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#2e2e2e] text-[11px] text-white transition-colors font-medium shadow-xs"
            >
              <Plus size={12} />
              <span>Novo</span>
            </button>
          </div>

          <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto scrollbar-none min-h-[160px]">
            {loadingProjects ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 size={16} className="text-[#6e6d68] animate-spin" />
                <span className="text-[10px] text-[#6e6d68]">Buscando projetos...</span>
              </div>
            ) : sortedProjects.length === 0 ? (
              <div className="text-center py-8 text-[#6e6d68] text-xs">
                Nenhum projeto encontrado.
              </div>
            ) : (
              sortedProjects.map((project) => {
                const isSelected = selectedProject?.id === project.id;
                const isDefault =
                  project.name.toLowerCase() === "default" ||
                  project.id === "default";
                const keyCount = keyCounts[project.id] ?? 0;

                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`flex flex-col w-full text-left p-3 rounded-md transition-all group relative ${
                      isSelected
                        ? "bg-[#1a1a1a] text-white shadow-xs"
                        : "text-[#575652] hover:bg-[#f5f4f0] hover:text-[#1a1a1a] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-medium text-xs truncate max-w-[170px] ${isSelected ? "text-white" : "text-[#1a1a1a]"}`}>
                        {project.name}
                      </span>
                      {isDefault && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wide ${
                          isSelected 
                            ? "bg-white/20 text-white font-medium" 
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                        }`}>
                          Padrão
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center justify-between w-full mt-2 text-[10px] ${isSelected ? "text-white/70" : "text-[#6e6d68]"}`}>
                      <span className="flex items-center gap-1 font-mono">
                        <KeyRound size={10} />
                        {keyCount} {keyCount === 1 ? "chave" : "chaves"}
                      </span>
                      <span>{getRelativeTimeString(project.created_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Project Details & API Keys Table */}
        <div className="flex flex-col rounded-lg border border-[#e6e4df] bg-[#ffffff] shadow-xs overflow-hidden min-h-[400px]">
          {selectedProject ? (
            <div className="flex flex-col flex-1">
              {/* Project Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#e6e4df] bg-[#f5f4f0] gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif italic text-base font-semibold text-[#1a1a1a]">
                      {selectedProject.name}
                    </h2>
                    {(selectedProject.name.toLowerCase() === "default" ||
                      selectedProject.id === "default") && (
                      <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium font-mono">
                        Projeto Padrão
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#6e6d68] flex items-center gap-1 font-mono">
                    <Calendar size={11} />
                    Criado em {formatFullDate(selectedProject.created_at)}
                    <span className="text-[#e6e4df]">•</span>
                    ID: <span>{selectedProject.id}</span>
                  </span>
                </div>

                <button
                  onClick={() => setIsNewKeyModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#2e2e2e] text-xs text-white font-medium transition-colors shrink-0 shadow-xs"
                >
                  <Plus size={14} />
                  <span>Nova Key</span>
                </button>
              </div>

              {/* API Keys Table Content */}
              <div className="flex-1 p-4">
                {loadingKeys ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={24} className="text-[#6e6d68] animate-spin" />
                    <span className="text-xs text-[#6e6d68]">Buscando chaves de API...</span>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#e6e4df] rounded-lg p-8 bg-[#faf9f6]">
                    <div className="w-10 h-10 rounded-full bg-[#f5f4f0] border border-[#e6e4df] flex items-center justify-center mb-3">
                      <KeyRound size={18} className="text-[#1a1a1a]" />
                    </div>
                    <h3 className="font-serif italic text-sm font-semibold text-[#1a1a1a]">
                      Nenhuma chave de API criada ainda
                    </h3>
                    <p className="text-[11px] text-[#6e6d68] max-w-[280px] mt-1">
                      Crie chaves de API para permitir que aplicações enviem dados (ingestão) ou interajam com o dashboard com segurança.
                    </p>
                    <button
                      onClick={() => setIsNewKeyModalOpen(true)}
                      className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#2e2e2e] text-[11px] font-medium text-white transition-colors shadow-xs"
                    >
                      <Plus size={12} />
                      <span>Gerar Primeira Key</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e6e4df] bg-[#f5f4f0] text-[10px] text-[#6e6d68] font-mono tracking-wider uppercase">
                          <th className="py-2.5 px-3 font-medium rounded-l">Prefixo</th>
                          <th className="py-2.5 px-3 font-medium">Tipo</th>
                          <th className="py-2.5 px-3 font-medium">Criada Em</th>
                          <th className="py-2.5 px-3 font-medium">Último Uso</th>
                          <th className="py-2.5 px-3 font-medium text-right rounded-r">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e6e4df] text-xs">
                        {apiKeys.map((key) => {
                          const isIngest = key.kind === "ingest";
                          return (
                            <tr key={key.id} className="hover:bg-[#f5f4f0]/60 group transition-colors">
                              <td className="py-3 px-3 font-mono text-[11px] text-[#1a1a1a] font-medium">
                                {key.key_prefix}...
                              </td>
                              <td className="py-3 px-3">
                                {isIngest ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 border border-blue-200 text-blue-800 font-medium font-mono">
                                    Ingestão
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 border border-purple-200 text-purple-800 font-medium font-mono">
                                    Dashboard
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-[#6e6d68] text-[11px]">
                                {getRelativeTimeString(key.created_at)}
                              </td>
                              <td className="py-3 px-3">
                                {key.last_used_at ? (
                                  <span className="text-[#1a1a1a] text-[11px]">
                                    {getRelativeTimeString(key.last_used_at)}
                                  </span>
                                ) : (
                                  <span className="text-[#8e8d87] text-[11px] italic">
                                    nunca usada
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => setKeyToRevoke(key)}
                                  className="p-1.5 rounded text-[#6e6d68] hover:text-red-600 hover:bg-red-50 transition-all"
                                  title="Revogar chave de API"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-[#6e6d68] p-8">
              <KeyRound size={28} className="mb-2 text-[#8e8d87]" />
              <p className="text-xs">Nenhum projeto carregado ou selecionado.</p>
            </div>
          )}
        </div>
      </div>

      {/* NEW PROJECT MODAL */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-[#ffffff] border border-[#e6e4df] rounded-xl shadow-xl max-w-sm w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#e6e4df] bg-[#f5f4f0]">
                <h3 className="font-serif italic text-sm font-semibold text-[#1a1a1a]">
                  Criar Novo Projeto
                </h3>
                <button
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="text-[#6e6d68] hover:text-[#1a1a1a] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#6e6d68]">
                    Nome do Projeto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Produção, App de Teste"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full rounded-md border border-[#e6e4df] bg-[#ffffff] px-3 py-2 text-xs text-[#1a1a1a] placeholder-[#8e8d87] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e4df]">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs text-[#6e6d68] hover:text-[#1a1a1a] hover:bg-[#f5f4f0] font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !newProjectName.trim()}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#1a1a1a] hover:bg-[#2e2e2e] text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>Criar Projeto</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW API KEY MODAL */}
      <AnimatePresence>
        {isNewKeyModalOpen && selectedProject && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-[#ffffff] border border-[#e6e4df] rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#e6e4df] bg-[#f5f4f0]">
                <div className="flex flex-col">
                  <h3 className="font-serif italic text-sm font-semibold text-[#1a1a1a]">
                    Nova Chave de API
                  </h3>
                  <span className="text-[10px] text-[#6e6d68] mt-0.5">
                    Projeto: {selectedProject.name}
                  </span>
                </div>
                <button
                  onClick={() => setIsNewKeyModalOpen(false)}
                  className="text-[#6e6d68] hover:text-[#1a1a1a] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#6e6d68] block">
                    Selecione o Tipo de Chave
                  </label>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Ingest Key Option */}
                    <label
                      onClick={() => setNewKeyKind("ingest")}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                        newKeyKind === "ingest"
                          ? "bg-blue-50/50 border-blue-300 text-blue-900"
                          : "bg-[#ffffff] border-[#e6e4df] hover:bg-[#f5f4f0] text-[#575652]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="keyKind"
                        checked={newKeyKind === "ingest"}
                        onChange={() => setNewKeyKind("ingest")}
                        className="sr-only"
                      />
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          newKeyKind === "ingest" ? "border-blue-600" : "border-[#8e8d87]"
                        }`}>
                          {newKeyKind === "ingest" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[#1a1a1a]">
                          Ingestão (X-Guard-Token)
                        </span>
                        <span className="text-[10px] leading-relaxed text-[#6e6d68]">
                          Usada para APIs de servidor (server-to-server) que transmitem dados de monitoramento e logs de execução.
                        </span>
                      </div>
                    </label>

                    {/* Dashboard Key Option */}
                    <label
                      onClick={() => setNewKeyKind("dashboard")}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                        newKeyKind === "dashboard"
                          ? "bg-purple-50/50 border-purple-300 text-purple-900"
                          : "bg-[#ffffff] border-[#e6e4df] hover:bg-[#f5f4f0] text-[#575652]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="keyKind"
                        checked={newKeyKind === "dashboard"}
                        onChange={() => setNewKeyKind("dashboard")}
                        className="sr-only"
                      />
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          newKeyKind === "dashboard" ? "border-purple-600" : "border-[#8e8d87]"
                        }`}>
                          {newKeyKind === "dashboard" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[#1a1a1a]">
                          Dashboard (X-Api-Key)
                        </span>
                        <span className="text-[10px] leading-relaxed text-[#6e6d68]">
                          Chave para acesso ao front-end e interagir com o painel principal de visualização.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e4df]">
                  <button
                    type="button"
                    onClick={() => setIsNewKeyModalOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs text-[#6e6d68] hover:text-[#1a1a1a] hover:bg-[#f5f4f0] font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAPIKey}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#1a1a1a] hover:bg-[#2e2e2e] text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>Gerar Chave</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE REVEAL KEY MODAL */}
      <AnimatePresence>
        {isRevealModalOpen && revealedKey && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18 }}
              className="bg-[#ffffff] border border-[#e6e4df] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#e6e4df] bg-[#f5f4f0]">
                <h3 className="font-serif italic text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                  <Sparkles size={14} className="text-[#1a1a1a]" />
                  Chave Gerada com Sucesso
                </h3>
              </div>

              <div className="p-5 space-y-4">
                {/* Warning Alert Banner */}
                <div className="flex gap-2.5 p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold">Cuidado e Atenção!</span>
                    <p className="text-[10px] leading-relaxed text-amber-800">
                      Essa é a única vez que você vê essa key. Copie agora — não é possível recuperá-la depois.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6e6d68]">
                    Sua Chave Completa
                  </span>
                  <div className="flex items-center gap-1.5 p-3 rounded-md border border-[#e6e4df] bg-[#f5f4f0]">
                    <code className="text-xs font-mono text-[#1a1a1a] flex-1 break-all select-all font-semibold tracking-tight">
                      {revealedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(revealedKey)}
                      className={`p-2 rounded-md flex items-center justify-center transition-all shrink-0 ${
                        copied
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-[#ffffff] hover:bg-[#e6e4df] text-[#1a1a1a] border border-[#e6e4df]"
                      }`}
                      title="Copiar para área de transferência"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e6e4df]">
                  <div className="text-[10px] text-[#6e6d68] flex items-center gap-1">
                    <Info size={11} />
                    Certifique-se de salvar em local seguro.
                  </div>
                  <button
                    onClick={() => {
                      setIsRevealModalOpen(false);
                      setRevealedKey(null);
                    }}
                    className="px-4 py-1.5 rounded-md bg-[#1a1a1a] hover:bg-[#2e2e2e] text-white font-medium text-xs transition-colors shadow-xs"
                  >
                    Fechar &amp; Entendi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVOKE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {keyToRevoke && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.12 }}
              className="bg-[#ffffff] border border-[#e6e4df] rounded-xl shadow-xl max-w-sm w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#e6e4df] bg-[#f5f4f0]">
                <h3 className="font-serif italic text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Confirmar Revogação
                </h3>
                <button
                  onClick={() => setKeyToRevoke(null)}
                  className="text-[#6e6d68] hover:text-[#1a1a1a] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-xs leading-relaxed text-[#1a1a1a]">
                  Revogar essa key vai parar de funcionar imediatamente para qualquer serviço que a usa. Confirmar?
                </p>

                <div className="p-3 rounded-md bg-[#f5f4f0] border border-[#e6e4df] text-[11px] space-y-1 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6e6d68]">Prefixo da Chave:</span>
                    <span className="text-[#1a1a1a] font-semibold">{keyToRevoke.key_prefix}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6e6d68]">Tipo:</span>
                    <span className="text-[#1a1a1a] font-medium">
                      {keyToRevoke.kind === "ingest" ? "Ingestão" : "Dashboard"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e4df]">
                  <button
                    type="button"
                    onClick={() => setKeyToRevoke(null)}
                    className="px-3 py-1.5 rounded-md text-xs text-[#6e6d68] hover:text-[#1a1a1a] hover:bg-[#f5f4f0] font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeAPIKey}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>Confirmar Revogação</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
