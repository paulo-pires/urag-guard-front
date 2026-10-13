import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  FlaskConical,
  KeyRound,
  Loader2,
  Play,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { readSession } from "../hooks/useAccountSession";

// Playground de comparação (IGN-133): mesmo prompt em até 4 modelos do Ignus
// Code, com contexto opcional das bases do IgnusTec IA. Tudo passa pelo
// servidor do guard (/api/playground), que guarda a chave do tenant e valida
// a sessão no identity — o navegador nunca vê a sk_ic_.

const MAX_MODELS = 4;
const IGNUS_CODE_URL = "https://providerlm.ignustec.com.br";

interface Config {
  tenant: { id: string; name: string };
  email: string;
  canManage: boolean;
  ignusCode: { configured: boolean; last4: string | null; updatedBy: string | null; updatedAt: string | null };
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  tenant_name: string;
  document_count: number;
  chunk_count: number;
}

interface Hit {
  content: string;
  score: number;
  source: string | null;
  headingPath: string[];
}

interface RunResult {
  model: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  output?: string;
  finishReason?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: number | null;
  servedBy?: string | null;
  error?: string;
}

interface RunResponse {
  sessionId: string;
  context: Hit[];
  results: RunResult[];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/playground${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Session-Token": readSession(), ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, code: body.error });
  return body as T;
}

function modelsFromUrl(): string[] {
  try {
    const raw = new URLSearchParams(window.location.search).get("models") || "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_MODELS);
  } catch {
    return [];
  }
}

interface Props {
  onNavigateToTab: (tab: string) => void;
}

export const PlaygroundView: React.FC<Props> = ({ onNavigateToTab }) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [bases, setBases] = useState<KnowledgeBase[] | null>(null);
  const [basesError, setBasesError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [missingFromUrl, setMissingFromUrl] = useState<string[]>([]);
  const [kbIds, setKbIds] = useState<string[]>([]);
  const [system, setSystem] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [run, setRun] = useState<RunResponse | null>(null);

  async function loadConfig() {
    setConfigError(null);
    try {
      setConfig(await api<Config>("/config"));
    } catch (e) {
      const err = e as Error & { status?: number };
      setConfigError(err.status === 401 ? "Sua sessão expirou. Entre de novo." : err.message);
    }
  }

  async function loadModels() {
    setModelsError(null);
    try {
      const d = await api<{ models: { id: string }[] }>("/models");
      const ids = d.models.map((m) => m.id).sort();
      setModels(ids);
      const wanted = modelsFromUrl();
      if (wanted.length) {
        setSelected(wanted.filter((id) => ids.includes(id)));
        setMissingFromUrl(wanted.filter((id) => !ids.includes(id)));
      }
    } catch (e) {
      const err = e as Error & { code?: string };
      setModelsError(
        err.code === "ignus_key_invalid" ? "A chave Ignus Code cadastrada foi recusada. Um administrador precisa trocá-la." : err.message,
      );
    }
  }

  async function loadBases() {
    setBasesError(null);
    try {
      setBases((await api<{ bases: KnowledgeBase[] }>("/knowledge-bases")).bases);
    } catch (e) {
      setBasesError((e as Error).message);
      setBases([]);
    }
  }

  useEffect(() => {
    loadConfig();
    loadBases();
  }, []);

  useEffect(() => {
    if (config?.ignusCode.configured) loadModels();
  }, [config?.ignusCode.configured]);

  async function execute() {
    setRunning(true);
    setRunError(null);
    try {
      setRun(
        await api<RunResponse>("/run", {
          method: "POST",
          body: JSON.stringify({ models: selected, prompt, system, kb_ids: kbIds, temperature, max_tokens: maxTokens }),
        }),
      );
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (configError) {
    return (
      <Panel>
        <p className="text-sm text-red-700">{configError}</p>
      </Panel>
    );
  }
  if (!config) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-[#6e6d68]">
        <Loader2 size={16} className="animate-spin" /> Carregando…
      </div>
    );
  }

  const canRun = config.ignusCode.configured && selected.length > 0 && prompt.trim().length > 0 && !running;

  return (
    <div className="space-y-6 animate-fadeIn text-[#1a1a1a]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical size={18} /> Comparar modelos
          </h1>
          <p className="text-xs text-[#6e6d68] mt-1 max-w-2xl">
            O mesmo prompt em até {MAX_MODELS} modelos do Ignus Code, com contexto opcional das suas bases de conhecimento.
            As chamadas usam a chave Ignus Code do workspace {config.tenant.name ? <strong>{config.tenant.name}</strong> : null} e
            cada comparação fica registrada como uma conversa no Guard.
          </p>
        </div>
        <a
          href={`${IGNUS_CODE_URL}/models/compare${selected.length ? `?m=${selected.join(",")}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#6e6d68] hover:text-[#1a1a1a]"
        >
          Preço e limites no Ignus Code <ExternalLink size={12} />
        </a>
      </div>

      <KeyCard config={config} onChange={loadConfig} />

      {config.ignusCode.configured && (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Configuração */}
          <div className="space-y-4">
            <Panel title="Modelos" hint={`${selected.length} de ${MAX_MODELS}`}>
              {missingFromUrl.length > 0 && (
                <p className="mb-2 flex gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  Fora do que a sua chave pode chamar: {missingFromUrl.join(", ")}
                </p>
              )}
              {modelsError ? (
                <p className="text-xs text-red-700">{modelsError}</p>
              ) : (
                <ModelPicker all={models} selected={selected} onChange={setSelected} />
              )}
            </Panel>

            <Panel title="Bases de conhecimento" hint="IgnusTec IA">
              <KnowledgePicker bases={bases} error={basesError} selected={kbIds} onChange={setKbIds} />
            </Panel>

            <Panel title="Parâmetros">
              <label className="block text-xs text-[#6e6d68]">
                Temperatura <span className="font-mono text-[#1a1a1a]">{temperature.toFixed(1)}</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="mt-1 w-full accent-[#1a1a1a]"
                />
              </label>
              <label className="mt-3 block text-xs text-[#6e6d68]">
                Máximo de tokens na resposta
                <input
                  type="number"
                  min={16}
                  max={4096}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Math.min(4096, Math.max(16, Number(e.target.value) || 16)))}
                  className="mt-1 h-8 w-full rounded-md border border-[#e6e4df] bg-white px-2 font-mono text-xs text-[#1a1a1a]"
                />
              </label>
            </Panel>
          </div>

          {/* Prompt + resultados */}
          <div className="min-w-0 space-y-4">
            <Panel>
              <button
                type="button"
                onClick={() => setShowSystem((v) => !v)}
                className="mb-2 inline-flex items-center gap-1 text-xs text-[#6e6d68] hover:text-[#1a1a1a]"
                aria-expanded={showSystem}
              >
                <ChevronDown size={12} className={showSystem ? "" : "-rotate-90"} /> Instruções do sistema
                {system && !showSystem && <span className="ml-1 rounded bg-[#f5f4f0] px-1">definidas</span>}
              </button>
              {showSystem && (
                <textarea
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Você é um assistente jurídico. Responda em português, de forma objetiva."
                  className="mb-3 w-full rounded-md border border-[#e6e4df] bg-white p-2.5 text-sm"
                />
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canRun) execute();
                }}
                rows={5}
                aria-label="Prompt"
                placeholder="Escreva a pergunta que todos os modelos vão responder…"
                className="w-full rounded-md border border-[#e6e4df] bg-white p-2.5 text-sm"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[#6e6d68]">
                  {kbIds.length
                    ? `Busca em ${kbIds.length} base${kbIds.length > 1 ? "s" : ""} e manda o mesmo contexto a todos.`
                    : "Sem base de conhecimento: só o prompt."}{" "}
                  Ctrl+Enter para rodar.
                </p>
                <button
                  type="button"
                  onClick={execute}
                  disabled={!canRun}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {running ? "Rodando…" : `Rodar em ${selected.length || "—"} modelo${selected.length === 1 ? "" : "s"}`}
                </button>
              </div>
              {runError && <p className="mt-2 text-xs text-red-700">{runError}</p>}
            </Panel>

            {run && <Results run={run} onOpenSession={() => onNavigateToTab(`session-detail-${run.sessionId}`)} />}
          </div>
        </div>
      )}
    </div>
  );
};

