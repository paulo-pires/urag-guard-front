import { DashboardStats, Run, Session, GuardrailRule, GuardrailEvent, EvalConfig, EvalScore, UsageGroup, Project, APIKey, QueryFilters, McpResponse, Prompt, PromptDetail, Dataset, DatasetItem, DatasetDiff } from "../types";

// ── MCP-only client for urag-observability-go (:8088) ────────────────────────

const OBSERVABILITY_PORT = 8088;

interface McpSession { sessionId: string; expiry: number; }
let mcpSession: McpSession | null = null;

function endpoint(): string {
  return '/mcp-proxy/';
}

function parseMcpResponse(body: string): McpResponse {
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (t.startsWith('data: ')) { try { return JSON.parse(t.slice(6)) as McpResponse; } catch { continue; } }
  }
  return JSON.parse(body) as McpResponse;
}

async function ensureSession(): Promise<string | null> {
  const now = Date.now();
  if (mcpSession && mcpSession.expiry > now) return mcpSession.sessionId;
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: `init_${now}`, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'urag-guard-front', version: '1.0' } }
      })
    });
    const sid = res.headers.get('Mcp-Session-Id');
    if (!sid) return null;
    await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Mcp-Session-Id': sid },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
    });
    mcpSession = { sessionId: sid, expiry: now + 5 * 60 * 1000 };
    return sid;
  } catch { return null; }
}

/** Call MCP tool. Assinatura compatível: (tool, args) ou (port, tool, args, ...). */
export async function callMCPTool<T = unknown>(
  a1: string | number,
  a2?: string | Record<string, unknown>,
  a3?: Record<string, unknown>,
  _token?: string,
  _config?: unknown
): Promise<T> {
  const tool = typeof a1 === 'number' ? (a2 as string) : (a1 as string);
  const args = (typeof a1 === 'number' ? (a3 || {}) : (a2 || {})) as Record<string, unknown>;

  const sid = await ensureSession();
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  if (sid) h['Mcp-Session-Id'] = sid;

  const res = await fetch(endpoint(), {
    method: 'POST', headers: h,
    body: JSON.stringify({ jsonrpc: '2.0', id: `mcp_${Date.now()}`, method: 'tools/call', params: { name: tool, arguments: args } })
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const body = await res.text();
  const json = parseMcpResponse(body);
  if (json.error) throw new Error(json.error.message || '');
  const result = json.result as any;
  if (result?.isError) throw new Error(result?.content?.[0]?.text || 'tool error');
  const txt = result?.content?.[0]?.text;
  if (!txt) throw new Error('empty MCP response');
  return JSON.parse(txt) as T;
}

/** REST fallback para features admin que o guard-go expõe mas não têm MCP. */
function apiUrl(path: string, params?: Record<string, unknown>): string {
  const base = window.location.origin;
  const url = new URL(path, base);
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v)); });
  return url.toString();
}
async function restGet<T>(path: string, p?: Record<string, unknown>): Promise<T> { const r = await fetch(apiUrl(path, p)); if (!r.ok) throw new Error(`REST ${r.status}`); return r.json(); }
async function restPost<T>(path: string, b?: unknown): Promise<T> { const r = await fetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); if (!r.ok) throw new Error(`REST POST ${r.status}`); return r.json(); }
async function restPut<T>(path: string, b: unknown): Promise<T> { const r = await fetch(apiUrl(path), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`REST PUT ${r.status}`); return r.json(); }
async function restDelete<T>(path: string): Promise<T> { const r = await fetch(apiUrl(path), { method: 'DELETE' }); if (!r.ok) throw new Error(`REST DELETE ${r.status}`); return r.json(); }

// ── Normalizers ───────────────────────────────────────────────────────────────

