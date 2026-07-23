import { DashboardStats, Run, Session, GuardrailRule, GuardrailEvent, EvalConfig, EvalScore, UsageGroup, Project, APIKey } from "../types";

const getApiUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== "") {
        url.searchParams.append(key, String(val));
      }
    });
  }
  return url.toString();
};

export const api = {
  // Stats
  async getDashboardStats(filters: { from?: string; to?: string; source?: string; env?: string }): Promise<DashboardStats> {
    const res = await fetch(getApiUrl("/v1/overview/stats", filters));
    if (!res.ok) throw new Error("Failed to load dashboard stats");
    return res.json();
  },

  // Runs
  async getRuns(params: {
    from?: string;
    to?: string;
    source?: string;
    status?: string;
    model?: string;
    query?: string;
    only_violations?: boolean;
    score_min?: number;
    score_max?: number;
    page?: number;
    page_size?: number;
    env?: string;
  }): Promise<{ runs: Run[]; total: number; page: number; page_size: number; total_pages: number }> {
    const res = await fetch(getApiUrl("/v1/runs", params));
    if (!res.ok) throw new Error("Failed to load runs list");
    return res.json();
  },

  async getRun(id: string): Promise<Run & { guardrail_events: GuardrailEvent[]; eval_scores: EvalScore[] }> {
    const res = await fetch(getApiUrl(`/v1/runs/${id}`));
    if (!res.ok) throw new Error(`Failed to load run detail for ${id}`);
    return res.json();
  },

  // Sessions
  async getSessions(params: {
    from?: string;
    to?: string;
    source?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ sessions: Session[]; total: number; page: number; page_size: number; total_pages: number }> {
    const res = await fetch(getApiUrl("/v1/sessions", params));
    if (!res.ok) throw new Error("Failed to load sessions list");
    return res.json();
  },

  async getSession(id: string): Promise<Session & { runs: Run[]; total_violations: number; average_eval_score?: number }> {
    const res = await fetch(getApiUrl(`/v1/sessions/${id}`));
    if (!res.ok) throw new Error(`Failed to load session detail for ${id}`);
    return res.json();
  },

  // Rules (CRUD)
  async getGuardrailRules(): Promise<GuardrailRule[]> {
    const res = await fetch(getApiUrl("/v1/guardrail-rules"));
    if (!res.ok) throw new Error("Failed to load guardrail rules");
    return res.json();
  },

  async createGuardrailRule(rule: Partial<GuardrailRule>): Promise<GuardrailRule> {
    const res = await fetch(getApiUrl("/v1/guardrail-rules"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error("Failed to create guardrail rule");
    return res.json();
  },

  async updateGuardrailRule(id: string, rule: Partial<GuardrailRule>): Promise<GuardrailRule> {
    const res = await fetch(getApiUrl(`/v1/guardrail-rules/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error(`Failed to update guardrail rule ${id}`);
    return res.json();
  },

  async deleteGuardrailRule(id: string): Promise<{ success: boolean }> {
    const res = await fetch(getApiUrl(`/v1/guardrail-rules/${id}`), {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete guardrail rule ${id}`);
    return res.json();
  },

  // Guardrail Events
  async getGuardrailEvents(params: {
    from?: string;
    to?: string;
    source?: string;
    rule?: string;
    verdict?: string;
    page?: number;
    page_size?: number;
    env?: string;
  }): Promise<{ events: GuardrailEvent[]; total: number; page: number; page_size: number; total_pages: number }> {
    const res = await fetch(getApiUrl("/v1/guardrail-events", params));
    if (!res.ok) throw new Error("Failed to load guardrail events");
    return res.json();
  },

  // Eval Configs (CRUD)
  async getEvalConfigs(): Promise<EvalConfig[]> {
    const res = await fetch(getApiUrl("/v1/eval-configs"));
    if (!res.ok) throw new Error("Failed to load eval configs");
    return res.json();
  },

  async createEvalConfig(config: Partial<EvalConfig>): Promise<EvalConfig> {
    const res = await fetch(getApiUrl("/v1/eval-configs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error("Failed to create eval config");
    return res.json();
  },

  async updateEvalConfig(id: string, config: Partial<EvalConfig>): Promise<EvalConfig> {
    const res = await fetch(getApiUrl(`/v1/eval-configs/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to update eval config ${id}`);
    return res.json();
  },

  async deleteEvalConfig(id: string): Promise<{ success: boolean }> {
    const res = await fetch(getApiUrl(`/v1/eval-configs/${id}`), {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete eval config ${id}`);
    return res.json();
  },

  // Scores
  async getScores(params: {
    from?: string;
    to?: string;
    source?: string;
    metric?: string;
    verdict?: string;
    run_id?: string;
    session_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ scores: EvalScore[]; total: number; page: number; page_size: number; total_pages: number }> {
    const res = await fetch(getApiUrl("/v1/scores", params));
    if (!res.ok) throw new Error("Failed to load scores");
    return res.json();
  },

  // Usage
  async getUsage(params: {
    from?: string;
    to?: string;
    source?: string;
    groupBy?: "model" | "provider" | "source" | "user" | "day";
  }): Promise<UsageGroup[]> {
    const res = await fetch(getApiUrl("/v1/usage", params));
    if (!res.ok) throw new Error("Failed to load usage statistics");
    return res.json();
  },

  // Projects & API Keys
  async getProjects(): Promise<Project[]> {
    const res = await fetch(getApiUrl("/v1/projects"));
    if (!res.ok) throw new Error("Failed to load projects");
    return res.json();
  },

  async createProject(name: string): Promise<{ id: string }> {
    const res = await fetch(getApiUrl("/v1/projects"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
  },

  async getProjectAPIKeys(projectId: string): Promise<APIKey[]> {
    const res = await fetch(getApiUrl(`/v1/projects/${projectId}/api-keys`));
    if (!res.ok) throw new Error("Failed to load project API keys");
    return res.json();
  },

  async createProjectAPIKey(projectId: string, kind: "ingest" | "dashboard"): Promise<{ key: string }> {
    const res = await fetch(getApiUrl(`/v1/projects/${projectId}/api-keys`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!res.ok) throw new Error("Failed to create API key");
    return res.json();
  },

  async deleteProjectAPIKey(projectId: string, keyId: string): Promise<{ status: string }> {
    const res = await fetch(getApiUrl(`/v1/projects/${projectId}/api-keys/${keyId}`), {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete API key");
    return res.json();
  },
};
