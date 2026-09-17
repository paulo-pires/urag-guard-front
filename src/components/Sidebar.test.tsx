import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Sidebar from "./Sidebar";
import { ViewModeProvider } from "../context/ViewModeContext";

describe("Sidebar (urag-guard-front)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Default mock keeps health check pending to prevent unhandled background setState
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
  });

  function renderSidebar(
    props: Partial<React.ComponentProps<typeof Sidebar>> = {},
    mode: "gestao" | "tecnico" = "gestao"
  ) {
    localStorage.setItem("urag-guard:view-mode", mode);
    const defaultProps = {
      currentTab: "dashboard",
      setCurrentTab: vi.fn(),
      ...props,
    };
    return render(
      <ViewModeProvider>
        <Sidebar {...defaultProps} />
      </ViewModeProvider>
    );
  }

  it("renderiza exatamente 11 itens no modo gestao", () => {
    renderSidebar({}, "gestao");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(11);
    expect(screen.getByRole("tab", { name: /visão geral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /alertas de comportamento/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /atividade dos agentes/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /conversas/i })).toBeInTheDocument();
  });

  it("renderiza exatamente 16 itens no modo tecnico", () => {
    renderSidebar({}, "tecnico");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(16);
    expect(screen.getByRole("tab", { name: /^monitoramento/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^runs/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^sessions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /regras guardrail/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /eventos guardrail/i })).toBeInTheDocument();
  });

  it("navMode='tabs': contêiner possui role='tablist' e todos os itens de navegação são role='tab'", () => {
    renderSidebar({}, "gestao");
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute("aria-orientation", "vertical");

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThan(0);
    tabs.forEach((tab) => {
      expect(tab.tagName).toBe("BUTTON");
      expect(tab).toHaveAttribute("role", "tab");
    });
  });

  it("currentTab com prefixo 'run-detail-' acende a aba runs ('Atividade dos Agentes' em gestão)", () => {
    renderSidebar({ currentTab: "run-detail-abc-123" }, "gestao");
    const activeTab = screen.getByRole("tab", { name: /atividade dos agentes/i });
    expect(activeTab).toHaveAttribute("aria-selected", "true");

    const inactiveTab = screen.getByRole("tab", { name: /visão geral/i });
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });

  it("currentTab com prefixo 'run-detail-' acende a aba runs ('Runs' em técnico)", () => {
    renderSidebar({ currentTab: "run-detail-xyz-789" }, "tecnico");
    const activeTab = screen.getByRole("tab", { name: /^runs/i });
    expect(activeTab).toHaveAttribute("aria-selected", "true");

    const inactiveTab = screen.getByRole("tab", { name: /^monitoramento/i });
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });

  it("currentTab com prefixo 'session-detail-' acende a aba sessions ('Conversas' em gestão)", () => {
    renderSidebar({ currentTab: "session-detail-session-456" }, "gestao");
    const activeTab = screen.getByRole("tab", { name: /conversas/i });
    expect(activeTab).toHaveAttribute("aria-selected", "true");

    const inactiveTab = screen.getByRole("tab", { name: /visão geral/i });
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });

  it("currentTab com prefixo 'session-detail-' acende a aba sessions ('Sessions' em técnico)", () => {
    renderSidebar({ currentTab: "session-detail-session-456" }, "tecnico");
    const activeTab = screen.getByRole("tab", { name: /^sessions/i });
    expect(activeTab).toHaveAttribute("aria-selected", "true");

    const inactiveTab = screen.getByRole("tab", { name: /^monitoramento/i });
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });

  it("backendOnline aparece no aside como 'online' quando o backend responde status online", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "online" }),
    });
    renderSidebar({}, "gestao");
    await waitFor(() => {
      expect(screen.getByText("online")).toBeInTheDocument();
    });
    expect(screen.getAllByText("uRag Guard").length).toBeGreaterThanOrEqual(1);
  });

  it("backendOnline aparece no aside como 'offline' quando a verificação de saúde falha", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network failure"));
    renderSidebar({}, "gestao");
    await waitFor(() => {
      expect(screen.getByText("offline")).toBeInTheDocument();
    });
  });

  describe("T1 — Badge de contagem na navegação", () => {
    it("badge só aparece quando a contagem > 0 (modo gestão e técnico)", () => {
      // Gestão
      const { unmount } = renderSidebar({
        badgeCounts: { "guardrails-events": 7 },
      }, "gestao");
      const badgeGestao = screen.getByTestId("sidebar-badge");
      expect(badgeGestao).toBeInTheDocument();
      expect(badgeGestao).toHaveTextContent("7");
      unmount();

      // Técnico
      renderSidebar({
        badgeCounts: { "guardrails-events": 12 },
      }, "tecnico");
      const badgeTecnico = screen.getByTestId("sidebar-badge");
      expect(badgeTecnico).toBeInTheDocument();
      expect(badgeTecnico).toHaveTextContent("12");
    });

    it("badge NÃO aparece quando a contagem for 0 ou indefinida", () => {
      // Contagem zero
      const { unmount } = renderSidebar({
        badgeCounts: { "guardrails-events": 0 },
      }, "tecnico");
      expect(screen.queryByTestId("sidebar-badge")).not.toBeInTheDocument();
      unmount();

      // Sem badgeCounts
      renderSidebar({}, "tecnico");
      expect(screen.queryByTestId("sidebar-badge")).not.toBeInTheDocument();
    });

    it("aplica teto visual '99+' quando contagem for maior que 99", () => {
      renderSidebar({
        badgeCounts: { "guardrails-events": 142 },
      }, "tecnico");
      const badge = screen.getByTestId("sidebar-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("99+");
      expect(badge).toHaveAttribute("aria-label", "142 alertas");
    });

    it("no modo colapsado o badge não aparece e o rótulo acessível é preservado", () => {
      renderSidebar({
        badgeCounts: { "guardrails-events": 5 },
        initialCollapsed: true,
      }, "tecnico");

      // Badge não deve ser renderizado no modo colapsado
      expect(screen.queryByTestId("sidebar-badge")).not.toBeInTheDocument();

      // O rótulo acessível do item continua presente para leitores de tela
      const eventTab = screen.getByRole("tab", { name: /eventos guardrail/i });
      expect(eventTab).toBeInTheDocument();
      expect(eventTab).toHaveAttribute("title", "Eventos Guardrail");
    });

    it("nenhuma chamada HTTP nova é disparada pela sidebar ao receber ou exibir badges", () => {
      renderSidebar({
        badgeCounts: { "guardrails-events": 42 },
      }, "tecnico");

      const calls = (global.fetch as any).mock.calls;
      // Única chamada permitida da sidebar é /v1/health (já existente)
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain("/v1/health");
      // Nenhuma chamada nova para endpoints de eventos ou contagens
      expect(calls.some((c: any) => String(c[0]).includes("events"))).toBe(false);
    });
  });
});