// The guard REST API uses snake_case names that differ from the frontend Session type.
// started_at → start_time, total_tokens → tokens_total, total_cost_usd → cost_total,
// duration_ms is computed from ended_at - started_at.
function normalizeSession(s: any): any {
  if (!s) return s;
  const startedAt: string = s.start_time ?? s.started_at ?? '';
  const endedAt: string | undefined = s.ended_at;
  const durationMs = s.duration_ms ?? (startedAt && endedAt
    ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
    : 0);
  return {
    ...s,
    start_time: startedAt,
    start_time_ms: s.start_time_ms ?? (startedAt ? new Date(startedAt).getTime() : 0),
    tokens_total: s.tokens_total ?? s.total_tokens ?? 0,
    cost_total: s.cost_total ?? s.total_cost_usd ?? 0,
    duration_ms: durationMs,
  };
}

// Normaliza um span do guard (started_at/ended_at/cost_usd) para o tipo Span do front.
function normalizeSpan(sp: any): any {
  if (!sp) return sp;
  return {
    ...sp,
    start_time: sp.start_time ?? sp.started_at ?? '',
    end_time: sp.end_time ?? sp.ended_at ?? sp.start_time ?? sp.started_at ?? '',
    cost: sp.cost ?? sp.cost_usd ?? 0,
  };
}

// Normaliza um guardrail event do guard (created_at/detail) para o tipo do front.
function normalizeGuardrailEvent(e: any): any {
  if (!e) return e;
  const ts: string = e.timestamp ?? e.created_at ?? '';
  return {
    ...e,
    timestamp: ts,
    timestamp_ms: e.timestamp_ms ?? (ts ? new Date(ts).getTime() : 0),
    details: e.details ?? e.detail ?? '',
  };
}

// Normaliza um run do guard (started_at/cost_usd/scores) para o tipo Run do front.
function normalizeRun(r: any): any {
  if (!r) return r;
  const ts: string = r.timestamp ?? r.started_at ?? r.created_at ?? '';
  const events = Array.isArray(r.guardrail_events) ? r.guardrail_events : [];
  const spans = Array.isArray(r.spans) ? r.spans.map(normalizeSpan) : [];
  const rawScores = Array.isArray(r.eval_scores) ? r.eval_scores : Array.isArray(r.scores) ? r.scores : [];
  const evalScores = rawScores.map((sc: any) => {
    const sts: string = sc.timestamp ?? sc.created_at ?? '';
    const v = Number(sc.value ?? 0);
    const verdict = sc.verdict ?? (v >= 0.7 ? 'pass' : v >= 0.5 ? 'warn' : 'fail');
    return {
      ...sc,
      metric: sc.metric ?? sc.eval_name ?? '',
      value: v,
      verdict,
      timestamp: sts,
      timestamp_ms: sc.timestamp_ms ?? (sts ? new Date(sts).getTime() : 0),
      comment: sc.comment ?? '',
      source: sc.source ?? 'system',
      annotator: sc.annotator ?? undefined,
    };
  });
  return {
    ...r,
    timestamp: ts,
    timestamp_ms: r.timestamp_ms ?? (ts ? new Date(ts).getTime() : 0),
    cost: r.cost ?? r.cost_usd ?? 0,
    tags: Array.isArray(r.tags) ? r.tags : [],
    spans,
    has_violation: r.has_violation ?? events.some((e: any) => e.verdict === 'flag' || e.verdict === 'block'),
    max_violation_verdict: r.max_violation_verdict ?? (events.some((e: any) => e.verdict === 'block') ? 'block' : events.some((e: any) => e.verdict === 'flag') ? 'flag' : undefined),
    guardrail_events: events.map(normalizeGuardrailEvent),
    eval_scores: evalScores,
  };
}

// Normaliza uma linha de usage do guard (runs/cost_usd → count/cost).
function normalizeUsage(u: any): any {
  if (!u) return u;
  return {
    ...u,
    count: u.count ?? u.runs ?? 0,
    cost: u.cost ?? u.cost_usd ?? 0,
  };
}