function Panel({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e6e4df] bg-white p-4 shadow-xs">
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6e6d68]">{title}</h2>
          {hint && <span className="text-[11px] text-[#6e6d68]">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function KeyCard({ config, onChange }: { config: Config; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const k = config.ignusCode;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/ignus-key", { method: "PUT", body: JSON.stringify({ api_key: value.trim() }) });
      setValue("");
      setEditing(false);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remover a chave Ignus Code deste workspace? O playground para de funcionar até cadastrar outra.")) return;
    try {
      await api("/ignus-key", { method: "DELETE" });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (k.configured && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#e6e4df] bg-[#f5f4f0] px-3 py-2 text-xs">
        <KeyRound size={13} className="text-[#6e6d68]" />
        <span>
          Chave Ignus Code <span className="font-mono">sk_ic_••••{k.last4}</span>
        </span>
        {k.updatedBy && <span className="text-[#6e6d68]">· cadastrada por {k.updatedBy}</span>}
        {config.canManage && (
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="font-medium hover:underline">
              Trocar
            </button>
            <button type="button" onClick={remove} className="text-[#6e6d68] hover:text-red-700" aria-label="Remover chave">
              <Trash2 size={13} />
            </button>
          </span>
        )}
        {error && <span className="w-full text-red-700">{error}</span>}
      </div>
    );
  }

  return (
    <Panel>
      <div className="flex gap-3">
        <div className="rounded-lg border border-[#e6e4df] bg-[#f5f4f0] p-2 h-fit">
          <KeyRound size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{k.configured ? "Trocar a chave Ignus Code" : "Conecte o Ignus Code"}</h2>
          <p className="mt-1 text-xs text-[#6e6d68]">
            O playground chama os modelos com uma chave <span className="font-mono">sk_ic_</span> do workspace: os testes saem
            dos créditos dela e respeitam a política de modelos e os limites da chave. Crie uma em{" "}
            <a href={`${IGNUS_CODE_URL}/dashboard/api-keys`} target="_blank" rel="noopener noreferrer" className="underline">
              Ignus Code › API keys
            </a>
            .
          </p>
          {config.canManage ? (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) save();
              }}
            >
              <input
                type="password"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk_ic_…"
                aria-label="Chave Ignus Code"
                className="h-9 min-w-0 flex-1 rounded-md border border-[#e6e4df] bg-white px-2.5 font-mono text-xs"
              />
              <button
                type="submit"
                disabled={saving || !value.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Validar e salvar
              </button>
              {k.configured && (
                <button type="button" onClick={() => setEditing(false)} className="h-9 px-2 text-sm text-[#6e6d68]">
                  Cancelar
                </button>
              )}
            </form>
          ) : (
            <p className="mt-3 rounded-md border border-[#e6e4df] bg-[#f5f4f0] p-2 text-xs">
              Só um administrador do workspace pode cadastrar a chave.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
        </div>
      </div>
    </Panel>
  );
}

function ModelPicker({ all, selected, onChange }: { all: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter((id) => !selected.includes(id) && id.toLowerCase().includes(q)).slice(0, 8);
  }, [all, selected, query]);
  const full = selected.length >= MAX_MODELS;

  return (
    <div>
      {selected.length > 0 && (
        <ul className="mb-2 space-y-1">
          {selected.map((id) => (
            <li key={id} className="flex items-center gap-2 rounded-md border border-[#e6e4df] bg-[#f5f4f0] py-1 pl-2 pr-1">
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={id}>
                {id}
              </span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((m) => m !== id))}
                className="rounded p-0.5 text-[#6e6d68] hover:bg-white hover:text-[#1a1a1a]"
                aria-label={`Remover ${id}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e6d68]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={full}
          placeholder={full ? `Limite de ${MAX_MODELS} modelos` : `Buscar entre ${all.length} modelos…`}
          aria-label="Buscar modelo"
          className="h-8 w-full rounded-md border border-[#e6e4df] bg-white pl-8 pr-2 text-xs disabled:bg-[#f5f4f0]"
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-1 max-h-60 overflow-y-auto rounded-md border border-[#e6e4df] bg-white">
          {results.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, id]);
                  setQuery("");
                }}
                className="block w-full truncate px-2.5 py-1.5 text-left font-mono text-xs hover:bg-[#f5f4f0]"
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KnowledgePicker({
  bases,
  error,
  selected,
  onChange,
}: {
  bases: KnowledgeBase[] | null;
  error: string | null;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (bases === null) return <p className="text-xs text-[#6e6d68]">Carregando…</p>;
  if (error) return <p className="text-xs text-red-700">Não foi possível carregar as bases: {error}</p>;
  if (!bases.length) {
    return (
      <p className="text-xs text-[#6e6d68]">
        Nenhuma base encontrada para o seu e-mail no IgnusTec IA. Crie uma em{" "}
        <a href="https://ia.ignustec.com.br/dashboard/knowledge" target="_blank" rel="noopener noreferrer" className="underline">
          Base de conhecimento
        </a>
        .
      </p>
    );
  }
  const multiTenant = new Set(bases.map((b) => b.tenant_name)).size > 1;
  return (
    <ul className="space-y-1">
      {bases.map((b) => {
        const on = selected.includes(b.id);
        const empty = b.chunk_count === 0;
        return (
          <li key={b.id}>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-[#f5f4f0] ${empty ? "opacity-60" : ""}`}
              title={b.description ?? undefined}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? selected.filter((id) => id !== b.id) : [...selected, b.id])}
                className="mt-0.5 accent-[#1a1a1a]"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-xs font-medium">
                  <BookOpen size={11} className="shrink-0 text-[#6e6d68]" />
                  <span className="truncate">{b.name}</span>
                </span>
                <span className="block text-[11px] text-[#6e6d68]">
                  {b.document_count} doc{b.document_count === 1 ? "" : "s"} · {b.chunk_count} trechos
                  {multiTenant && ` · ${b.tenant_name}`}
                  {empty && " · ainda sem conteúdo indexado"}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

// Classes literais: o Tailwind só gera o que aparece inteiro no código.
const GRID_COLS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 2xl:grid-cols-3",
  4: "md:grid-cols-2 2xl:grid-cols-4",
};

function Results({ run, onOpenSession }: { run: RunResponse; onOpenSession: () => void }) {
  const ok = run.results.filter((r) => r.ok);
  const fastest = ok.length > 1 ? Math.min(...ok.map((r) => r.latencyMs)) : null;
  const costs = ok.map((r) => r.costUsd).filter((c): c is number => typeof c === "number");
  const cheapest = costs.length > 1 && new Set(costs).size > 1 ? Math.min(...costs) : null;
  const [showContext, setShowContext] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6e6d68]">Respostas</h2>
        <button type="button" onClick={onOpenSession} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
          Abrir a conversa no Guard para avaliar <ExternalLink size={12} />
        </button>
      </div>

      {run.context.length > 0 && (
        <div className="rounded-lg border border-[#e6e4df] bg-white">
          <button
            type="button"
            onClick={() => setShowContext((v) => !v)}
            aria-expanded={showContext}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs text-[#6e6d68] hover:text-[#1a1a1a]"
          >
            <ChevronDown size={12} className={showContext ? "" : "-rotate-90"} />
            <BookOpen size={12} /> Contexto enviado: {run.context.length} trecho{run.context.length > 1 ? "s" : ""} das bases
          </button>
          {showContext && (
            <ol className="space-y-2 border-t border-[#e6e4df] p-3">
              {run.context.map((h, i) => (
                <li key={i} className="text-xs">
                  <p className="font-medium">
                    [{i + 1}] {[h.source, ...h.headingPath].filter(Boolean).join(" › ") || "sem origem"}
                    <span className="ml-1 font-mono font-normal text-[#6e6d68]">{h.score.toFixed(3)}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap text-[#555249]">{h.content}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className={`grid gap-3 ${GRID_COLS[run.results.length] ?? ""}`}>
        {run.results.map((r) => (
          <ResultCard key={r.model} r={r} fastest={r.ok && r.latencyMs === fastest} cheapest={r.ok && cheapest !== null && r.costUsd === cheapest} />
        ))}
      </div>
    </div>
  );
}

const ResultCard: React.FC<{ r: RunResult; fastest: boolean; cheapest: boolean }> = ({ r, fastest, cheapest }) => {
  const [copied, setCopied] = useState(false);
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[#e6e4df] bg-white shadow-xs">
      <header className="border-b border-[#e6e4df] px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate font-mono text-xs font-semibold" title={r.model}>
            {r.model}
          </p>
          {r.ok && r.output && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(r.output ?? "");
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded p-0.5 text-[#6e6d68] hover:text-[#1a1a1a]"
              aria-label={`Copiar resposta de ${r.model}`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#6e6d68]">
          <span className={`inline-flex items-center gap-1 ${fastest ? "font-semibold text-emerald-700" : ""}`}>
            <Clock size={11} /> {(r.latencyMs / 1000).toFixed(1)}s{fastest && " · mais rápido"}
          </span>
          {r.ok && (
            <span className="inline-flex items-center gap-1">
              <Zap size={11} /> {r.tokensIn ?? "—"} → {r.tokensOut ?? "—"} tokens
            </span>
          )}
          {r.ok && (
            <span className={`inline-flex items-center gap-1 ${cheapest ? "font-semibold text-emerald-700" : ""}`}>
              <DollarSign size={11} /> {typeof r.costUsd === "number" ? `$${r.costUsd.toFixed(6)}` : "—"}
              {cheapest && " · mais barato"}
            </span>
          )}
          {r.servedBy && <span>via {r.servedBy}</span>}
        </div>
      </header>
      <div className="min-h-24 flex-1 px-3 py-2.5">
        {r.ok ? (
          <>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{r.output || <em className="text-[#6e6d68]">Resposta vazia.</em>}</p>
            {r.finishReason === "length" && (
              <p className="mt-2 text-[11px] text-amber-800">Cortada no limite de tokens: aumente o máximo para ver o resto.</p>
            )}
          </>
        ) : (
          <p className="flex gap-1.5 text-xs text-red-700">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {r.error}
          </p>
        )}
      </div>
    </article>
  );
};
