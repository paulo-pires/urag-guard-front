import { DashboardStats, Run, Session, GuardrailRule, GuardrailEvent, EvalConfig, EvalScore, UsageGroup, QueryFilters, McpResponse } from "../types";

// ── MCP Streamable HTTP Client ────────────────────────────────────────────────

const OBSERVABILITY_PORT = 8091;

interface McpSession {
  sessionId: string;
  expiry: number;
}

let currentSession: McpSession | null = null;

function getEndpoint(): string {
  const base = window.location.origin;
  return `${base}:${OBSERVABILITY_PORT}/`;
}

function parseMcpResponse(body: string): McpResponse {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      try { return JSON.parse(trimmed.slice(6)) as McpResponse; } catch { continue; }
    }
  }
  return JSON.parse(body) as McpResponse;
}

async function ensureSession(): Promise<string | null> {
  const now = Date.now();
  if (currentSession && currentSession.expiry > now) {
    return currentSession.sessionId;
  }

  try {
    const res = await fetch(getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: `init_${now}`,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'urag-guard-front', version: '1.0.0' } }
      })
    });

    const sessionId = res.headers.get('Mcp-Session-Id');
    if (!sessionId) return null;

    // send initialized notification
    await fetch(getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Mcp-Session-Id': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
    });

    currentSession = { sessionId, expiry: now + 5 * 60 * 1000 };
    return sessionId;
  } catch {
    return null;
  }
}

async function callMCPTool<T = unknown>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
  const sessionId = await ensureSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const response = await fetch(getEndpoint(), {
    method: 'POST', headers,
    body: JSON.stringify({
      jsonrpc: '2.0', id: `call_${Date.now()}`,
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    })
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  const json = parseMcpResponse(body);
  if (json.error) throw new Error(json.error.message || 'MCP error');
  const rawText = json.result?.content?.[0]?.text;
  if (!rawText) throw new Error('Empty response');
  return JSON.parse(rawText) as T;
}

// ── MCP Wrappers (tools that already exist in urag-observability-go) ──────────

export const mcp = {
  // Runs (via guard adapter)
  async getRuns(params?: QueryFilters): Promise<{ runs: Run[]; total: number }> {
    return callMCPTool('list_runs', params || {});
  },

  // Sessions (via guard adapter)
  async getSessions(params?: QueryFilters): Promise<{ sessions: Session[]; total: number }> {
    return callMCPTool('list_sessions', params || {});
  },

  // Scores (via guard adapter)
  async getScores(params?: QueryFilters): Promise<{ scores: EvalScore[]; total: number }> {
    return callMCPTool('list_scores', params || {});
  },

  // Models (via modelops) — sem callers no front; shape livre, exige narrowing
  async listModels(): Promise<unknown> {
    return callMCPTool('list_models', {});
  },

  async detectDrift(params: QueryFilters): Promise<unknown> {
    return callMCPTool('detect_drift', params);
  },

  async runSimulation(params: QueryFilters): Promise<unknown> {
    return callMCPTool('run_simulation', params);
  },
};
