import { DashboardStats, Run, Session, GuardrailRule, GuardrailEvent, EvalConfig, EvalScore, UsageGroup, Project, APIKey } from "../types";

// ── MCP-only client for urag-observability-go (:8091) ────────────────────────

const OBSERVABILITY_PORT = 8091;

interface McpSession { sessionId: string; expiry: number; }
let mcpSession: McpSession | null = null;

function endpoint(): string {
  if (import.meta.env.DEV) return `/mcp-proxy/${OBSERVABILITY_PORT}/`;
  return `${window.location.origin}:${OBSERVABILITY_PORT}/`;
}

function parseMcpResponse(body: string): any {
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (t.startsWith('data: ')) { try { return JSON.parse(t.slice(6)); } catch { continue; } }
  }
  return JSON.parse(body);
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
export async function callMCPTool<T = any>(
  a1: string | number,
  a2?: string | Record<string, any>,
  a3?: Record<string, any>,
  _token?: string,
  _config?: any
): Promise<T> {
  const tool = typeof a1 === 'number' ? (a2 as string) : (a1 as string);
  const args = (typeof a1 === 'number' ? (a3 || {}) : (a2 || {})) as Record<string, any>;

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
  const txt = json.result?.content?.[0]?.text;
  if (!txt) throw new Error('empty MCP response');
  return JSON.parse(txt) as T;
}

/** REST fallback para features admin que o guard-go expõe mas não têm MCP. */
function apiUrl(path: string, params?: Record<string, any>): string {
  const base = import.meta.env.DEV ? `http://localhost:${OBSERVABILITY_PORT}` : `${window.location.origin}:${OBSERVABILITY_PORT}`;
  const url = new URL(path, base);
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v)); });
  return url.toString();
}
async function restGet<T>(path: string, p?: any): Promise<T> { const r = await fetch(apiUrl(path, p)); if (!r.ok) throw new Error(`REST ${r.status}`); return r.json(); }
async function restPost<T>(path: string, b?: any): Promise<T> { const r = await fetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); if (!r.ok) throw new Error(`REST POST ${r.status}`); return r.json(); }
async function restPut<T>(path: string, b: any): Promise<T> { const r = await fetch(apiUrl(path), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`REST PUT ${r.status}`); return r.json(); }
async function restDelete<T>(path: string): Promise<T> { const r = await fetch(apiUrl(path), { method: 'DELETE' }); if (!r.ok) throw new Error(`REST DELETE ${r.status}`); return r.json(); }

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // Dashboard Stats — MCP
  async getDashboardStats(filters: any = {}): Promise<DashboardStats> {
    return callMCPTool('get_dashboard_stats', filters);
  },

  // Runs — MCP
  async getRuns(params: any = {}): Promise<{ runs: Run[]; total: number; page: number; page_size: number; total_pages: number }> {
    return callMCPTool('list_runs', params);
  },
  async getRun(id: string): Promise<Run & { guardrail_events: GuardrailEvent[]; eval_scores: EvalScore[] }> {
    return callMCPTool('get_run', { id });
  },

  // Sessions — MCP
  async getSessions(params: any = {}): Promise<{ sessions: Session[]; total: number; page: number; page_size: number; total_pages: number }> {
    return callMCPTool('list_sessions', params);
  },
  async getSession(id: string): Promise<Session & { runs: Run[]; total_violations: number; average_eval_score?: number }> {
    return callMCPTool('get_session', { id });
  },

  // Guardrail Rules — REST (admin, sem MCP)
  async getGuardrailRules(): Promise<GuardrailRule[]> { return restGet('/v1/guardrail-rules'); },
  async createGuardrailRule(rule: Partial<GuardrailRule>): Promise<GuardrailRule> { return restPost('/v1/guardrail-rules', rule); },
  async updateGuardrailRule(id: string, rule: Partial<GuardrailRule>): Promise<GuardrailRule> { return restPut(`/v1/guardrail-rules/${id}`, rule); },
  async deleteGuardrailRule(id: string): Promise<{ success: boolean }> { return restDelete(`/v1/guardrail-rules/${id}`); },

  // Guardrail Events — MCP
  async getGuardrailEvents(params: any = {}): Promise<{ events: GuardrailEvent[]; total: number; page: number; page_size: number; total_pages: number }> {
    return callMCPTool('list_guardrail_events', params);
  },

  // Eval Configs — REST (admin, sem MCP)
  async getEvalConfigs(): Promise<EvalConfig[]> { return restGet('/v1/eval-configs'); },
  async createEvalConfig(config: Partial<EvalConfig>): Promise<EvalConfig> { return restPost('/v1/eval-configs', config); },
  async updateEvalConfig(id: string, config: Partial<EvalConfig>): Promise<EvalConfig> { return restPut(`/v1/eval-configs/${id}`, config); },
  async deleteEvalConfig(id: string): Promise<{ success: boolean }> { return restDelete(`/v1/eval-configs/${id}`); },

  // Scores — MCP
  async getScores(params: any = {}): Promise<{ scores: EvalScore[]; total: number; page: number; page_size: number; total_pages: number }> {
    return callMCPTool('list_scores', params);
  },

  // Usage — MCP
  async getUsage(params: any = {}): Promise<UsageGroup[]> {
    return callMCPTool('get_usage_stats', params);
  },

  // Projects & API Keys — REST (admin, sem MCP)
  async getProjects(): Promise<Project[]> { return restGet('/v1/projects'); },
  async createProject(name: string): Promise<{ id: string }> { return restPost('/v1/projects', { name }); },
  async getProjectAPIKeys(projectId: string): Promise<APIKey[]> { return restGet(`/v1/projects/${projectId}/api-keys`); },
  async createProjectAPIKey(projectId: string, kind: "ingest" | "dashboard"): Promise<{ key: string }> { return restPost(`/v1/projects/${projectId}/api-keys`, { kind }); },
  async deleteProjectAPIKey(projectId: string, keyId: string): Promise<{ status: string }> { return restDelete(`/v1/projects/${projectId}/api-keys/${keyId}`); },
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

  const data = await res.json();

  // Handle both direct model list and nested response format
  return (data.models || data || []) as ProxyModel[];
}