// Normaliza um eval config do guard (sample_rate → sampling_rate, defaults).
function normalizeEvalConfig(c: any): any {
  if (!c) return c;
  return {
    ...c,
    sampling_rate: c.sampling_rate ?? c.sample_rate ?? 0,
    scope: Array.isArray(c.scope) ? c.scope : [],
    threshold_warn: c.threshold_warn ?? 0,
    threshold_fail: c.threshold_fail ?? 0,
    enabled: !!c.enabled,
    config: c.config ?? {},
  };
}

// Normaliza um score do guard (eval_name/created_at) para o tipo EvalScore do front.
function normalizeScore(sc: any): any {
  if (!sc) return sc;
  const sts: string = sc.timestamp ?? sc.created_at ?? '';
  const v = Number(sc.value ?? 0);
  const verdict = sc.verdict ?? (v >= 0.7 ? 'pass' : v >= 0.5 ? 'warn' : 'fail');
  return {
    ...sc,
    metric: sc.metric ?? sc.eval_name ?? '',
    value: v,
    verdict,
    timestamp: sts,
    timestamp_ms: sc.timestamp_ms ?? (sts ? new Date(sts).getTime() : 0),
    comment: sc.comment ?? '',
    source: sc.source ?? 'system',
    annotator: sc.annotator ?? undefined,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // Dashboard Stats — MCP
  async getDashboardStats(filters: QueryFilters = {}): Promise<DashboardStats> {
    const raw = await callMCPTool('get_dashboard_stats', filters);
    return (raw as any)?.result ?? raw;
  },

  // Runs — MCP
  async getRuns(params: QueryFilters = {}): Promise<{ runs: Run[]; total: number; page: number; page_size: number; total_pages: number }> {
    // Remove filtros "sentinela" que o guard/observability trataria como valor
    // literal (ex: status="todos" e model="all" zerariam a listagem).
    const clean: QueryFilters = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '' || v === 'todos' || v === 'all') continue;
      clean[k] = v;
    }
    const raw = await callMCPTool('list_runs', clean);
    const d = (raw as any)?.result ?? raw;
    const items = (d?.runs ?? d?.items ?? []).map(normalizeRun);
    return { runs: items, total: d?.total ?? 0, page: d?.page ?? 1, page_size: d?.page_size ?? 20, total_pages: d?.total_pages ?? Math.ceil((d?.total ?? 0) / (d?.page_size ?? 20)) };
  },
  async getRun(id: string): Promise<Run & { guardrail_events: GuardrailEvent[]; eval_scores: EvalScore[] }> {
    const raw = await callMCPTool('get_run', { id });
    return normalizeRun((raw as any)?.result ?? raw);
  },

  // Sessions — MCP
  async getSessions(params: QueryFilters = {}): Promise<{ sessions: Session[]; total: number; page: number; page_size: number; total_pages: number }> {
    const raw = await callMCPTool('list_sessions', params);
    const d = (raw as any)?.result ?? raw;
    const items = (d?.sessions ?? d?.items ?? []).map(normalizeSession);
    return { sessions: items, total: d?.total ?? 0, page: d?.page ?? 1, page_size: d?.page_size ?? 20, total_pages: d?.total_pages ?? Math.ceil((d?.total ?? 0) / (d?.page_size ?? 20)) };
  },
  async getSession(id: string): Promise<Session & { runs: Run[]; total_violations: number; average_eval_score?: number }> {
    const raw = await callMCPTool('get_session', { id });
    const d = (raw as any)?.result ?? raw;
    return { ...normalizeSession(d), runs: (d?.runs ?? []).map(normalizeRun), total_violations: d?.total_violations ?? 0, average_eval_score: d?.average_eval_score };
  },

  // Guardrail Rules — REST (admin, sem MCP)
  async getGuardrailRules(): Promise<GuardrailRule[]> { return restGet('/v1/guardrail-rules'); },
  async createGuardrailRule(rule: Partial<GuardrailRule>): Promise<GuardrailRule> { return restPost('/v1/guardrail-rules', rule); },
  async updateGuardrailRule(id: string, rule: Partial<GuardrailRule>): Promise<GuardrailRule> { return restPut(`/v1/guardrail-rules/${id}`, rule); },
  async deleteGuardrailRule(id: string): Promise<{ success: boolean }> { return restDelete(`/v1/guardrail-rules/${id}`); },

  // Guardrail Events — MCP
  async getGuardrailEvents(params: QueryFilters = {}): Promise<{ events: GuardrailEvent[]; total: number; page: number; page_size: number; total_pages: number }> {
    const raw = await callMCPTool('list_guardrail_events', params);
    const d = (raw as any)?.result ?? raw;
    const items = (d?.events ?? d?.items ?? []).map(normalizeGuardrailEvent);
    return { events: items, total: d?.total ?? 0, page: d?.page ?? 1, page_size: d?.page_size ?? 20, total_pages: d?.total_pages ?? Math.ceil((d?.total ?? 0) / (d?.page_size ?? 20)) };
  },

  // Eval Configs — REST (admin, sem MCP)
  async getEvalConfigs(): Promise<EvalConfig[]> { return (await restGet<any[]>('/v1/eval-configs')).map(normalizeEvalConfig); },
  async createEvalConfig(config: Partial<EvalConfig>): Promise<EvalConfig> { return restPost('/v1/eval-configs', config); },
  async updateEvalConfig(id: string, config: Partial<EvalConfig>): Promise<EvalConfig> { return restPut(`/v1/eval-configs/${id}`, config); },
  async deleteEvalConfig(id: string): Promise<{ success: boolean }> { return restDelete(`/v1/eval-configs/${id}`); },

  // Scores — MCP
  async getScores(params: QueryFilters = {}): Promise<{ scores: EvalScore[]; total: number; page: number; page_size: number; total_pages: number }> {
    const raw = await callMCPTool('list_scores', params);
    const d = (raw as any)?.result ?? raw;
    const items = (d?.scores ?? d?.items ?? []).map(normalizeScore);
    return { scores: items, total: d?.total ?? 0, page: d?.page ?? 1, page_size: d?.page_size ?? 20, total_pages: d?.total_pages ?? Math.ceil((d?.total ?? 0) / (d?.page_size ?? 20)) };
  },

  // Anotação humana — reusa o mesmo pipeline de ingestão de score (ingest_score
  // → POST /v1/scores no guard), com source="human" explícito. É o passo que
  // faltava para calibrar o judge automático contra nota humana (GAP-02):
  // antes não havia como uma pessoa registrar avaliação nenhuma pelo dashboard.
  async annotateScore(input: { run_id: string; eval_name: string; value: 0 | 1; comment: string; annotator: string }): Promise<{ id: string }> {
    const raw = await callMCPTool('ingest_score', {
      run_id: input.run_id,
      eval_name: input.eval_name,
      value: input.value,
      comment: input.comment,
      annotator: input.annotator,
      source: 'human',
    });
    return (raw as any)?.result ?? raw;
  },

  // Usage — MCP
  async getUsage(params: QueryFilters = {}): Promise<UsageGroup[]> {
    const raw = await callMCPTool('get_usage_stats', params);
    const d = (raw as any)?.result ?? raw;
    const items = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
    return items.map(normalizeUsage);
  },

  // Projects & API Keys — REST (admin, sem MCP)
  async getProjects(): Promise<Project[]> { return restGet('/v1/projects'); },
  async createProject(name: string): Promise<{ id: string }> { return restPost('/v1/projects', { name }); },
  async getProjectAPIKeys(projectId: string): Promise<APIKey[]> { return restGet(`/v1/projects/${projectId}/api-keys`); },
  async createProjectAPIKey(projectId: string, kind: "ingest" | "dashboard"): Promise<{ key: string }> { return restPost(`/v1/projects/${projectId}/api-keys`, { kind }); },
  async deleteProjectAPIKey(projectId: string, keyId: string): Promise<{ status: string }> { return restDelete(`/v1/projects/${projectId}/api-keys/${keyId}`); },

  // Prompts — REST (admin, sem MCP). GET /v1/prompts, GET /v1/prompts/:id (com versões).
  async getPrompts(): Promise<Prompt[]> {
    const raw = await restGet<Prompt[] | { prompts?: Prompt[] }>('/v1/prompts');
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw?.prompts) ? raw.prompts : [];
  },
  async createPrompt(name: string, description?: string): Promise<{ id: string }> {
    return restPost('/v1/prompts', { name, description: description || '' });
  },
  async getPrompt(id: string): Promise<PromptDetail> {
    const raw = await restGet<PromptDetail>(`/v1/prompts/${id}`);
    return { ...raw, versions: Array.isArray(raw?.versions) ? raw.versions : [] };
  },
  async createPromptVersion(promptId: string, template: string, activate = false): Promise<{ id: string }> {
    return restPost(`/v1/prompts/${promptId}/versions`, { template, activate });
  },
  async activatePromptVersion(promptId: string, versionId: string): Promise<{ status: string }> {
    return restPost(`/v1/prompts/${promptId}/versions/${versionId}/activate`);
  },

  // Datasets & Diff — REST (admin, sem MCP)
  async getDatasets(): Promise<Dataset[]> {
    const raw = await restGet<Dataset[] | { datasets?: Dataset[] }>('/v1/datasets');
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw?.datasets) ? raw.datasets : [];
  },
  async getDataset(id: string): Promise<Dataset & { items?: DatasetItem[] }> {
    return restGet<Dataset & { items?: DatasetItem[] }>(`/v1/datasets/${id}`);
  },
  async createDataset(name: string, description?: string): Promise<{ id: string }> {
    return restPost('/v1/datasets', { name, description: description || '' });
  },
  async deleteDataset(id: string): Promise<{ status: string }> {
    return restDelete(`/v1/datasets/${id}`);
  },
  async getDatasetItems(id: string): Promise<DatasetItem[]> {
    const raw = await restGet<DatasetItem[] | { items?: DatasetItem[] }>(`/v1/datasets/${id}/items`);
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw?.items) ? raw.items : [];
  },
  async addDatasetItems(id: string, items: Array<{ input: unknown; expected_output?: unknown; metadata?: unknown }>): Promise<{ ids: string[] }> {
    return restPost(`/v1/datasets/${id}/items`, items);
  },
  async deleteDatasetItem(id: string, itemId: string): Promise<{ status: string }> {
    return restDelete(`/v1/datasets/${id}/items/${itemId}`);
  },
  async buildDatasetFromRuns(id: string, minScore = 0.9, limit = 100): Promise<{ dataset_id: string; created: number; item_ids: string[]; imported: number }> {
    const res = await restPost<{ dataset_id: string; created: number; item_ids: string[] }>(`/v1/datasets/${id}/from-runs?min_score=${minScore}&limit=${limit}`);
    return { ...res, imported: res.created };
  },
  async getDatasetDiff(baseId: string, compareToId: string): Promise<DatasetDiff> {
    return restGet<DatasetDiff>(`/v1/datasets/${baseId}/diff?compare_to=${encodeURIComponent(compareToId)}`);
  },
};

// ── Proxy Models ──────────────────────────────────────────────────────────────

interface ProxyModel {
  id: string;
  name?: string;
  provider: string;
  context_length?: number;
  tool_calling?: boolean;
  supports_vision?: boolean;
}

/**
 * Fetch list of available models from the proxy service (/v1/models).
 * Requires a valid authentication token in localStorage.
 */
export async function fetchModelsFromProxy(): Promise<ProxyModel[]> {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('No authentication token found');

  const baseURL = import.meta.env.DEV
    ? 'http://localhost:8090'
    : window.location.origin;

  const res = await fetch(`${baseURL}/v1/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized: Invalid or expired token');
    if (res.status === 402) throw new Error('Insufficient credits');
    throw new Error(`Failed to fetch models: ${res.statusText}`);
  }

  // Handle both direct model list and nested response format
  const data = (await res.json()) as { models?: ProxyModel[] } | ProxyModel[];
  if (Array.isArray(data)) return data;
  return data.models ?? [];
}
