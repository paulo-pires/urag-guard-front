import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Columns2,
  FileText,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { Prompt, PromptDetail, PromptVersion } from "../types";

type DiffOp = { kind: "eq" | "add" | "del"; text: string };

/** Diff word-level (LCS O(n²)). Tokens = split por whitespace, preservando os separadores. */
export function wordDiff(oldText: string, newText: string): DiffOp[] {
  const a = oldText.split(/(\s+)/);
  const b = newText.split(/(\s+)/);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "eq", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: a[i] });
      i++;
    } else {
      out.push({ kind: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", text: a[i++] });
  while (j < m) out.push({ kind: "add", text: b[j++] });
  return out;
}

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

const inputClass =
  "w-full bg-[#FAF8F5] border border-[#D3D1CE] rounded px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]";

export const PromptsView: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState("");
  const [activateOnSave, setActivateOnSave] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLeft, setCompareLeft] = useState<string>("");
  const [compareRight, setCompareRight] = useState<string>("");

  const [actionError, setActionError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getPrompts();
      setPrompts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível listar os prompts.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setActionError(null);
    try {
      const d = await api.getPrompt(id);
      setDetail(d);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível carregar o prompt.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const versions = detail?.versions ?? [];
  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.version - a.version),
    [versions],
  );

  const leftVer = versions.find((v) => v.id === compareLeft);
  const rightVer = versions.find((v) => v.id === compareRight);
  const diffOps = useMemo(() => {
    if (!leftVer || !rightVer) return [];
    return wordDiff(leftVer.template, rightVer.template);
  }, [leftVer, rightVer]);

  const openCompare = () => {
    if (sortedVersions.length < 2) return;
    setCompareLeft(sortedVersions[1].id);
    setCompareRight(sortedVersions[0].id);
    setCompareOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setActionError(null);
    try {
      const { id } = await api.createPrompt(newName.trim(), newDescription.trim());
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      await loadList();
      setSelectedId(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível criar o prompt.");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !templateDraft.trim()) return;
    setSavingVersion(true);
    setActionError(null);
    try {
      await api.createPromptVersion(selectedId, templateDraft, activateOnSave);
      setEditorOpen(false);
      setTemplateDraft("");
      setActivateOnSave(false);
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível gravar a versão.");
    } finally {
      setSavingVersion(false);
    }
  };

  const handleActivate = async (version: PromptVersion) => {
    if (!selectedId || version.is_active) return;
    setActivatingId(version.id);
    setActionError(null);
    try {
      await api.activatePromptVersion(selectedId, version.id);
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível ativar a versão.");
    } finally {
      setActivatingId(null);
    }
  };

  const openNewVersion = () => {
    const active = versions.find((v) => v.is_active) || sortedVersions[0];
    setTemplateDraft(active?.template || "");
    setActivateOnSave(versions.length === 0);
    setEditorOpen(true);
  };

  if (selectedId) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1.5 text-xs text-[#71706F] hover:text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2 rounded"
            >
              <ArrowLeft size={14} />
              Voltar à lista
            </button>
            <h2 className="text-lg font-serif italic font-semibold text-[#1A1A1A] flex items-center gap-2">
              <FileText size={18} />
              {detail?.name || "Prompt"}
            </h2>
            {detail?.description && (
              <p className="text-xs text-[#71706F] max-w-2xl">{detail.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sortedVersions.length >= 2 && (
              <button
                type="button"
                onClick={openCompare}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#D3D1CE] bg-[#FAF8F5] hover:bg-[#EBE7E2] text-[#1A1A1A] rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
              >
                <Columns2 size={14} />
                Comparar
              </button>
            )}
            <button
              type="button"
              onClick={openNewVersion}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
            >
              <Plus size={14} />
              Nova versão
            </button>
          </div>
        </div>

        {actionError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="ml-auto text-red-500 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded"
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="border border-[#D3D1CE] rounded-lg bg-[#FAF8F5] overflow-hidden">
          {loadingDetail ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-[#71706F]">
              <Loader2 size={14} className="animate-spin" />
              Carregando versões…
            </div>
          ) : sortedVersions.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-2">
              <p className="text-sm font-medium text-[#1A1A1A]">Nenhuma versão ainda</p>
              <p className="text-xs text-[#71706F]">
                Grave a primeira versão do template. Use {"{{variavel}}"} para interpolar campos.
              </p>
              <button
                type="button"
                onClick={openNewVersion}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
              >
                <Plus size={14} />
                Nova versão
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#D3D1CE]">
              {sortedVersions.map((v) => (
                <li key={v.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#1A1A1A]">
                        v{v.version}
                      </span>
                      {v.is_active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-medium uppercase tracking-wider">
                          <Check size={10} />
                          ativa
                        </span>
                      )}
                      <span className="text-[10px] text-[#71706F]">{formatWhen(v.created_at)}</span>
                    </div>
                    <pre className="mt-2 text-[11px] font-mono text-[#1A1A1A] whitespace-pre-wrap break-words max-h-32 overflow-y-auto leading-relaxed">
                      {v.template}
                    </pre>
                  </div>
                  {!v.is_active && (
                    <button
                      type="button"
                      disabled={activatingId === v.id}
                      onClick={() => void handleActivate(v)}
                      className="shrink-0 px-3 py-1.5 border border-[#D3D1CE] bg-white hover:bg-[#EBE7E2] text-[#1A1A1A] rounded-md text-xs font-medium disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
                    >
                      {activatingId === v.id ? "Ativando…" : "Ativar"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {editorOpen && (
          <VersionEditorModal
            draft={templateDraft}
            onDraft={setTemplateDraft}
            activateOnSave={activateOnSave}
            onActivateOnSave={setActivateOnSave}
            saving={savingVersion}
            onClose={() => setEditorOpen(false)}
            onSubmit={handleSaveVersion}
          />
        )}

        {compareOpen && leftVer && rightVer && (
          <CompareModal
            versions={sortedVersions}
            leftId={compareLeft}
            rightId={compareRight}
            onLeft={setCompareLeft}
            onRight={setCompareRight}
            ops={diffOps}
            onClose={() => setCompareOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-serif italic font-semibold text-[#1A1A1A] flex items-center gap-2">
            <FileText size={20} />
            Prompts
          </h2>
          <p className="text-xs text-[#71706F] max-w-xl">
            Versionamento de templates. Compare duas versões lado a lado e ative a que deve
            entrar em produção.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded-md text-xs font-medium transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
        >
          <Plus size={14} />
          Novo prompt
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="border border-[#D3D1CE] rounded-lg bg-white overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#D3D1CE] text-[#71706F] bg-[#EBE7E2] font-mono text-[10px] uppercase tracking-wider">
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Descrição</th>
              <th className="px-4 py-2.5 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="border-b border-[#D3D1CE]">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="h-3 bg-[#EBE7E2] rounded w-full" />
                  </td>
                </tr>
              ))
            ) : prompts.length > 0 ? (
              prompts.map((p) => (
                <tr key={p.id} className="border-b border-[#D3D1CE] even:bg-[#FAF8F5] hover:bg-[#EBE7E2]/60">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className="font-medium text-[#1A1A1A] hover:underline text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] rounded"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-[#71706F]">{p.description || "—"}</td>
                  <td className="px-4 py-2.5 text-[#71706F] whitespace-nowrap">
                    {formatWhen(p.created_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-[#71706F]">
                  Nenhum prompt cadastrado. Clique em “Novo prompt” para versionar o primeiro template.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 p-4"
          onClick={() => setCreateOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-prompt-title"
            className="w-full max-w-md rounded-xl border border-[#D3D1CE] bg-[#FAF8F5] p-5 space-y-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 id="create-prompt-title" className="text-sm font-serif italic font-semibold text-[#1A1A1A]">
                Novo prompt
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 text-[#71706F] hover:text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] rounded"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="prompt-name" className="block text-[10px] font-medium uppercase tracking-wider text-[#71706F] mb-1">
                  Nome
                </label>
                <input
                  id="prompt-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="prompt-desc" className="block text-[10px] font-medium uppercase tracking-wider text-[#71706F] mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  id="prompt-desc"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-3.5 py-1.5 border border-[#D3D1CE] hover:bg-[#EBE7E2] text-[#1A1A1A] rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded-md text-xs font-medium disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
                >
                  {creating ? "Criando…" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function VersionEditorModal({
  draft,
  onDraft,
  activateOnSave,
  onActivateOnSave,
  saving,
  onClose,
  onSubmit,
}: {
  draft: string;
  onDraft: (v: string) => void;
  activateOnSave: boolean;
  onActivateOnSave: (v: boolean) => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-editor-title"
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl border border-[#D3D1CE] bg-[#FAF8F5] shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#D3D1CE] bg-[#EBE7E2]">
          <h3 id="version-editor-title" className="text-sm font-serif italic font-semibold text-[#1A1A1A]">
            Nova versão
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#71706F] hover:text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] rounded"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[10px] text-[#71706F]">
            Interpolação: <code className="font-mono bg-[#EBE7E2] px-1 rounded">{"{{variavel}}"}</code> — o
            nome entre chaves vira o campo no momento da execução.
          </p>
          <label htmlFor="prompt-template" className="block text-[10px] font-medium uppercase tracking-wider text-[#71706F]">
            Template
          </label>
          <textarea
            id="prompt-template"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            rows={14}
            className="w-full bg-white border border-[#D3D1CE] rounded px-3 py-3 font-mono text-xs text-[#1A1A1A] leading-relaxed focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] resize-y min-h-[200px]"
          />
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A] cursor-pointer">
            <input
              type="checkbox"
              checked={activateOnSave}
              onChange={(e) => onActivateOnSave(e.target.checked)}
              className="rounded border-[#D3D1CE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]"
            />
            Ativar esta versão ao gravar
          </label>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#D3D1CE]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-[#D3D1CE] hover:bg-[#EBE7E2] text-[#1A1A1A] rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#2e2e2e] rounded-md text-xs font-medium disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
          >
            {saving ? "Gravando…" : "Gravar versão"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CompareModal({
  versions,
  leftId,
  rightId,
  onLeft,
  onRight,
  ops,
  onClose,
}: {
  versions: PromptVersion[];
  leftId: string;
  rightId: string;
  onLeft: (id: string) => void;
  onRight: (id: string) => void;
  ops: DiffOp[];
  onClose: () => void;
}) {
  const selectClass =
    "bg-white border border-[#D3D1CE] rounded px-2 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
        className="w-full max-w-5xl rounded-xl border border-[#D3D1CE] bg-[#FAF8F5] shadow-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#D3D1CE] bg-[#EBE7E2]">
          <h3 id="compare-title" className="text-sm font-serif italic font-semibold text-[#1A1A1A]">
            Comparar versões
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#71706F] hover:text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] rounded"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-0 border-b border-[#D3D1CE]">
          <div className="px-5 py-3 border-r border-[#D3D1CE]">
            <label htmlFor="diff-left" className="block text-[10px] uppercase tracking-wider text-[#71706F] mb-1">
              Base (remoções)
            </label>
            <select
              id="diff-left"
              value={leftId}
              onChange={(e) => onLeft(e.target.value)}
              className={selectClass}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} {v.is_active ? "(ativa)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="px-5 py-3">
            <label htmlFor="diff-right" className="block text-[10px] uppercase tracking-wider text-[#71706F] mb-1">
              Alvo (adições)
            </label>
            <select
              id="diff-right"
              value={rightId}
              onChange={(e) => onRight(e.target.value)}
              className={selectClass}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} {v.is_active ? "(ativa)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0 overflow-y-auto flex-1 min-h-[280px]">
          <pre className="p-5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words border-r border-[#D3D1CE] bg-white">
            {ops
              .filter((op) => op.kind !== "add")
              .map((op, i) =>
                op.kind === "del" ? (
                  <mark key={i} className="bg-red-100 text-red-800 line-through decoration-red-400">
                    {op.text}
                  </mark>
                ) : (
                  <span key={i}>{op.text}</span>
                ),
              )}
          </pre>
          <pre className="p-5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
            {ops
              .filter((op) => op.kind !== "del")
              .map((op, i) =>
                op.kind === "add" ? (
                  <mark key={i} className="bg-emerald-100 text-emerald-900">
                    {op.text}
                  </mark>
                ) : (
                  <span key={i}>{op.text}</span>
                ),
              )}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default PromptsView;
