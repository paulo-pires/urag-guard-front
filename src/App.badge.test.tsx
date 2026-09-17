import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Todos os testes de Sidebar.test.tsx passam `badgeCounts` na mao. Isso prova que
// a prop FUNCIONA, nao que alguem a ALIMENTA. Ate este arquivo existir, o badge
// nunca apareceu no produto: prop com caminho de leitura e sem caminho de
// escrita (licao-coluna-sem-write-path, na versao front).
// vi.mock e icado para o topo do arquivo: nada de variavel de escopo externo
// dentro da fabrica. O stub mora em vi.hoisted, que roda antes.
const { getDashboardStats } = vi.hoisted(() => ({ getDashboardStats: vi.fn() }));

vi.mock("./lib/api", () => ({
  api: new Proxy(
    { getDashboardStats },
    {
      get: (alvo: any, prop: string) =>
        prop in alvo ? alvo[prop] : vi.fn().mockResolvedValue([]),
    }
  ),
  callMCPTool: vi.fn().mockResolvedValue({}),
}));

vi.mock("../lib/api", () => ({
  api: new Proxy(
    { getDashboardStats },
    {
      get: (alvo: any, prop: string) =>
        prop in alvo ? alvo[prop] : vi.fn().mockResolvedValue([]),
    }
  ),
  callMCPTool: vi.fn().mockResolvedValue({}),
}));

import App from "./App";

describe("App — alimenta o badge da navegação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardStats.mockResolvedValue({
      total_runs: 42,
      total_tokens: 0,
      total_cost_usd: 0,
      error_rate: 0,
      avg_latency_ms: 0,
      avg_eval_score: 0,
      guardrail_violations: 7,
      runs_over_time: [],
      cost_over_time: [],
      violations_over_time: [],
    });
  });

  it("busca as estatisticas e entrega guardrail_violations ao Sidebar", async () => {
    render(<App />);
    await waitFor(() => expect(getDashboardStats).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByTestId("sidebar-badge")).toHaveTextContent("7");
    });
  });

  it("nao quebra a navegacao quando a busca de estatisticas falha", async () => {
    getDashboardStats.mockRejectedValue(new Error("backend fora"));
    render(<App />);
    await waitFor(() => expect(getDashboardStats).toHaveBeenCalled());
    // a sidebar continua de pe, so sem badge
    expect(screen.queryByTestId("sidebar-badge")).toBeNull();
    // T3.2 ja corrigido no @urag/ui: o <nav aria-label> voltou a ser o landmark
    // e o role="tablist" foi para um container interno. Os dois coexistem — e e
    // isso que este teste protege, porque foi uma regressao real.
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
