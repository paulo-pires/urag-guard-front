import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PlayCircle,
  MessageSquare,
  ListFilter,
  AlertTriangle,
  Settings,
  BarChart3,
  Cpu,
  ShieldCheck,
  KeyRound,
  Box,
  Activity,
  PlaySquare,
  Scale,
  Sparkles,
  BookOpen,
  FileText,
  Database,
  Sliders,
} from "lucide-react";
import { useViewMode } from "../context/ViewModeContext";
import {
  AccountLauncher,
  StackAdminPanel,
  StackSidebar,
  type SidebarNavItem,
} from "@urag/ui";
import { useAccountSession } from "../hooks/useAccountSession";
import { useStackAdmin } from "../hooks/useStackAdmin";
import { MODULE_CATALOG, ADDON_CATALOG, COMBOS } from "./accountCatalog";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  badgeCounts?: Record<string, number>;
  initialCollapsed?: boolean;
}

export function formatBadge(count: number | undefined): React.ReactNode | undefined {
  if (count === undefined || count === null || count <= 0) {
    return undefined;
  }
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      data-testid="sidebar-badge"
      aria-label={`${count} alertas`}
      className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium font-mono rounded-full bg-[#E8E6E3] text-[#1A1A1A] border border-[#D3D1CE]"
    >
      {display}
    </span>
  );
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  mobileOpen = false,
  onNavigate,
  badgeCounts,
  initialCollapsed = false,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [backendOnline, setBackendOnline] = useState(true);

  const session = useAccountSession();
  const admin = useStackAdmin();
  const [adminOpen, setAdminOpen] = useState(false);

  const handleOpenAdmin = async () => {
    await admin.load();
    setAdminOpen(true);
  };

  const handleLogout = async () => {
    // O cookie de sessao do identity e HttpOnly (handlers.go:759), entao
    // `document.cookie = ...` daqui NAO o apaga — JavaScript nao enxerga cookie
    // HttpOnly. Era exatamente o que esta funcao fazia: limpava o localStorage,
    // redirecionava, e a sessao continuava valida. A unica forma de zerar e o
    // servidor mandar Set-Cookie com MaxAge negativo, que e o que
    // POST /v1/auth/logout faz (handlers.go:627).
    try {
      await fetch("/api/identity/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Rede fora nao pode prender a pessoa na sessao: segue e limpa o local.
    }
    try {
      localStorage.removeItem("identity_session");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("guard_token");
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  useEffect(() => {
    fetch("/v1/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "online") setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  const { viewMode } = useViewMode();
  const getBadge = (id: string) => formatBadge(badgeCounts?.[id]);

  // ── Gestão mode: simplified, business-friendly grouping ───────────────────
  const navItemsGestao: SidebarNavItem[] = [
    { id: "dashboard", label: "Visão Geral", icon: Sparkles, badge: getBadge("dashboard") },
    { id: "usage", label: "Consumo e Custos", icon: Cpu, badge: getBadge("usage") },
    { id: "runs", label: "Atividade dos Agentes", icon: PlayCircle, badge: getBadge("runs") },
    { id: "sessions", label: "Conversas", icon: MessageSquare, badge: getBadge("sessions") },
    { id: "assurance", label: "Qualidade das Respostas", icon: Scale, badge: getBadge("assurance") },
    { id: "prompts", label: "Prompts", icon: FileText, badge: getBadge("prompts") },
    { id: "datasets", label: "Datasets & Diff", icon: Database, badge: getBadge("datasets") },
    { id: "guardrails-events", label: "Alertas de Comportamento", icon: AlertTriangle, badge: getBadge("guardrails-events") },
    { id: "projects", label: "Equipe e Acessos", icon: KeyRound, badge: getBadge("projects") },
    { id: "tenant-settings", label: "Configurações", icon: Settings, badge: getBadge("tenant-settings") },
    { id: "docs", label: "Documentação", icon: BookOpen, badge: getBadge("docs") },
  ];

  // ── Técnico mode: full technical structure ────────────────────────────────
  const navItemsTecnico: SidebarNavItem[] = [
    { id: "dashboard", label: "Monitoramento", icon: LayoutDashboard, badge: getBadge("dashboard") },
    { id: "runs", label: "Runs", icon: PlayCircle, badge: getBadge("runs") },
    { id: "sessions", label: "Sessions", icon: MessageSquare, badge: getBadge("sessions") },
    { id: "guardrails-rules", label: "Regras Guardrail", icon: ListFilter, badge: getBadge("guardrails-rules") },
    { id: "guardrails-events", label: "Eventos Guardrail", icon: AlertTriangle, badge: getBadge("guardrails-events") },
    { id: "evals-configs", label: "Configs Evals", icon: Settings, badge: getBadge("evals-configs") },
    { id: "evals-scores", label: "Scores Evals", icon: BarChart3, badge: getBadge("evals-scores") },
    { id: "models", label: "Modelos", icon: Box, badge: getBadge("models") },
    { id: "drift", label: "Drift", icon: Activity, badge: getBadge("drift") },
    { id: "simulation", label: "Simulação", icon: PlaySquare, badge: getBadge("simulation") },
    { id: "assurance", label: "Avaliação", icon: Scale, badge: getBadge("assurance") },
    { id: "prompts", label: "Prompts", icon: FileText, badge: getBadge("prompts") },
    { id: "datasets", label: "Datasets & Diff", icon: Database, badge: getBadge("datasets") },
    { id: "usage", label: "Consumo", icon: Cpu, badge: getBadge("usage") },
    { id: "projects", label: "Projetos & Keys", icon: KeyRound, badge: getBadge("projects") },
    { id: "tenant-settings", label: "Configurações", icon: Settings, badge: getBadge("tenant-settings") },
  ];

  const navItems = viewMode === "gestao" ? navItemsGestao : navItemsTecnico;

  const activeId =
    currentTab.startsWith("run-detail-")
      ? "runs"
      : currentTab.startsWith("session-detail-")
      ? "sessions"
      : currentTab;

  return (
    <>
      <StackSidebar
        navMode="tabs"
        items={navItems}
        activeId={activeId}
        onSelect={(item) => setCurrentTab(item.id)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={onNavigate}
        brand={{
          title: "uRag Guard",
          subtitle: "AI Safety & Guardrails",
          mark: (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a1a1a] text-white border border-[#1a1a1a] shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          ),
        }}
        aside={
          collapsed ? (
            <div
              className="flex justify-center py-1"
              title={`Backend: ${backendOnline ? "online" : "offline"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline ? "bg-emerald-600" : "bg-rose-600"
                }`}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between px-1 text-[11px] text-[#71706F]">
              <span className="font-serif italic text-[#1A1A1A]">uRag Guard</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendOnline ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                />
                {backendOnline ? "online" : "offline"}
              </span>
            </div>
          )
        }
        footer={
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => void handleOpenAdmin()}
              className={`w-full flex items-center ${
                collapsed ? "justify-center px-0" : "px-2.5 gap-3"
              } py-2 rounded-xl text-xs font-medium transition-colors text-[#575652] hover:bg-[#D3D1CE]/50 hover:text-[#1A1A1A] cursor-pointer border-none text-left`}
              title={collapsed ? "Administração da Stack" : undefined}
              aria-label="Administração da Stack"
            >
              <Sliders className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">Administração</span>}
            </button>
            <AccountLauncher
              session={session}
              showName={!collapsed}
              showChevron={!collapsed}
              onLogout={handleLogout}
              onBilling={() => void handleOpenAdmin()}
              showPlanBadge={true}
              placement="top-left"
              wrapperClassName="w-full"
            />
          </div>
        }
      />

      {adminOpen && admin.overview && (
        <StackAdminPanel
          open={adminOpen}
          overview={admin.overview}
          busy={admin.busy}
          error={admin.error}
          onClose={() => setAdminOpen(false)}
          moduleCatalog={MODULE_CATALOG}
          addonCatalog={ADDON_CATALOG}
          combos={COMBOS}
          onToggleModule={admin.handleToggleModule}
          onApplyCombo={admin.handleApplyCombo}
          onContractAddon={admin.handleContractAddon}
          onSelectPlan={admin.handleSelectPlan}
          onInviteMember={admin.handleInviteMember}
          onAssignRole={admin.handleAssignRole}
          onCreateRole={admin.handleCreateRole}
        />
      )}
    </>
  );
}
