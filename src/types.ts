export interface Span {
  id: string;
  name: string;
  type: "llm_call" | "tool_call" | "retrieval" | "node_execution";
  start_time: string;
  end_time: string;
  latency_ms: number;
  parent_span_id?: string;
  input?: any;
  output?: any;
  tokens_in?: number;
  tokens_out?: number;
  cost?: number;
  metadata?: any;
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
  input: any;
  output: any;
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
  kpis: Kpis;
  recentRuns: Run[];
  recentEvents: GuardrailEvent[];
}

export interface UsageGroup {
  group: string;
  count: number;
  tokens_in: number;
  tokens_out: number;
  cost: number;
}
