export interface Span {
  id: string;
  name: string;
  type: "llm_call" | "tool_call" | "retrieval" | "node_execution";
  start_time: string;
  end_time: string;
  latency_ms: number;
  parent_span_id?: string;
  input?: unknown;
  output?: unknown;
  tokens_in?: number;
  tokens_out?: number;
  cost?: number;
  metadata?: unknown;
}

export interface GuardrailEvent {
  id: string;
  timestamp: string;
  timestamp_ms: number;
  run_id: string;
  rule_id: string;
  rule_name: string;
  stage: "input" | "output";
  verdict: "pass" | "flag" | "block" | "log";
  snippet: string;
  details?: string;
  source: string;
}

export interface EvalScore {
  id: string;
  timestamp: string;
  timestamp_ms: number;
  run_id: string;
  session_id?: string;
  metric: string;
  value: number; // 0 to 1
  verdict: "pass" | "warn" | "fail";
  comment: string;
}

export interface Run {
  id: string;
  timestamp: string;
  timestamp_ms: number;
  source: "proxy" | "uRag-go" | "uRag-agent-go" | "uRag-workflow-go" | "uRag-gateway-go";
  name: string;
  model: string;
  provider: string;
  status: "ok" | "erro";
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost: number;
  session_id?: string;
  input: unknown;
  output: unknown;
  has_violation: boolean;
  max_violation_verdict?: "flag" | "block" | "log";
  average_eval_score?: number;
  tags: string[];
  spans: Span[];
}

export interface Session {
  id: string;
  source: "proxy" | "uRag-go" | "uRag-agent-go" | "uRag-workflow-go" | "uRag-gateway-go";
  start_time: string;
  start_time_ms: number;
  duration_ms: number;
  run_count: number;
  tokens_total: number;
  cost_total: number;
  status: "ok" | "erro";
  user_id?: string;
}

export interface GuardrailRule {
  id: string;
  name: string;
  type: "prompt_injection" | "toxicity" | "pii" | "bias" | "custom_regex" | "custom_keyword";
  stage: "input" | "output" | "both";
  action: "block" | "flag" | "log";
  scope: string[];
  enabled: boolean;
  config: {
    regex?: string;
    case_insensitive?: boolean;
    keywords?: string[];
    threshold?: number;
    model?: string;
    scoring_model?: string;
    prompt?: string;
    include_reasoning?: boolean;
    strict_mode?: boolean;
    response_format?: string;
    description?: string;
  };
  updated_at: string;
}

export interface EvalConfig {
  id: string;
  name: string;
  metric: "faithfulness" | "answer_relevancy" | "context_recall" | "correctness" | "conciseness" | "custom";
  sampling_rate: number; // 0 to 100
  threshold_warn: number;
  threshold_fail: number;
  scope: string[];
  enabled: boolean;
  config?: {
    scoring_model?: string;
    prompt?: string;
    include_reasoning?: boolean;
    strict_mode?: boolean;
    response_format?: string;
    description?: string;
  };
  updated_at: string;
}

export interface Kpis {
  totalRuns: number;
  totalErrors: number;
  totalOk: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  violationsCount: number;
  blocksCount: number;
  flagsCount: number;
  averageEval: number;
  comparison: {
    runsDelta: string;
    costDelta: string;
    latencyDelta: string;
    violationsDelta: string;
    evalDelta: string;
    tokensDelta: string;
  };
}

export interface DashboardStats {
  total_runs: number;
  total_tokens: number;
  total_cost_usd: number;
  error_rate: number;
  avg_latency_ms: number;
  avg_eval_score: number;
  guardrail_violations: number;
  runs_over_time: { date: string; ok: number; error: number }[];
  cost_over_time: { date: string; cost_usd: number }[];
  violations_over_time: { date: string; block: number; flag: number }[];
}

export interface UsageGroup {
  group: string;
  count: number;
  tokens_in: number;
  tokens_out: number;
  cost: number;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface APIKey {
  id: string;
  project_id: string;
  key_prefix: string;
  kind: "ingest" | "dashboard";
  created_at: string;
  last_used_at?: string;
}

// ── Simulation / ModelOps types (from urag-simulation-front) ──────────────────

export type ModelProvider = string;

export interface ModelRegistry {
  id: string;
  name: string;
  provider: ModelProvider;
  modelName: string;
  endpointUrl: string;
  costPerMillionTokens: number;
  status: "UP" | "DOWN";
  updatedAt: string;
}

export interface MetricTimePoint {
  timestamp: string;
  latencyMs: number;
  tokensPerSecond: number;
  accuracyScore: number;
  driftScore: number;
}

export interface DriftMetrics {
  modelId: string;
  timestamp: string;
  latencyMs: number;
  tokensPerSecond: number;
  accuracyScore: number;
  driftScore: number;
  violationCount: number;
  status: "stable" | "warning" | "critical";
  metrics: Array<{
    timestamp: string;
    latency: number;
    accuracy: number;
    drift?: number;
    tokensPerSecond?: number;
  }>;
}

export interface SimulationVariant {
  name: string;
  modelId: string;
  temperature: number;
  systemPrompt: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  datasetName: string;
  variants: SimulationVariant[];
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress?: number;
  results?: {
    accuracyA: number;
    accuracyB: number;
    costA: number;
    costB: number;
    latencyAMs?: number;
    latencyBMs?: number;
    completedAt: string;
    winner?: string;
    summaryNotes?: string;
  };
}

export interface AuditViolationLog {
  id: string;
  modelId: string;
  modelName: string;
  timestamp: string;
  type: "Hallucination" | "High Latency" | "Drift Alert" | "Safety Policy" | "Token Overflow";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details: string;
  promptSample: string;
  responseSample: string;
}

export interface EvaluateRequest {
  modelId: string;
  prompt: string;
  response: string;
  groundTruth?: string;
}

export interface EvaluateResponse {
  score: number;
  relevance: number;
  factualAccuracy: number;
  hallucinationDetected: boolean;
  explanation: string;
}

export interface McpServerConfig {
  modelOpsPort: number;
  simulationPort: number;
  assurancePort: number;
  auditPort: number;
  host: string;
  token: string;
  forceDemoMode: boolean;
}

// ── MCP Streamable HTTP (JSON-RPC 2.0) ───────────────────────────────────────

/** Requisição JSON-RPC enviada ao servidor MCP. */
export interface McpRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

/** Parte de conteúdo da resposta MCP (content[].text carrega o JSON da tool). */
export interface McpContentPart {
  type?: string;
  text?: string;
}

/** Resposta JSON-RPC do servidor MCP (inicialização ou tools/call). */
export interface McpResponse {
  jsonrpc?: string;
  id?: string;
  result?: {
    content?: McpContentPart[];
  };
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

/** Filtros comuns de query (runs, sessions, scores, events, usage, stats). */
export interface QueryFilters {
  // Index signature: permite passar o objeto direto para payloads MCP/REST
  // (Record<string, unknown>) sem cast. Todos os campos explícitos abaixo
  // obedecem a esse domínio de valores.
  [key: string]: string | number | boolean | undefined;
  from?: string;
  to?: string;
  source?: string;
  env?: string;
  rule?: string;
  metric?: string;
  verdict?: string;
  run_id?: string;
  session_id?: string;
  groupBy?: string;
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
  tenant_id?: string;
  // Filtros usados por RunsView (list_runs no guard/observability)
  status?: string;
  model?: string;
  query?: string;
  only_violations?: boolean;
  score_min?: number;
  score_max?: number;
}

