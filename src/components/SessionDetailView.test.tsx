import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const getSession = vi.fn();
const getRuns = vi.fn();
vi.mock("../lib/api", () => ({ api: { getSession: (...a: unknown[]) => getSession(...a), getRuns: (...a: unknown[]) => getRuns(...a) } }));

import SessionDetailView from "./SessionDetailView";

// O playground (IGN-133) linka a conversa pelo id EXTERNO (X-Urag-Session). O
// get_session resolve; os passos têm de ser buscados pelo id interno devolvido.
test("busca os passos pelo id interno da sessão resolvida", async () => {
  getSession.mockResolvedValue({
    id: "interno-123",
    source: "proxy",
    start_time: "2026-10-13T03:00:00Z",
    start_time_ms: 1791860400000,
    duration_ms: 2000,
    run_count: 2,
    tokens_total: 10,
    cost_total: 0.0001,
    status: "ok",
    user_id: "ana@x.com",
    runs: [],
    total_violations: 0,
  });
  getRuns.mockResolvedValue({ runs: [], total: 0, page: 1, page_size: 20, total_pages: 0 });

  render(<SessionDetailView sessionId="playground-abc" onNavigateToTab={() => {}} onBack={() => {}} />);

  await waitFor(() => expect(getRuns).toHaveBeenCalled());
  expect(getSession).toHaveBeenCalledWith("playground-abc");
  for (const [params] of getRuns.mock.calls) expect(params.session_id).toBe("interno-123");
});
